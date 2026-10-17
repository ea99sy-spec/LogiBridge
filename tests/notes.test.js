import test from "node:test";
import assert from "node:assert/strict";
import { workspaceModules } from "../shared/workspaces.js";

test("admin notes section is for registered administrators only", () => {
  assert.ok(workspaceModules({ role: "admin", verified: true }).includes("notes"));
  assert.ok(!workspaceModules({ role: "admin", verified: true, demo: true }).includes("notes"));
  assert.ok(
    !workspaceModules({ role: "merchant", accountType: "merchant", verified: true }).includes("notes"),
  );
});

import { termsOutdated, TERMS_VERSION } from "../shared/legal.js";
test("accounts must accept the current terms version", () => {
  assert.equal(termsOutdated({ role: "merchant", termsVersion: TERMS_VERSION }), false);
  assert.equal(termsOutdated({ role: "merchant", termsVersion: "2026-01-01" }), true);
  assert.equal(termsOutdated({ role: "merchant" }), true);
  assert.equal(termsOutdated({ role: "admin" }), false);
  assert.equal(termsOutdated({ role: "carrier", demo: true }), false);
});
