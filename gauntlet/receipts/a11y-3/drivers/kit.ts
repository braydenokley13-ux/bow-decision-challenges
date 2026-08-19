import { type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

export const OUT = "/home/user/bow-decision-challenges/gauntlet/receipts/a11y-3";

export function save(rel: string, body: string) {
  const path = `${OUT}/${rel}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
  return path;
}
export function log(rel: string, line: string) {
  const path = `${OUT}/${rel}`;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, line + "\n", "utf8");
}

/** A one-line description of document.activeElement, the way a person would read it. */
export async function active(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "BODY (nothing focused)";
    const name =
      el.getAttribute("aria-label") ||
      (el.getAttribute("aria-labelledby") &&
        (document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent ?? "").trim()) ||
      (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
      (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70);
    const tag = el.tagName.toLowerCase();
    const type = tag === "input" ? `[type=${(el as HTMLInputElement).type}]` : "";
    const role = `${tag}${type}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""}`;
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}` : "";
    const rect = el.getBoundingClientRect();
    const vis = rect.width > 0 && rect.height > 0 ? "" : " [ZERO-SIZE]";
    return `${role}${id}${cls} "${name}"${vis}`;
  });
}

/** Presses Tab n times, recording where focus lands each time. */
export async function tabWalk(page: Page, steps = 60, key: "Tab" | "Shift+Tab" = "Tab"): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press(key);
    seen.push(await active(page));
  }
  return seen;
}

/** The whole tab ring from BODY: presses Tab until it returns to the first stop or hits the cap. */
export async function tabRing(page: Page, cap = 120): Promise<{ ring: string[]; closed: boolean }> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const ring: string[] = [];
  let first = "";
  for (let i = 0; i < cap; i += 1) {
    await page.keyboard.press("Tab");
    const here = await active(page);
    if (i === 0) first = here;
    else if (here === first && ring.length > 1) return { ring, closed: true };
    ring.push(here);
  }
  return { ring, closed: false };
}

/** Press Enter on whatever is focused, keyboard only. */
export async function enter(page: Page) {
  await page.keyboard.press("Enter");
}

/** Tab until the accessible name matches, then return how many presses it took. -1 if never. */
export async function tabTo(page: Page, match: RegExp, cap = 80): Promise<number> {
  for (let i = 1; i <= cap; i += 1) {
    await page.keyboard.press("Tab");
    const here = await active(page);
    if (match.test(here)) return i;
  }
  return -1;
}

export async function axe(page: Page, name: string, rel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const lines = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 260), summary: (n.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 400) })),
  }));
  log(rel, JSON.stringify({ screen: name, url: page.url(), violations: lines }, null, 2));
  return lines;
}

/** The full accessibility tree, flattened — straight out of Chromium via CDP. */
export async function axTree(page: Page): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as any;
  await cdp.detach();
  const byId = new Map<string, any>();
  for (const n of nodes) byId.set(n.nodeId, n);
  const root = nodes[0];
  const out: string[] = [];
  const walk = (node: any, depth: number) => {
    if (!node) return;
    const role = node.role?.value ?? "";
    const name = node.name?.value ?? "";
    const ignored = node.ignored === true;
    const props = (node.properties ?? [])
      .filter((p: any) => ["level", "checked", "disabled", "expanded", "required", "invalid", "describedby", "live", "modal", "pressed", "valuenow", "valuetext", "focusable", "focused", "hidden", "hiddenRoot"].includes(p.name))
      .map((p: any) => `${p.name}=${JSON.stringify(p.value?.value ?? p.value)}`)
      .join(" ");
    const desc = node.description?.value ? ` desc="${node.description.value}"` : "";
    if (!ignored && role && role !== "generic" && role !== "none" && role !== "InlineTextBox" && role !== "StaticText") {
      out.push(`${"  ".repeat(Math.min(depth, 12))}${role}${name ? ` "${name.replace(/\s+/g, " ").slice(0, 90)}"` : ""}${desc}${props ? ` [${props}]` : ""}`);
    }
    for (const id of node.childIds ?? []) walk(byId.get(id), ignored || role === "generic" || role === "none" ? depth : depth + 1);
  };
  walk(root, 0);
  return out.join("\n");
}

/** Headings and landmarks in document order — what a screen reader's rotor shows. */
export async function outline(page: Page): Promise<string> {
  return page.evaluate(() => {
    const rows: string[] = [];
    const marks = document.querySelectorAll("main, nav, header, footer, aside, section[aria-label], section[aria-labelledby], [role=main], [role=navigation], [role=banner], [role=contentinfo], [role=complementary], [role=region], [role=search], [role=form], h1,h2,h3,h4,h5,h6,[role=heading]");
    marks.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      const label = el.getAttribute("aria-label") ?? (el.getAttribute("aria-labelledby") ? (document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent ?? "").trim() : "");
      if (/^h[1-6]$/.test(tag) || role === "heading") {
        rows.push(`H${el.getAttribute("aria-level") ?? tag.slice(1)}  ${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 90)}`);
      } else {
        rows.push(`LANDMARK <${tag}${role ? ` role=${role}` : ""}>${label ? ` "${label}"` : " (unlabelled)"}`);
      }
    });
    return rows.join("\n");
  });
}

/** Every live region on the page and what it currently says. */
export async function liveRegions(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[aria-live], [role=status], [role=alert], [role=log], output"));
    return nodes
      .map((el) => {
        const politeness = el.getAttribute("aria-live") ?? (el.getAttribute("role") === "alert" ? "assertive (role=alert)" : "polite (role=status)");
        const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
        const styles = getComputedStyle(el as Element);
        const hidden = styles.display === "none" || styles.visibility === "hidden";
        return `[${politeness}]${hidden ? " (display:none — will not announce)" : ""} ${text || "(empty)"}`;
      })
      .join("\n");
  });
}

/** Watches the announcement stream: any mutation inside a live region, timestamped. */
export async function startAnnouncementRecorder(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__bowAnnouncements) return;
    w.__bowAnnouncements = [] as string[];
    const isLive = (el: Element | null): Element | null => {
      let n: Element | null = el;
      while (n) {
        const role = n.getAttribute?.("role");
        if (n.hasAttribute?.("aria-live") || role === "status" || role === "alert" || role === "log") return n;
        n = n.parentElement;
      }
      return null;
    };
    const record = (host: Element) => {
      const politeness = host.getAttribute("aria-live") ?? (host.getAttribute("role") === "alert" ? "assertive" : "polite");
      const text = (host.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!text) return;
      const last = w.__bowAnnouncements[w.__bowAnnouncements.length - 1];
      const line = `[${politeness}] ${text.slice(0, 200)}`;
      if (line !== last) w.__bowAnnouncements.push(line);
    };
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        const host = isLive(r.target as Element) ?? (r.target as Element);
        const live = isLive(host);
        if (live) record(live);
        for (const added of Array.from(r.addedNodes)) {
          if (added.nodeType !== 1) continue;
          const el = added as Element;
          const own = isLive(el);
          if (own) record(own);
          el.querySelectorAll?.("[aria-live], [role=status], [role=alert], [role=log]").forEach((x) => record(x));
        }
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-live"] });
    document.querySelectorAll("[aria-live], [role=status], [role=alert], [role=log]").forEach((x) => record(x));
  });
}

export async function announcements(page: Page): Promise<string[]> {
  return page.evaluate(() => ((window as any).__bowAnnouncements ?? []) as string[]);
}
