import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * What the Content-Security-Policy actually permits, checked rather than remembered.
 *
 * This file exists because a misreading of one directive cost the product its art for months.
 * The art doctrine said "inline SVG and CSS only — no bitmaps, no webfonts", and the reason it
 * gave was `connect-src 'self'`. That directive governs **connection mechanisms**: `fetch`,
 * `XMLHttpRequest`, WebSocket, EventSource, `sendBeacon`. It has never had anything to say about
 * `<img>`, `@font-face` or `<video>` — those are `img-src`, `font-src` and `media-src`. The
 * policy that shipped carried `img-src 'self' data:` and `font-src 'self'` the entire time, so
 * local raster art and locally bundled fonts were always allowed and nobody checked.
 *
 * The cost of that mistake was not a bug report. It was every world screen rendering as a dark
 * rectangle with text in it while the team believed security required it.
 *
 * So the directives are asserted here, one at a time, with the consequence spelled out beside
 * each — because the next person to reach for an image should find the answer in a test that
 * runs, not in a comment somebody wrote from memory. `e2e/assetPolicy.spec.ts` proves the same
 * facts in a real browser, which is the only place a policy is ever truly enforced.
 *
 * This is a gate as much as a proof: it fails just as loudly if somebody adds a CDN host.
 */

const HTML = readFileSync("index.html", "utf8");
const VERCEL = readFileSync("vercel.json", "utf8");

/** The policy as a directive → sources map, from whichever copy is being examined. */
function directives(policy: string): Map<string, readonly string[]> {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...sources] = part.split(/\s+/);
        return [name ?? "", sources] as const;
      }),
  );
}

function metaPolicy(): string {
  const found = /content="([^"]*default-src[^"]*)"/.exec(HTML);
  if (found?.[1] === undefined) throw new Error("no CSP meta element in index.html");
  return found[1];
}

function headerPolicy(): string {
  const config = JSON.parse(VERCEL) as {
    headers: readonly { headers: readonly { key: string; value: string }[] }[];
  };
  const header = config.headers
    .flatMap((entry) => entry.headers)
    .find((h) => h.key === "Content-Security-Policy");
  if (header === undefined) throw new Error("no CSP header in vercel.json");
  return header.value;
}

describe("the shipped policy is one policy", () => {
  it("says the same thing in the document and on the host, apart from a directive a meta element cannot carry", () => {
    // `frame-ancestors` is ignored in a meta element and the browser logs that it has, so it is
    // deliberately header-only. Any *other* difference means one of the two files was edited and
    // the other was forgotten, and the one that governs is whichever the deployment happens to
    // use — which is the sort of divergence nobody notices until an auditor does.
    const meta = directives(metaPolicy());
    const header = directives(headerPolicy());
    for (const [name, sources] of meta) {
      expect(header.get(name), `${name} differs between index.html and vercel.json`).toEqual(sources);
    }
    expect([...header.keys()].filter((name) => !meta.has(name))).toEqual(["frame-ancestors"]);
  });
});

describe("what the policy permits, and therefore what the product may ship", () => {
  const policy = directives(metaPolicy());

  it("img-src allows same-origin images, so raster and SVG art files are legal", () => {
    // The whole of the old ban, refuted by one line. PNG, WebP, AVIF and .svg served from our own
    // origin have always loaded; so have inline `data:` URIs.
    expect(policy.get("img-src")).toEqual(["'self'", "data:"]);
  });

  it("img-src does not allow blob:, which is the one real restriction on images", () => {
    // `URL.createObjectURL` cannot feed an `<img>` under this policy. Canvas `toDataURL` produces
    // a `data:` URI and is fine. Nothing planned needs blob:; if something ever does, that is an
    // argued amendment rather than a convenience, and this assertion is where the argument starts.
    expect(policy.get("img-src")).not.toContain("blob:");
  });

  it("font-src allows same-origin fonts, so locally bundled WOFF2 is legal", () => {
    expect(policy.get("font-src")).toEqual(["'self'"]);
  });

  it("font-src does not allow data:, so a font ships as a file and not as a base64 string", () => {
    // Worth knowing before somebody inlines a face into the stylesheet and finds it blocked in
    // production but working in a unit test. It also happens to be the better outcome: a font as
    // a real file is cacheable across routes, and a font as a data: URI is charged to every page
    // that loads the stylesheet.
    expect(policy.get("font-src")).not.toContain("data:");
  });

  it("media-src is unset and therefore falls back to default-src 'self'", () => {
    // Local audio and video are legal without touching the policy. Whether they are a good idea
    // is a performance question, not a security one.
    expect(policy.has("media-src")).toBe(false);
    expect(policy.get("default-src")).toEqual(["'self'"]);
  });

  it("connect-src governs connections only, and is not evidence about any of the above", () => {
    expect(policy.get("connect-src")).toEqual(["'self'"]);
  });
});

describe("nothing in the product may depend on somebody else's server", () => {
  it("no directive names a remote host", () => {
    // The rule that actually protects a classroom: a school with a captive portal, a dead uplink
    // or filtered DNS still gets the whole product. This is the assertion that fails the day
    // someone reaches for a font CDN.
    const remote: string[] = [];
    for (const [name, sources] of directives(metaPolicy())) {
      for (const source of sources) {
        if (/^https?:|^\/\/|\./.test(source) && source !== "'self'" && source !== "data:") {
          remote.push(`${name} ${source}`);
        }
      }
    }
    expect(remote, "a remote source in the CSP is a classroom that loses the product offline").toEqual([]);
  });

  it("the document requests nothing from a third party", () => {
    const external = [...HTML.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    expect(external).toEqual([]);
  });
});
