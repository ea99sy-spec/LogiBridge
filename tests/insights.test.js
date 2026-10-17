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
