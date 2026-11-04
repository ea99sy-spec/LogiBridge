import { test } from "node:test";
import assert from "node:assert/strict";
import { pageText, applyRuleWatch } from "../server/ruleWatch.js";

const URL1 = "https://example.test/rules";

test("page text ignores markup, scripts and spacing", () => {
  const html = "<html><script>var x=1</script><style>p{}</style><p>Gate&nbsp;open</p>\n<p> now </p></html>";
  assert.equal(pageText(html), "Gate open now");
});

test("first check sets a baseline, a later change is reported once", () => {
  const s = { users: [{ id: "a", role: "admin", name: "A" }], notifications: [], settings: {} };
  const sources = [URL1];
  const d = (n) => new Date(Date.UTC(2026, 10, n));
  assert.deepEqual(applyRuleWatch(s, { [URL1]: "<p>one</p>" }, d(5), sources), []);
  assert.equal(s.notifications.length, 0);
  // Same text, different markup: not a change.
  assert.deepEqual(applyRuleWatch(s, { [URL1]: "<div>one</div>" }, d(6), sources), []);
  assert.deepEqual(applyRuleWatch(s, { [URL1]: "<p>two</p>" }, d(7), sources), [URL1]);
  assert.ok(s.notifications.some((n) => n.event === "rules_source_changed" && n.userId === "a"));
  assert.equal(s.settings.ruleWatch.changes[0].url, URL1);
});

test("a failed download is not reported as a change", () => {
  const s = { users: [], notifications: [], settings: {} };
  const sources = [URL1];
  applyRuleWatch(s, { [URL1]: "<p>one</p>" }, new Date(), sources);
  assert.deepEqual(applyRuleWatch(s, {}, new Date(), sources), []);
  assert.deepEqual(applyRuleWatch(s, { [URL1]: "<p>one</p>" }, new Date(), sources), []);
});
