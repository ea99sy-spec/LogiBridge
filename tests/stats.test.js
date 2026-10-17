import test from "node:test";
import assert from "node:assert/strict";
import { publicStats } from "../server/stats.js";

test("public stats count only real data and whole orders", () => {
  const s = {
    users: [
      { id: "a", role: "admin", verified: true },
      { id: "m", role: "merchant", accountType: "merchant", verified: true },
      { id: "c", role: "carrier", accountType: "carrier", verified: true },
      { id: "p", role: "merchant", accountType: "individual", verified: true },
      { id: "x", role: "carrier", accountType: "carrier", verified: false },
      { id: "d", role: "carrier", accountType: "carrier", verified: true, demo: true },
    ],
    shipments: [
      { id: "1", ownerId: "m", status: "delivered" },
      { id: "1a", ownerId: "m", parentId: "1", status: "delivered" },
      { id: "2", ownerId: "m", status: "transit" },
      { id: "3", ownerId: "m", status: "cancelled" },
      { id: "4", ownerId: "d", status: "delivered" },
    ],
    kyb: [
      { userId: "m", status: "approved", country: "TR" },
      { userId: "c", status: "approved", country: "SY" },
      { userId: "x", status: "pending", country: "IQ" },
      { userId: "d", status: "approved", country: "JO" },
    ],
  };
  assert.deepEqual(publicStats(s), { companies: 2, completed: 1, active: 1, countries: 2 });
  assert.deepEqual(publicStats({}), { companies: 0, completed: 0, active: 0, countries: 0 });
});

import { accountsReport } from "../server/accountsReport.js";
test("accounts report lists real accounts with usage and operations", () => {
  const s = {
    users: [
      { id: "a", role: "admin" },
      {
        id: "m",
        role: "merchant",
        accountType: "merchant",
        name: "Trader",
        email: "t@x.test",
        taxId: "123",
        verified: true,
        verificationStatus: "approved",
        createdAt: "2026-10-01T10:00:00Z",
        details: { country: "TR", city: "Gaziantep", activity: "import", products: "Textiles" },
        loginCount: 4,
        subscription: {
          startedAt: "2026-10-02T09:00:00Z",
          payments: [{ months: 12, amount: 290, at: "2026-10-05T10:00:00Z" }, { months: 1 }],
        },
        activeDays: 3,
      },
      { id: "c", role: "carrier", accountType: "carrier", name: "Carrier", verificationStatus: "pending" },
      { id: "d", role: "carrier", accountType: "carrier", name: "Demo", demo: true },
    ],
    shipments: [
      { id: "1", ownerId: "m", status: "delivered" },
      { id: "1a", ownerId: "m", parentId: "1", carrierId: "c", status: "delivered", bidId: "b1" },
      { id: "2", ownerId: "m", status: "open" },
    ],
    bids: [
      { id: "b1", carrierId: "c", price: 450 },
      { id: "b2", carrierId: "c", price: 900 },
    ],
    ratings: [
      { targetId: "c", score: 4 },
      { targetId: "c", score: 5 },
    ],
    kyb: [{ userId: "m", status: "approved", review: { reviewedAt: "2026-10-02T09:00:00Z" } }],
    adminNotes: [{ accountId: "m", done: false }],
  };
  const rows = accountsReport(s, "en");
  assert.equal(rows.length, 2);
  const m = rows.find((r) => r.id === "m"),
    c = rows.find((r) => r.id === "c");
  assert.equal(m.type, "Trader / import-export");
  assert.equal(m.approvedAt, "2026-10-02");
  assert.equal(m.shipmentsPosted, 2);
  assert.equal(m.completed, 1);
  assert.equal(m.active, 1);
  assert.equal(m.logins, 4);
  assert.equal(m.notes, 1);
  assert.match(m.offers, /Import · Textiles/);
  assert.equal(c.jobsTaken, 1);
  assert.equal(c.bids, 2);
  assert.equal(c.rating, 4.5);
  // 290 typed + 1 month at the default trader price (29)
  assert.equal(m.revenue, 319);
  assert.equal(m.paidMonths, 13);
  assert.equal(m.shipmentValue, 450);
  assert.equal(c.earnedValue, 450);
});
