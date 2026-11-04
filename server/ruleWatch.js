// Watches the official and news pages behind the border and customs rules.
// When a page changes, every administrator gets a notification and an email to read it.
// Nothing is published automatically: a legal change is only shown to members after an
// administrator reads the source and posts a border notice.
import { createHash } from "node:crypto";
import { readState, mutate } from "./store.js";
import { notice } from "./advanced.js";
import { queueAdminEmail } from "./email.js";
import { crossingSources } from "../shared/borderSources.js";

const DAY = 86400000;

// Visible text only, so layout, scripts and styles do not count as a change.
export function pageText(html) {
  return String(html || "")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const digest = (text) => createHash("sha256").update(text).digest("hex");

// Records the hash of each page. The first time a page is seen it only sets a baseline.
// A failed download keeps the previous hash, so it is not reported as a change.
export function applyRuleWatch(s, pages, now = new Date(), sources = crossingSources) {
  s.settings ||= {};
  const watch = (s.settings.ruleWatch ||= { hashes: {}, changes: [] });
  watch.hashes ||= {};
  watch.changes ||= [];
  const changed = [];
  for (const url of sources) {
    if (typeof pages[url] !== "string") continue;
    const hash = digest(pageText(pages[url]));
    const before = watch.hashes[url];
    watch.hashes[url] = hash;
    if (before && before !== hash) changed.push(url);
  }
  watch.checkedAt = now.toISOString();
  for (const url of changed) {
    watch.changes = [{ url, at: now.toISOString() }, ...watch.changes].slice(0, 30);
    for (const a of s.users || []) {
      if (a.role === "admin" && !a.demo) notice(s, a.id, "rules_source_changed", undefined, url);
    }
    queueAdminEmail(
      s,
      "rules_source_changed",
      { source: url },
      `rules/${url}/${now.toISOString().slice(0, 10)}`,
    );
  }
  return changed;
}

async function fetchPage(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "LogiBridge-rule-watch/1.0" },
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
}

// Called from the scheduled function. Checks at most once a day, and downloads outside the store lock.
export async function runRuleWatch(now = new Date()) {
  const last = readState().settings?.ruleWatch?.checkedAt;
  if (last && now - Date.parse(last) < DAY) return false;
  const pages = {};
  for (const url of crossingSources) {
    try {
      pages[url] = await fetchPage(url);
    } catch {
      // Unreachable page: skipped this round.
    }
  }
  await mutate((s) => applyRuleWatch(s, pages, now));
  return true;
}
