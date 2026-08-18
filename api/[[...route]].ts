import { handleApiRequest } from "../server/handler";
import { allowedOrigin } from "../server/index";
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
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin(request.headers.get("origin") ?? undefined),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-BOW-Teacher-Key",
    "Vary": "Origin",
  };
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
        clientId: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous",
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
