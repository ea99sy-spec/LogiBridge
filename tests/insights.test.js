import test from "node:test";
import assert from "node:assert/strict";
import { onTimeOf, paySpeedOf } from "../server/insights.js";
import { priceIndex, quickEstimate } from "../server/priceIndex.js";
import { checkCommercial, totals } from "../shared/commercial.js";
import { visibleTrips } from "../server/returnTrips.js";

const users = [
  { id: "m", role: "merchant" },
  { id: "c", role: "carrier" },
];

test("on-time share and payment speed come from real dates", () => {
  const s = {
    users,
    bids: [
      { id: "b1", price: 500, days: 2 },
      { id: "b2", price: 600, days: 2 },
    ],
    shipments: [
      {
        id: "1",
        ownerId: "m",
        carrierId: "c",
        bidId: "b1",
        status: "delivered",
        date: "2026-10-01",
        acceptedAt: "2026-09-30T10:00:00Z",
        arrivedAt: "2026-10-03T08:00:00Z",
      },
      {
        id: "2",
        ownerId: "m",
        carrierId: "c",
        bidId: "b2",
        status: "delivered",
        date: "2026-10-01",
        acceptedAt: "2026-09-30T10:00:00Z",
        arrivedAt: "2026-10-06T08:00:00Z",
      },
    ],
    escrows: [
      { shipmentId: "1", fundedAt: "2026-10-01T10:00:00Z" },
      { shipmentId: "2", paidAt: "2026-10-03T10:00:00Z" },
    ],
  };
  assert.deepEqual(onTimeOf(s, "c"), { count: 2, pct: 50 });
  assert.deepEqual(paySpeedOf(s, "m"), { count: 2, avgDays: 2 });
});

test("price index needs three deals and estimates by weight", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  const mk = (i, price, weight) => ({
    id: "s" + i,
    ownerId: "m",
    carrierId: "c",
    bidId: "b" + i,
    status: "delivered",
    origin: "Gaziantep",
    destination: "Aleppo",
    originCountry: "TR",
    destinationCountry: "SY",
    weight,
    acceptedAt: "2026-10-10T10:00:00Z",
  });
  const s = {
    users,
    shipments: [mk(1, 1000, 10000), mk(2, 1200, 10000)],
    bids: [
      { id: "b1", price: 1000, days: 2 },
      { id: "b2", price: 1200, days: 3 },
      { id: "b3", price: 1100, days: 2 },
    ],
  };
  assert.equal(priceIndex(s, false, now).length, 0);
  assert.equal(quickEstimate(s, { from: "TR", to: "SY" }).enough, false);
  s.shipments.push(mk(3, 1100, 10000));
  const [route] = priceIndex(s, false, now);
  assert.equal(route.deals, 3);
  assert.equal(route.median, 1100);
  assert.equal(route.perTon, 110);
  const est = quickEstimate(s, { from: "TR", to: "SY", weight: 5000 });
  assert.equal(est.enough, true);
  assert.equal(est.mid, 550);
  // Demo deals never appear in the registered world.
  assert.equal(priceIndex({ ...s, users: users.map((u) => ({ ...u, demo: true })) }, false, now).length, 0);
});

test("commercial documents are checked against the shipment", () => {
  const doc = {
    seller: { name: "A" },
    buyer: { name: "B" },
    items: [
      {
        description: "Cotton",
        hsCode: "520100",
        qty: 10,
        unitPrice: 5,
        netKg: 900,
        grossKg: 1000,
        packages: 5,
      },
    ],
  };
  assert.deepEqual(totals(doc), { amount: 50, net: 900, gross: 1000, packages: 5 });
  let r = checkCommercial(doc, { weight: 1000, hsCode: "520100" });
  assert.equal(r.errors.length + r.warnings.length, 0);
  r = checkCommercial(doc, { weight: 2000, hsCode: "620100" });
  assert.deepEqual(r.warnings.map((w) => w.key).sort(), ["ccHsDiffers", "ccWeightDiffers"]);
  r = checkCommercial({ ...doc, items: [{ ...doc.items[0], netKg: 2000 }] }, { weight: 1000 });
  assert.ok(r.errors.some((e) => e.key === "ccNetOverGross"));
});

test("return trips: traders see open trips and only their own requests", () => {
  const s = {
    returnTrips: [
      {
        id: "t",
        carrierId: "c",
        status: "open",
        date: "2099-01-01",
        requests: [
          { id: "r1", userId: "m" },
          { id: "r2", userId: "x" },
        ],
      },
      { id: "old", carrierId: "c", status: "open", date: "2000-01-01", requests: [] },
    ],
  };
  const trader = visibleTrips(s, { id: "m", role: "merchant" });
  assert.equal(trader.length, 1);
  assert.equal(trader[0].requests.length, 1);
  assert.equal(visibleTrips(s, { id: "c", role: "carrier" })[0].requests.length, 2);
});

import { applyDelayGuarantee } from "../server/domain.js";
test("delay guarantee discount comes from the real arrival", () => {
  const s = {
    bids: [{ id: "b", price: 1000, days: 2, delayPct: 5 }],
    escrows: [{ shipmentId: "x", amount: 1000, carrierNet: 1000 }],
  };
  const sh = {
    id: "x",
    bidId: "b",
    date: "2026-10-01",
    acceptedAt: "2026-09-30T10:00:00Z",
    arrivedAt: "2026-10-05T10:00:00Z",
  };
  applyDelayGuarantee(s, sh);
  assert.deepEqual(sh.delayDiscount, { lateDays: 2, pct: 10, amount: 100, perDay: 5 });
  assert.equal(s.escrows[0].carrierNet, 900);
  const late = { id: "y", bidId: "b", date: "2026-10-01", arrivedAt: "2026-10-30T10:00:00Z" };
  applyDelayGuarantee({ ...s, escrows: [] }, late);
  assert.equal(late.delayDiscount.pct, 30);
  const onTime = { id: "z", bidId: "b", date: "2026-10-01", arrivedAt: "2026-10-03T10:00:00Z" };
  applyDelayGuarantee({ ...s, escrows: [] }, onTime);
  assert.equal(onTime.delayDiscount, undefined);
});

import { trustLevel } from "../server/insights.js";
test("trust levels follow measured behaviour", () => {
  const base = { rating: null, reviews: 0, onTimeCount: 0, onTimePct: null, payCount: 0, payDays: null };
  assert.equal(trustLevel({ ...base, completed: 0 }), null);
  assert.equal(trustLevel({ ...base, completed: 1 }), "bronze");
  assert.equal(
    trustLevel({ ...base, completed: 8, rating: 4.2, reviews: 3, onTimeCount: 8, onTimePct: 80 }),
    "silver",
  );
  assert.equal(trustLevel({ ...base, completed: 8, onTimeCount: 8, onTimePct: 50 }), "bronze");
  assert.equal(
    trustLevel({ ...base, completed: 25, rating: 4.8, reviews: 10, onTimeCount: 25, onTimePct: 96 }),
    "gold",
  );
});

import { sharedMatches } from "../server/sharedTruck.js";
test("small shipments on the same route and week are matched for a shared truck", () => {
  const base = {
    status: "open",
    origin: "Gaziantep",
    destination: "Aleppo",
    date: "2026-11-01",
    volume: 20,
    weight: 5000,
  };
  const s = {
    users: [{ id: "a" }, { id: "b" }, { id: "c" }],
    shipments: [
      { ...base, id: "1", ownerId: "a" },
      { ...base, id: "2", ownerId: "b", date: "2026-11-03" },
      { ...base, id: "3", ownerId: "c", date: "2026-11-10" },
      { ...base, id: "4", ownerId: "c", volume: 70 },
    ],
  };
  assert.deepEqual(
    sharedMatches(s, s.shipments[0]).map((x) => x.id),
    ["2"],
  );
});

import { rewardReferral, referralCode, inviterFor } from "../server/referrals.js";
import { addCrossingStat, crossingTimes } from "../shared/crossingTimes.js";
test("referral reward and best crossing times", () => {
  const s = {
    users: [
      { id: "inv", role: "merchant", accountType: "merchant" },
      { id: "new", role: "carrier", accountType: "carrier", name: "New", referredBy: "inv" },
      { id: "p", role: "merchant", accountType: "individual", referredBy: "inv" },
    ],
    notifications: [],
  };
  assert.equal(inviterFor(s, referralCode("inv")).id, "inv");
  rewardReferral(s, s.users[1]);
  rewardReferral(s, s.users[1]);
  rewardReferral(s, s.users[2]);
  assert.equal(s.users[0].subscription.rewardMonths, 1);
  const t = {};
  for (const lvl of [3, 3, 4]) addCrossingStat(t, "bab", lvl, "2026-10-19T05:00:00Z", false); // Monday morning
  for (const lvl of [0, 1, 0]) addCrossingStat(t, "bab", lvl, "2026-10-20T13:00:00Z", false); // Tuesday afternoon
  addCrossingStat(t, "bab", 0, "2026-10-21T13:00:00Z", true); // demo: ignored
  const r = crossingTimes(t.crossingStats, "bab");
  assert.equal(r.reports, 6);
  assert.deepEqual([r.best[0].day, r.best[0].slot], [2, 2]);
});
