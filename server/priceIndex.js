import { readState } from "./store.js";

// Route price index from real deals: the accepted offer of every shipment or stage.
// A route is shown only with at least MIN_DEALS deals so no single company's price is exposed.
export const MIN_DEALS = 3;
const DAY = 86400000;
const city = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
const median = (a) => {
  const v = [...a].sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const pct = (a, p) => {
  const v = [...a].sort((x, y) => x - y);
  return v[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * p)))];
};
const r = (n) => Math.round(n);

// One sample per accepted offer, in the viewer's world (demo or registered).
export function dealSamples(s, demo) {
  const out = [];
  for (const sh of s.shipments || []) {
    if (!sh.bidId || ["cancelled", "rejected"].includes(sh.status)) continue;
    const owner = s.users.find((u) => u.id === sh.ownerId);
    if (!owner || !!owner.demo !== !!demo) continue;
    const bid = (s.bids || []).find((b) => b.id === sh.bidId);
    if (!bid?.price) continue;
    out.push({
      from: sh.origin,
      to: sh.destination,
      originCountry: sh.originCountry || "",
      destinationCountry: sh.destinationCountry || "",
      crossing: sh.crossing || "",
      stage: sh.legType || "full",
      price: bid.price,
      days: bid.days,
      weight: Number(sh.weight) || 0,
      at: sh.acceptedAt || bid.createdAt || sh.createdAt,
    });
  }
  return out;
}

function summarize(list, now) {
  const prices = list.map((x) => x.price);
  const perTon = list.filter((x) => x.weight > 0).map((x) => x.price / (x.weight / 1000));
  const recent = list.filter((x) => now - Date.parse(x.at) <= 30 * DAY).map((x) => x.price);
  const before = list
    .filter((x) => now - Date.parse(x.at) > 30 * DAY && now - Date.parse(x.at) <= 60 * DAY)
    .map((x) => x.price);
  return {
    deals: list.length,
    median: r(median(prices)),
    low: r(pct(prices, 0.25)),
    high: r(pct(prices, 0.75)),
    min: r(Math.min(...prices)),
    max: r(Math.max(...prices)),
    perTon: perTon.length ? r(median(perTon)) : null,
    days: r(median(list.map((x) => Number(x.days) || 0))),
    trend:
      recent.length >= 2 && before.length >= 2
        ? Math.round(((median(recent) - median(before)) / median(before)) * 100)
        : null,
    last: list
      .map((x) => x.at)
      .sort()
      .at(-1),
  };
}

// Routes grouped by city pair and stage type.
export function priceIndex(s, demo, now = Date.now()) {
  const groups = new Map();
  for (const x of dealSamples(s, demo)) {
    const key = [city(x.from), city(x.to), x.stage].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(x);
  }
  return [...groups.values()]
    .filter((list) => list.length >= MIN_DEALS)
    .map((list) => ({
      from: list.at(-1).from,
      to: list.at(-1).to,
      originCountry: list.at(-1).originCountry,
      destinationCountry: list.at(-1).destinationCountry,
      crossing: list.at(-1).crossing,
      stage: list[0].stage,
      ...summarize(list, now),
    }))
    .sort((a, b) => b.deals - a.deals);
}

// Quick estimate for a visitor: country pair (and city when there are enough deals there).
export function quickEstimate(s, q, demo = false, now = Date.now()) {
  let list = dealSamples(s, demo).filter(
    (x) =>
      (!q.from || x.originCountry === q.from) &&
      (!q.to || x.destinationCountry === q.to) &&
      ["full", "origin_leg", "destination_leg", "clearance"].includes(x.stage),
  );
  // Whole shipments give the best estimate; stages are used only when there are too few of them.
  const full = list.filter((x) => x.stage === "full");
  if (full.length >= MIN_DEALS) list = full;
  const byCity = list.filter((x) => q.city && (city(x.from) === city(q.city) || city(x.to) === city(q.city)));
  if (byCity.length >= MIN_DEALS) list = byCity;
  if (list.length < MIN_DEALS) return { deals: list.length, enough: false };
  const tons = Number(q.weight) > 0 ? Number(q.weight) / 1000 : null;
  const perTon = list.filter((x) => x.weight > 0).map((x) => x.price / (x.weight / 1000));
  if (tons && perTon.length >= MIN_DEALS)
    return {
      enough: true,
      deals: perTon.length,
      low: r(pct(perTon, 0.25) * tons),
      mid: r(median(perTon) * tons),
      high: r(pct(perTon, 0.75) * tons),
      basis: "weight",
    };
  const sum = summarize(list, now);
  return { enough: true, deals: sum.deals, low: sum.low, mid: sum.median, high: sum.high, basis: "route" };
}

export function priceIndexRoutes(app, { publicOnly } = {}) {
  if (publicOnly) {
    // Public: registered accounts' deals only.
    app.get("/api/public/price-index", (req, res) =>
      res.json({ routes: priceIndex(readState(), false), min: MIN_DEALS }),
    );
    app.get("/api/public/price-estimate", (req, res) => {
      const q = {
        from: String(req.query.from || "").slice(0, 2),
        to: String(req.query.to || "").slice(0, 2),
        city: String(req.query.city || "").slice(0, 80),
        weight: Math.min(Math.max(Number(req.query.weight) || 0, 0), 100000),
      };
      res.json(quickEstimate(readState(), q, false));
    });
    return;
  }
  app.get("/api/price-index", (req, res) =>
    res.json({ routes: priceIndex(readState(), !!req.user.demo), min: MIN_DEALS }),
  );
}
