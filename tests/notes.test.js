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
