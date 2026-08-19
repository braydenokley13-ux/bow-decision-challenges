import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { apiHeaders, rateLimitAddress } from "../../../server/index";

/**
 * The two doors into the class service, answering the same questions the same way.
 *
 * There are two transports — a plain Node server for a self-hosted district, and a Vercel
 * function — and they used to hold two copies of the same two security decisions. An
 * engineering review counted both:
 *
 *  - **Two functions named `callerOf`**, one per file, answering "which address is the rate
 *    limiter counting" by *different rules*: the server honoured `BOW_TRUST_PROXY` and fell
 *    back to the socket, the function unconditionally trusted `x-real-ip` and then the
 *    rightmost forwarded entry, and neither imported the other. So the one control that decides
 *    whether a per-address limit can be turned off by a header did nothing at all on the
 *    serverless path.
 *  - **The CORS and security-header block, pasted into both.** The Vercel file's own comment
 *    recorded that they had already been bitten by that divergence once — "this path had none
 *    of them" — and the fix at the time was to copy the list rather than to share it.
 *
 * The comment above the class-code limiter says why this matters, and it is the same sentence
 * both times: *two copies of a security ceiling is how this one came to have a hole in it.*
 * They did that for `chargeCodeMiss` and not for these.
 */

const VERCEL = readFileSync(new URL("../../../api/[[...route]].ts", import.meta.url), "utf8");

describe("one address rule, two transports", () => {
  const chain = "1.1.1.1, 2.2.2.2, 3.3.3.3";

  it("gives the self-hosted server and the platform function the same answer for the same request", () => {
    // A district behind one reverse proxy, self-hosted; and the same request arriving at a
    // function, where the platform is that one proxy. `1.1.1.1` is whatever the caller typed.
    const selfHosted = rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9", hops: 1 });
    const serverless = rateLimitAddress({ forwarded: chain, hops: 1 });
    expect(selfHosted).toBe("3.3.3.3");
    expect(serverless).toBe("3.3.3.3");
  });

  it("still cannot be moved by anything a caller puts in the header", () => {
    // The attack, exactly: a vendor review rotated the value the caller controls through three
    // hundred wrong join-code guesses and had none of them blocked. What the caller controls is
    // whatever is already in the header when it reaches the first real proxy — that proxy then
    // appends, so everything a caller wrote is to the *left* of everything a proxy wrote. The
    // property is therefore not "never the leftmost entry": with three proxies honestly declared
    // the leftmost entry is the client and is the right answer. It is that **prepending cannot
    // change the answer**, at any honest hop count.
    for (const hops of [1, 2, 3]) {
      const honest = rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9", hops });
      const forged = rateLimitAddress({ forwarded: `9.9.9.9, 8.8.8.8, ${chain}`, socketAddress: "10.0.0.9", hops });
      expect(forged, `a caller prepending two entries moved the bucket at hops=${hops}`).toBe(honest);
    }
    // And with nothing in front of this process, the header is not read at all.
    expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9", hops: 0 })).toBe("10.0.0.9");
  });

  it("reads a platform header only from a transport that says it has one", () => {
    // `x-real-ip` is written by the platform rather than forwarded, so the function offers it.
    expect(rateLimitAddress({ platformAddress: "9.9.9.9", forwarded: chain, hops: 1 })).toBe("9.9.9.9");
    // The self-hosted server passes none, so the same header on the same request is ignored —
    // which is the whole reason it is a parameter rather than a lookup. A function that read
    // `x-real-ip` for itself would be a function trusting a caller on every self-hosted box.
    expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9" })).toBe("10.0.0.9");
  });

  it("honours BOW_TRUST_PROXY on the serverless path, which it previously could not", () => {
    // The platform is one proxy, so the function's own default is 1. An operator who puts a
    // second one in front says so, and now it takes effect on both doors rather than one.
    expect(rateLimitAddress({ forwarded: chain, hops: 2 })).toBe("2.2.2.2");
    expect(VERCEL).toMatch(/hops: Number\(process\.env\.BOW_TRUST_PROXY \?\? 1\)/);
  });

  it("falls back to something rather than to a header when the chain is shorter than claimed", () => {
    expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9", hops: 9 })).toBe("10.0.0.9");
    // No socket and nothing believable in the chain: one bucket for everybody is wrong, but it
    // is the honest answer and it is what the serverless path has always done.
    expect(rateLimitAddress({ forwarded: "", hops: 1 })).toBe("anonymous");
  });
});

describe("one header block, two transports", () => {
  it("sends the same eight headers from either door", () => {
    const headers = apiHeaders("http://127.0.0.1:4173");
    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://127.0.0.1:4173");
    // An origin nobody configured is not reflected back. This used to answer with whatever
    // asked, which made every state-changing route reachable from any page on the internet.
    expect(apiHeaders("https://not-this-school.example")["Access-Control-Allow-Origin"]).not.toBe("https://not-this-school.example");
  });

  it("leaves the serverless file with no copy of either decision", () => {
    // The test that catches the paste coming back. Both of these were literals in this file and
    // both are now imports; a header list or an address rule reappearing here is a second copy
    // free to drift, which is exactly what the review found.
    expect(VERCEL).not.toMatch(/Access-Control-Allow-Origin/);
    expect(VERCEL).not.toMatch(/X-Frame-Options/);
    expect(VERCEL).not.toMatch(/function callerOf/);
    expect(VERCEL).not.toMatch(/x-forwarded-for["']\)\)?\.split/);
    expect(VERCEL, "the shared functions are what it should be calling instead").toMatch(
      /import \{ apiHeaders, rateLimitAddress \} from "\.\.\/server\/index";/,
    );
  });
});
