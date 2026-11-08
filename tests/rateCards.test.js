import test from "node:test";
import assert from "node:assert/strict";
import { quickEstimate } from "../server/priceIndex.js";
import { cleanCard, rateCardWatch, RATE_CARD_DAYS } from "../server/rateCards.js";

const NOW = Date.parse("2026-11-08T00:00:00Z");
const DAY = 86400000;
const future = (days) => new Date(NOW + days * DAY).toISOString();
const card = (carrierId, price, extra = {}) => ({
  id: `${carrierId}-${price}-${Math.random()}`,
  carrierId,
  originCountry: "TR",
  destinationCountry: "SY",
  from: "",
  to: "",
  pricePerTonUsd: price,
  validUntil: future(RATE_CARD_DAYS),
  ...extra,
});
const users = (...ids) => ids.map((id) => ({ id, role: "carrier", verified: true, demo: false }));
const q = { from: "TR", to: "SY", city: "" };

test("three carriers give the median of their own medians, with no names", () => {
  const s = {
    users: users("a", "b", "c"),
    rateCards: [card("a", 100), card("a", 300), card("b", 200), card("c", 150)],
  };
  const est = quickEstimate(s, q, false, NOW);
  // a: median(100,300)=200, b: 200, c: 150 -> median 200
  assert.equal(est.enough, true);
  assert.equal(est.basis, "carrier_cards");
  assert.equal(est.ratePerTon, 200);
  assert.equal(est.deals, 3);
  assert.equal("carrierId" in est, false);
});

test("two carriers are not enough for a visitor price", () => {
  const s = { users: users("a", "b"), rateCards: [card("a", 100), card("b", 200)] };
  assert.equal(quickEstimate(s, q, false, NOW).enough, false);
});

test("expired rate cards drop out of the estimate automatically", () => {
  const s = {
    users: users("a", "b", "c"),
    rateCards: [card("a", 100), card("b", 200), card("c", 150, { validUntil: future(-1) })],
  };
  assert.equal(quickEstimate(s, q, false, NOW).enough, false);
});

test("demo carriers never reach the public estimate", () => {
  const s = {
    users: [...users("a", "b"), { id: "d", role: "carrier", verified: true, demo: true }],
    rateCards: [card("a", 100), card("b", 200), card("d", 999)],
  };
  assert.equal(quickEstimate(s, q, false, NOW).enough, false);
  const demo = quickEstimate(s, q, true, NOW);
  assert.equal(demo.enough, false); // demo world still needs three carriers
});

test("administrator reference rate is used only when there is no carrier or deal data", () => {
  const s = {
    users: [],
    rateCards: [],
    settings: { referenceRates: [{ originCountry: "TR", destinationCountry: "SY", pricePerTonUsd: 120 }] },
  };
  const est = quickEstimate(s, q, false, NOW);
  assert.equal(est.enough, true);
  assert.equal(est.basis, "reference");
  assert.equal(est.ratePerTon, 120);

  const withCards = {
    ...s,
    users: users("a", "b", "c"),
    rateCards: [card("a", 200), card("b", 200), card("c", 200)],
  };
  assert.equal(quickEstimate(withCards, q, false, NOW).basis, "carrier_cards");
});

test("rate card input is checked before it is stored", () => {
  const good = cleanCard({ originCountry: "TR", destinationCountry: "SY", pricePerTonUsd: "150.456" });
  assert.equal(good.pricePerTonUsd, 150.46);
  assert.throws(
    () => cleanCard({ originCountry: "TR", destinationCountry: "SY", pricePerTonUsd: 5 }),
    /Invalid rate card/,
  );
  assert.throws(
    () => cleanCard({ originCountry: "XX", destinationCountry: "SY", pricePerTonUsd: 100 }),
    /Invalid rate card/,
  );
});

test("carriers get one reminder per month, and again the next month", () => {
  const s = { users: users("a"), notifications: [], rateCards: [card("a", 100)] };
  assert.equal(rateCardWatch(s, new Date("2026-12-01T00:10:00Z")), 1);
  assert.equal(rateCardWatch(s, new Date("2026-12-02T00:10:00Z")), 0);
  assert.equal(rateCardWatch(s, new Date("2027-01-01T00:10:00Z")), 1);
  assert.equal(s.notifications.filter((n) => n.event === "rate_card_monthly").length, 2);
});
