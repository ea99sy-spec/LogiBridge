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

import { checklist, missingFor } from "../shared/documents.js";
test("required documents are only what the companies requested", () => {
  const base = { type: "shipment", ownerId: "o", docs: [] };
  assert.equal(checklist(base).length, 0);
  const requests = [
    { id: "r1", kind: "customs", from: "o", requestedBy: "b", status: "open" },
    { id: "r2", kind: "other", title: "Letter", from: "o", requestedBy: "c", status: "cancelled" },
  ];
  const items = checklist({ ...base, requests });
  assert.equal(items.length, 1);
  assert.equal(missingFor(items, "o").length, 1);
  const done = checklist({ ...base, requests, docs: [{ id: "d", kind: "customs", requestId: "r1" }] });
  assert.equal(missingFor(done, "o").length, 0);
});

import { trackingWatch, recordPosition } from "../server/tracking.js";
test("arrival at the delivery point closes the stage after the waiting time", () => {
  const now = Date.now();
  const s = {
    users: [],
    shipments: [
      {
        id: "x",
        ownerId: "o",
        carrierId: "c",
        status: "transit",
        title: "T",
        destinationPoint: { lat: 36.2, lng: 37.16 },
      },
    ],
    escrows: [{ shipmentId: "x", status: "held", simulated: true }],
    trackingEvents: [],
    notifications: [],
    emailOutbox: [],
  };
  recordPosition(s, s.shipments[0], { lat: 36.205, lng: 37.16 }, new Date(now).toISOString(), "c", "test");
  assert.equal(s.shipments[0].status, "arrived");
  trackingWatch(s, now + 3600000);
  assert.equal(s.shipments[0].status, "arrived");
  trackingWatch(s, now + 25 * 3600000);
  assert.equal(s.shipments[0].status, "delivered");
  assert.equal(s.escrows[0].status, "released");
});

import { checkGoods, prohibitedRules, DEFAULT_PROHIBITED } from "../shared/prohibited.js";
test("prohibited goods are detected by HS code and words", () => {
  const rules = prohibitedRules({});
  assert.deepEqual(rules, DEFAULT_PROHIBITED);
  assert.deepEqual(checkGoods({ hsCode: "930190", title: "Parts", description: "" }, rules), ["HS 93"]);
  assert.ok(checkGoods({ hsCode: "520100", title: "شحنة أسلحة صيد", description: "" }, rules).length);
  assert.ok(
    checkGoods({ hsCode: "520100", title: "Cotton", description: "contains Captagon" }, rules).length,
  );
  assert.deepEqual(
    checkGoods({ hsCode: "520100", title: "قطن خام", description: "Raw cotton bales" }, rules),
    [],
  );
  const custom = prohibitedRules({ prohibited: { hs: ["2402"], words: ["tobacco"] } });
  assert.ok(checkGoods({ hsCode: "240220", title: "", description: "" }, custom).length);
  assert.deepEqual(checkGoods({ hsCode: "930190", title: "", description: "" }, custom), []);
});
