import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleApiRequest, type ApiRequest } from "./handler";
import { storeFromEnvironment, type ClassStore } from "./store";

/**
 * A plain Node server for the class API.
 *
 * This is what runs the API in development, in the browser suite, and on any host a
 * district would rather run themselves than hand to a serverless platform. It is a thin
 * shell: everything it does past reading the request is `handleApiRequest`, which is the
 * same function the Vercel handler calls.
 */

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

      // The student app and the API are served from the same origin in production; the
      // dev server proxies. CORS stays permissive for methods and headers this API
      // actually uses and nothing else.
      const cors = {
        "Access-Control-Allow-Origin": request.headers.origin ?? "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-BOW-Teacher-Key",
      };
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
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value[0] : value]),
        ),
        ...(body !== undefined ? { body } : {}),
      };

      try {
        const result = await handleApiRequest(apiRequest, { store });
        response.writeHead(result.status, { ...cors, "Content-Type": "application/json" });
        response.end(JSON.stringify(result.body));
      } catch (error) {
        // An unreachable store is the realistic failure here, and the client has a retry
        // path for it — so it has to arrive as a clean, named error rather than a hang.
        response.writeHead(503, { ...cors, "Content-Type": "application/json" });
        response.end(JSON.stringify({
          error: "unavailable",
          message: "The class service is not reachable right now.",
          detail: error instanceof Error ? error.message : undefined,
        }));
      }
    })();
  });
}

const isEntryPoint = process.argv[1]?.includes("server/index");
if (isEntryPoint) {
  const port = Number(process.env.BOW_API_PORT ?? 4180);
  const store = storeFromEnvironment();
  createApiServer(store).listen(port, () => {
    process.stdout.write(`BOW class service on :${port} (${store.id} store)\n`);
  });
}
