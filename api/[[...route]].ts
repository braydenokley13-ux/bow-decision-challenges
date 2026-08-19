import { handleApiRequest } from "../server/handler";
import { apiHeaders, rateLimitAddress } from "../server/index";
import { storeFromEnvironment } from "../server/store";

/**
 * The class service as a Vercel function.
 *
 * A catch-all so every `/api/*` route reaches the same handler the local Node server and
 * the test suite call. There is no logic here on purpose: the moment this file starts
 * making decisions, production stops being the thing the browser suite exercises.
 *
 * The store comes from the environment. Set `KV_REST_API_URL` and `KV_REST_API_TOKEN`
 * (Vercel KV or Upstash) before running a real class — without them this falls back to a
 * disk that serverless functions do not keep, and a class would vanish between requests.
 * `GET /api/health` reports which driver is actually in force, which is the first thing to
 * check after a deploy.
 */
const store = storeFromEnvironment();

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // The same headers the self-hosted server sends, from the same function rather than from a
  // second copy of the list. This path once had none of them, the fix was to paste the block
  // here, and this file's own comment recorded that as a divergence they had been bitten by —
  // which left two copies free to diverge again. `no-store` is the one that matters most here:
  // without it a shared classroom machine, or any cache between it and the platform, is free to
  // keep a response containing a class's names and a child's written explanation.
  const cors = apiHeaders(request.headers.get("origin") ?? undefined);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  let body: unknown;
  if (request.method !== "GET") {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      return Response.json({ error: "bad_request", message: "That request could not be read." }, { status: 400, headers: cors });
    }
  }

  try {
    const result = await handleApiRequest(
      {
        method: request.method,
        path: url.pathname.replace(/^\/api/, ""),
        query: url.search.replace(/^\?/, ""),
        headers: {
          "x-bow-teacher-key": request.headers.get("x-bow-teacher-key") ?? undefined,
          authorization: request.headers.get("authorization") ?? undefined,
        },
        // The rightmost entry, not the leftmost. `X-Forwarded-For` is a list a caller can
        // start and a proxy appends to, so the left-hand end is whatever the client typed —
        // reading it turned every per-address rate limit in the product off, which a vendor
        // review demonstrated with three hundred unblocked join-code guesses.
        //
        // The rule is `rateLimitAddress`, shared with the self-hosted server; what this file
        // adds is the two things only this transport can say. `x-real-ip` is written by the
        // platform rather than forwarded, so it is offered as `platformAddress` — a header the
        // shared function would be wrong to read for itself, because a self-hosted deployment
        // has no platform and would be trusting the caller. And a function is always behind the
        // platform's own proxy, so the hop count defaults to one here rather than to none;
        // `BOW_TRUST_PROXY` still overrides it, which on this path it previously could not.
        clientId: rateLimitAddress({
          platformAddress: request.headers.get("x-real-ip") ?? undefined,
          forwarded: request.headers.get("x-forwarded-for") ?? undefined,
          hops: Number(process.env.BOW_TRUST_PROXY ?? 1),
        }),
        ...(body !== undefined ? { body } : {}),
      },
      { store },
    );
    return Response.json(result.body, { status: result.status, headers: cors });
  } catch {
    // The store being unreachable is the realistic failure. The client retries a 503, so
    // it has to arrive as one rather than as a function timeout.
    return Response.json(
      { error: "unavailable", message: "The class service is not reachable right now." },
      { status: 503, headers: cors },
    );
  }
}
