import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleApiRequest, type ApiRequest } from "./handler";
import { startRetentionSweep } from "./retention";
import { storeFromEnvironment, type ClassStore } from "./store";

/**
 * A plain Node server for the class API.
 *
 * This is what runs the API in development, in the browser suite, and on any host a
 * district would rather run themselves than hand to a serverless platform. It is a thin
 * shell: everything it does past reading the request is `handleApiRequest`, which is the
 * same function the Vercel handler calls.
 */

/**
 * Which origins may talk to this service.
 *
 * It used to reflect whatever origin asked, which made every state-changing route reachable
 * from any page on the internet — and because the handler parses a body regardless of its
 * content type, a `text/plain` POST skips the preflight that would otherwise have stopped it.
 * Set `BOW_ALLOWED_ORIGIN` (comma-separated) in a deployment; local development answers the
 * two ports this repository runs on and nothing else.
 */
const DEFAULT_ORIGINS = ["http://127.0.0.1:4173", "http://localhost:4173", "http://127.0.0.1:4180", "http://localhost:4180"];

export function allowedOrigin(origin: string | undefined): string {
  const configured = (process.env.BOW_ALLOWED_ORIGIN ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const allowed = configured.length > 0 ? configured : DEFAULT_ORIGINS;
  if (allowed.includes("*")) return "*";
  return origin && allowed.includes(origin) ? origin : (allowed[0] ?? "null");
}

/**
 * Every header this API answers with, written once for both doors.
 *
 * The student app and the API are served from the same origin in production; the dev server
 * proxies. CORS stays permissive for the methods and headers this API actually uses and
 * nothing else.
 *
 * The rest is defence in depth on an API that only ever answers JSON. React's escaping is what
 * actually stops the stored names a reviewer planted from executing; these are what stop the
 * next mistake. `nosniff` because a JSON body containing markup must never be rendered as one,
 * `DENY` because nothing here belongs in a frame, `no-store` because a shared classroom
 * machine's disk cache is not a place for a child's evidence, and `same-origin` so a teacher
 * key in a query string does not travel in a Referer.
 *
 * **It is one function because it has already diverged once.** These four were on the
 * self-hosted server for a while and the serverless path had none of them — the Vercel file's
 * own comment records it — and the fix at the time was to copy the block rather than to share
 * it, which leaves the same two copies to drift again. An engineering review counted this as
 * one of three duplications in the security layer, beside the two copies of the rate limiter's
 * address rule. The class-code limiter's comment says why: two copies of a security ceiling is
 * how that one came to have a hole in it.
 */
export function apiHeaders(origin: string | undefined): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-BOW-Teacher-Key",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store",
  };
}

/** Bodies are one evidence log. Anything larger than this is not a student. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("payload too large");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApiServer(store: ClassStore = storeFromEnvironment()) {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (!url.pathname.startsWith("/api/")) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "bad_request", message: "No such endpoint." }));
        return;
      }

      const cors = apiHeaders(request.headers.origin);
      if (request.method === "OPTIONS") {
        response.writeHead(204, cors);
        response.end();
        return;
      }

      let body: unknown;
      try {
        body = await readBody(request);
      } catch {
        response.writeHead(400, { ...cors, "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "bad_request", message: "That request could not be read." }));
        return;
      }

      const apiRequest: ApiRequest = {
        method: request.method ?? "GET",
        path: url.pathname.slice("/api".length),
        query: url.search.replace(/^\?/, ""),
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value[0] : value]),
        ),
        // No `platformAddress`: a self-hosted deployment has no platform, so a header naming an
        // address is a header a caller can write. The socket is what this process can see.
        clientId: rateLimitAddress({
          forwarded: request.headers["x-forwarded-for"],
          ...(request.socket.remoteAddress ? { socketAddress: request.socket.remoteAddress } : {}),
        }),
        ...(body !== undefined ? { body } : {}),
      };

      try {
        const result = await handleApiRequest(apiRequest, { store });
        response.writeHead(result.status, { ...cors, "Content-Type": "application/json" });
        response.end(JSON.stringify(result.body));
      } catch (error) {
        // An unreachable store is the realistic failure here, and the client has a retry
        // path for it — so it has to arrive as a clean, named error rather than a hang.
        //
        // The exception's own text used to be in the body as `detail`. It is written by
        // whatever threw, which includes the store drivers, and a message written for a
        // developer reads out whatever it happened to be holding: a path inside the data
        // directory, a class code, the shape of a record. An unauthenticated caller could
        // read it by sending something malformed enough to throw. A vendor reviewer flagged
        // it, and they were right to — the person who needs that string is the operator, and
        // the operator has the log.
        console.error("[bow] request failed", {
          method: request.method,
          path: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        });
        response.writeHead(503, { ...cors, "Content-Type": "application/json" });
        response.end(JSON.stringify({
          error: "unavailable",
          message: "The class service is not reachable right now.",
        }));
      }
    })();
  });
}

/**
 * Where this server is willing to listen.
 *
 * `node:http` is cleartext. On a managed host TLS is terminated at the edge and this only ever
 * hears from that edge; self-hosted, binding a public interface without a terminator in front
 * means children's names and their written work crossing a school network in the clear, which
 * is the same obligation the at-rest key exists for — §2-d asks for encryption in motion as
 * well as in custody. So the default is loopback, and opening it wider is an explicit
 * statement that something else is terminating TLS.
 */
/**
 * Who the rate limiter is counting. Never stored, never logged, and now written once.
 *
 * `X-Forwarded-For` is a list a client can start. A proxy appends the address it saw to the
 * right-hand end, so the rightmost entry is the one written by the hop nearest this process
 * and every entry further left was written by somebody further away — including, at the far
 * left, whatever the caller invented. Reading `[0]` therefore read the attacker's own string:
 * a vendor review made three hundred wrong join-code guesses with a rotating first entry and
 * had none of them blocked, which turns every per-address limit in the product off.
 *
 * So `BOW_TRUST_PROXY` is a count of the proxies actually in front of this process, and the
 * address is taken that many places in from the right. `1` — the value the old flag used —
 * still means the single proxy case and now means it correctly. Unset means there is no proxy
 * and the socket is the truth.
 *
 * **Both doors call this.** There used to be a second copy in `api/[[...route]].ts`, under the
 * same name, answering the same question by a different rule: it trusted `x-real-ip`
 * unconditionally and then took the rightmost forwarded entry, and it never read
 * `BOW_TRUST_PROXY` at all — so the one control that decides whether a per-address limit can
 * be turned off by a header did nothing on the serverless path, and neither file imported the
 * other. An engineering review counted three functions named `callerOf` in this codebase and
 * observed that the class-code limiter's own comment already says why that is a mistake: two
 * copies of a security ceiling is how that one came to have a hole in it.
 *
 * The transports differ in what they can honestly claim, and that is an argument rather than a
 * second rule. The plain server has a socket and no idea what is in front of it, so it says
 * nothing and defaults to no proxy. A serverless function is always behind the platform's own
 * proxy and has no socket at all, so it says `hops: 1` and offers the header the platform
 * writes rather than forwards — which is why `platformAddress` is a parameter and not a lookup:
 * a header this function read for itself would be a header a self-hosted deployment trusted
 * from a caller.
 *
 * The name is `rateLimitAddress` and not `callerOf` because `callerOf` in `server/identity.ts`
 * answers a completely different question — which *account* is behind this bearer token — and
 * is called twenty times. Two names for two questions.
 */
export function rateLimitAddress(input: {
  /** The `X-Forwarded-For` chain, exactly as it arrived. */
  forwarded?: string | string[] | undefined;
  /** A header the platform itself writes. Only passed by a transport that is behind one. */
  platformAddress?: string | undefined;
  /** The socket, where the transport has one. */
  socketAddress?: string | undefined;
  /** How many proxies are in front. Omitted means "read `BOW_TRUST_PROXY`, and none if unset". */
  hops?: number;
}): string {
  const hops = input.hops ?? Number(process.env.BOW_TRUST_PROXY ?? 0);
  const socket = input.socketAddress || "anonymous";
  if (!Number.isInteger(hops) || hops < 1) return socket;
  const platform = input.platformAddress?.trim();
  if (platform) return platform;
  const chain = String(Array.isArray(input.forwarded) ? input.forwarded[0] : input.forwarded ?? "")
    .split(",").map((entry) => entry.trim()).filter(Boolean);
  return chain[chain.length - hops] ?? socket;
}

export function bindHost(env: Record<string, string | undefined> = process.env): string {
  return env.BOW_BIND_HOST ?? "127.0.0.1";
}

const isEntryPoint = process.argv[1]?.includes("server/index");
if (isEntryPoint) {
  const port = Number(process.env.BOW_API_PORT ?? 4180);
  const store = storeFromEnvironment();
  // The retention promise, running. Hourly, unref'd, and it starts with the process rather
  // than waiting for the first request — a server that is up for a term and never asked a
  // question would otherwise keep a term of expired classes.
  if (store.id !== "unconfigured") startRetentionSweep(store);
  const host = bindHost();
  createApiServer(store).listen(port, host, () => {
    process.stdout.write(`BOW class service on ${host}:${port} (${store.id} store)\n`);
    if (host !== "127.0.0.1" && host !== "localhost") {
      process.stdout.write("This is plain HTTP. Put a TLS terminator in front of it before any class uses it.\n");
    }
  });
}
