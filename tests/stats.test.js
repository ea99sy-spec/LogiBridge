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
