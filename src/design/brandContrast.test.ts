import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Ink on a brand fill clears AA, on every ground the brand has.
 *
 * `RULING.md` claimed "AA on every ink/surface pair including sunken and inset". No test ever
 * checked it. What shipped was `.button--primary { color: var(--ink-invert); background:
 * var(--bow-brand) }` — near-black on violet-500 at **3.81:1**, on the front door, the first
 * screen anybody sees. A browser accessibility scan found it; the palette never did, because
 * nothing was reading the palette.
 *
 * The bug is worth naming precisely, because it is a shape that recurs. `--ink-invert` means
 * *the ink that sits on `--ink-1`* — white on the light ground, near-black on the dark one.
 * `--bow-brand` is a saturated violet on both. On the dark ground the brand was lifted for
 * legibility (violet-600 → violet-500) at the same moment the "invert" ink went dark, so the
 * two moved toward each other and met below AA. Neither change was wrong on its own and
 * nothing connected them.
 *
 * And the ramp does not resolve it in one direction, which is why one token cannot serve:
 *
 *     violet-500  white 4.73  near-black 3.82   → needs white
 *     violet-400  white 3.27  near-black 5.52   → needs near-black
 *
 * `--bow-brand-strong` on the dark ground is violet-400, so it takes the opposite ink from
 * `--bow-brand` sitting right beside it. Inside the market the brand is repointed at lantern
 * amber, where white is 2.00:1 and near-black is 9.00:1 — opposite again.
 *
 * So each brand ground declares its own ink, and this file checks every pair. It reads the
 * stylesheets rather than a copy of the numbers, so a repointed token is caught the moment it
 * is repointed.
 */

const RAMP = readFileSync("src/design/tokens.css", "utf8");
const BRAND = readFileSync("src/design/brand.css", "utf8");
const WORLDS = readFileSync("src/design/worlds.css", "utf8");

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((at) => {
    const raw = Number.parseInt(value.slice(at, at + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Every `--name: value` in one selector's block. */
function block(css: string, selector: string): Map<string, string> {
  const at = css.indexOf(`${selector} {`);
  if (at === -1) throw new Error(`no ${selector} block`);
  const body = css.slice(at, css.indexOf("\n}", at));
  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]));
}

const PALETTE = block(RAMP, ":root");

/**
 * The light ground's declarations, which every other ground inherits from.
 *
 * Declared beside `PALETTE` rather than at the foot of the file: `describe` bodies run at
 * collection time, so a `const` below them is still in its temporal dead zone when they read it
 * and every pair fails with "not a hex colour:" and an empty value. The test was reporting a
 * defect in itself and reading exactly like a defect in the palette.
 */
const BRAND_ROOT = block(BRAND, ":root");

/** Resolve a token value to a hex colour, following one `var()` hop into the ramp or the block. */
function hex(value: string, scope: Map<string, string>): string {
  const seen = new Set<string>();
  let current = value;
  while (current.startsWith("var(")) {
    const name = current.slice(4, current.indexOf(")")).trim();
    if (seen.has(name)) throw new Error(`cycle at ${name}`);
    seen.add(name);
    const next = scope.get(name) ?? PALETTE.get(name);
    if (next === undefined) throw new Error(`cannot resolve ${name}`);
    current = next.trim();
  }
  if (!/^#[0-9a-f]{6}$/i.test(current)) throw new Error(`not a hex colour: ${current}`);
  return current;
}

/**
 * The grounds a brand fill can land on. Each names the file and selector that defines it, so a
 * new ground is added here or its pairs go unchecked — and an added ground with no entry is a
 * missing test rather than a passing one.
 */
const GROUNDS = [
  { name: "light ground", css: BRAND, selector: ":root" },
  { name: "dark ground", css: BRAND, selector: ".ground-dark" },
  { name: "the market", css: WORLDS, selector: '[data-world="food-truck"]' },
] as const;

/** Which ink belongs on which fill. Getting this pairing wrong is the whole defect. */
const PAIRS = [
  { fill: "--bow-brand-fill", ink: "--bow-brand-ink" },
  { fill: "--bow-brand-fill", ink: "--bow-brand-ink-muted" },
  { fill: "--bow-brand-strong", ink: "--bow-brand-strong-ink" },
] as const;

describe("ink on a brand fill clears AA", () => {
  it("reads a real palette, so an empty sweep cannot pass", () => {
    expect(PALETTE.get("--violet-600")).toBe("#6733e8");
    expect(GROUNDS.length).toBeGreaterThan(2);
  });

  for (const ground of GROUNDS) {
    describe(ground.name, () => {
      // Resolved once per ground, with the ground's own declarations shadowing the ramp — which
      // is what the cascade does and what makes the market's amber brand a different question
      // from the same component on a violet one.
      const scope = block(ground.css, ground.selector);

      for (const pair of PAIRS) {
        const declared = scope.get(pair.fill) !== undefined || scope.get(pair.ink) !== undefined;
        // A ground that overrides neither half of a pair inherits a pair checked above it.
        const test = declared ? it : it.skip;
        test(`${pair.ink} on ${pair.fill}`, () => {
          const fill = hex(scope.get(pair.fill) ?? BRAND_ROOT.get(pair.fill) ?? "", scope);
          const ink = hex(scope.get(pair.ink) ?? BRAND_ROOT.get(pair.ink) ?? "", scope);
          const ratio = contrast(ink, fill);
          expect(
            Number(ratio.toFixed(2)),
            `\n${ground.name}: ${pair.ink} (${ink}) on ${pair.fill} (${fill}) is ${ratio.toFixed(2)}:1.`
              + `\nA brand fill needs its own ink — the ramp does not resolve in one direction, so`
              + `\nthe answer flips between grounds. Pick the ink that passes on THIS fill.\n`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});

