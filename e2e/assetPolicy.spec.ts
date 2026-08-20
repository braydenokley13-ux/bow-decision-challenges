import { createServer, type Server } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { expect, test, type Page } from "@playwright/test";

/**
 * The Content-Security-Policy, enforced by a real browser rather than parsed by a test.
 *
 * `src/design/assetPolicy.test.ts` reads the policy and asserts what each directive says. That
 * is worth having and it is not the same as knowing what a browser does with it — a policy is
 * only ever true where it is enforced. This file stands up a server that sends the exact
 * production header, points Chromium at it, and watches `securitypolicyviolation`.
 *
 * It exists because the opposite claim was believed for months: that `connect-src 'self'` made
 * local images and fonts impossible, and therefore that every world had to be drawn out of
 * rectangles. Nobody had ever loaded an image to check.
 *
 * ## The control is the point
 *
 * Two of these tests assert that nothing is blocked, and on their own they prove nothing at all —
 * a policy that was never applied would pass both. So a third test loads an image from a remote
 * host and **requires** a violation. If that one stops failing, the two silent ones stop meaning
 * anything, and the suite says so.
 */

/** The policy from `vercel.json`, verbatim. If these drift, the unit gate fails first. */
const POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
  + "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
  + "form-action 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";

/** A 16×16 WebP, generated once through Chromium's own encoder. Real bytes, real format. */
const WEBP = Buffer.from(
  "UklGRm4CAABXRUJQVlA4WAoAAAAgAAAADwAADwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDgggAAAAJAEAJ0BKhAAEAAAwBIlsAJ0ugH4AfgBTgNgAuf/0AP4BvFf7gfAB///OACAAAD+4EK//HI3//HAkf//HZs/94H/cT4X58s/Ir3815Bb2yBYr/Zd4/crQqf9J9mD+GfsR2L/65+HDcPfrrBhXPrMKpJrPoTDA3R/das1TDxrjAAA",
  "base64",
);

/** Any font file on this machine. The directive does not care about the format, only the origin. */
const FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";

const PAGE = `<!doctype html><meta charset="utf-8"><title>policy</title><body></body>`;

let server: Server;
let origin: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader("Content-Security-Policy", POLICY);
    if (req.url === "/art.webp") {
      res.writeHead(200, { "Content-Type": "image/webp" }).end(WEBP);
      return;
    }
    if (req.url === "/face.ttf" && existsSync(FONT_PATH)) {
      res.writeHead(200, { "Content-Type": "font/ttf" }).end(readFileSync(FONT_PATH));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
});

/** Every directive a page tried to break, in the order the browser reported them. */
async function watchViolations(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.exposeFunction("__violation", (directive: string) => void seen.push(directive));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      void (window as unknown as { __violation: (d: string) => void }).__violation(
        event.violatedDirective,
      );
    });
  });
  return seen;
}

test("a same-origin WebP loads and paints under the production policy", async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto(origin);

  const painted = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/art.webp";
    await image.decode();
    document.body.append(image);
    return { width: image.naturalWidth, height: image.naturalHeight };
  });

  // Decoded, sized, and on the page. This is the fact the old doctrine denied.
  expect(painted).toEqual({ width: 16, height: 16 });
  expect(violations, `img-src 'self' blocked a same-origin image: ${violations.join(", ")}`).toEqual([]);
});

test("a same-origin font loads under the production policy", async ({ page }) => {
  test.skip(!existsSync(FONT_PATH), `no font on this machine at ${FONT_PATH}`);
  const violations = await watchViolations(page);
  await page.goto(origin);

  const loaded = await page.evaluate(async () => {
    const face = new FontFace("Policy Check", 'url("/face.ttf")');
    await face.load();
    document.fonts.add(face);
    return document.fonts.check('12px "Policy Check"');
  });

  expect(loaded).toBe(true);
  expect(violations, `font-src 'self' blocked a same-origin font: ${violations.join(", ")}`).toEqual([]);
});

test("the control: a remote image IS blocked, so the two silences above mean something", async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto(origin);

  // No request leaves this machine: the policy refuses before the fetch, which is also why this
  // test needs no network and cannot flake on one.
  await page.evaluate(() => {
    const image = new Image();
    image.src = "https://example.invalid/whatever.png";
    document.body.append(image);
  });
  await expect.poll(() => violations.length).toBeGreaterThan(0);
  expect(violations.join(" ")).toContain("img-src");
});

test("the other control: a data: font IS blocked, which is why fonts ship as files", async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto(origin);

  await page.evaluate(async () => {
    const face = new FontFace("Inline Check", "url(data:font/woff2;base64,d09GMgABAAAAAAAQ)");
    await face.load().catch(() => undefined);
  });
  await expect.poll(() => violations.length).toBeGreaterThan(0);
  expect(violations.join(" ")).toContain("font-src");
});
