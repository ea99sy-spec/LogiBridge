import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { validCountry } from "../shared/countries.js";

// Carrier route rates in USD per tonne. A rate stays valid for RATE_CARD_DAYS; any edit renews it.
// Expired rates drop out of the visitor estimate automatically. Once a month every carrier that has
// rates gets one in-app reminder to review them.
export const RATE_CARD_DAYS = 90;
const DAY = 86400000;
const MAX_CARDS = 60;
const MIN_RATE = 10;
const MAX_RATE = 10000;

const city = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
const validUntilFrom = (now = Date.now()) => new Date(now + RATE_CARD_DAYS * DAY).toISOString();
export const isActiveCard = (c, now = Date.now()) => Date.parse(c.validUntil) > now;

function rateOf(v) {
  const p = Number(v);
  if (!(p >= MIN_RATE && p <= MAX_RATE)) throw new Error("Invalid rate card");
  return Math.round(p * 100) / 100;
}

export function cleanCard(b = {}) {
  const originCountry = String(b.originCountry || "");
  const destinationCountry = String(b.destinationCountry || "");
  if (!validCountry(originCountry) || !validCountry(destinationCountry)) throw new Error("Invalid rate card");
  return {
    originCountry,
    destinationCountry,
    from: String(b.from || "")
      .trim()
      .slice(0, 80),
    to: String(b.to || "")
      .trim()
      .slice(0, 80),
    pricePerTonUsd: rateOf(b.pricePerTonUsd),
  };
}

const carrierOnly = (req) => {
  if (req.user.role !== "carrier") throw Object.assign(new Error("Forbidden"), { status: 403 });
};

export function rateCardRoutes(app) {
  app.get("/api/rate-cards", (req, res) => {
    carrierOnly(req);
    const now = Date.now();
    res.json(
      (readState().rateCards || [])
        .filter((c) => c.carrierId === req.user.id)
        .map((c) => ({ ...c, active: isActiveCard(c, now) }))
        .sort((a, b) => b.updatedAt?.localeCompare(a.updatedAt) || 0),
    );
  });

  // Same route twice updates the existing rate instead of adding a duplicate.
  app.post("/api/rate-cards", async (req, res) => {
    carrierOnly(req);
    const card = cleanCard(req.body);
    let saved;
    await mutate((s) => {
      const user = s.users.find((u) => u.id === req.user.id);
      if (!user?.verified) throw new Error("Account approval required");
      s.rateCards ||= [];
      const mine = s.rateCards.filter((c) => c.carrierId === req.user.id);
      let row = mine.find(
        (c) =>
          c.originCountry === card.originCountry &&
          c.destinationCountry === card.destinationCountry &&
          city(c.from) === city(card.from) &&
          city(c.to) === city(card.to),
      );
      if (!row) {
        if (mine.length >= MAX_CARDS) throw new Error("Too many rate cards");
        row = { id: id(), carrierId: req.user.id, createdAt: new Date().toISOString() };
        s.rateCards.push(row);
      }
      Object.assign(row, card, { updatedAt: new Date().toISOString(), validUntil: validUntilFrom() });
      saved = row;
    });
    res.json(saved);
  });

  app.patch("/api/rate-cards/:id", async (req, res) => {
    carrierOnly(req);
    const price = req.body?.pricePerTonUsd == null ? null : rateOf(req.body.pricePerTonUsd);
    await mutate((s) => {
      const row = (s.rateCards || []).find((c) => c.id === req.params.id && c.carrierId === req.user.id);
      if (!row) throw new Error("Rate card unavailable");
      if (price !== null) row.pricePerTonUsd = price;
      row.updatedAt = new Date().toISOString();
      row.validUntil = validUntilFrom();
    });
    res.json({ ok: true });
  });

  app.delete("/api/rate-cards/:id", async (req, res) => {
    carrierOnly(req);
    await mutate((s) => {
      const before = (s.rateCards || []).length;
      s.rateCards = (s.rateCards || []).filter(
        (c) => !(c.id === req.params.id && c.carrierId === req.user.id),
      );
      if (s.rateCards.length === before) throw new Error("Rate card unavailable");
    });
    res.json({ ok: true });
  });
}

// Reminder once a month per carrier with rates. Applied to a state object (used by the job and tests).
export function rateCardWatch(s, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  s.rateCardReminders ||= {};
  let sent = 0;
  for (const carrierId of new Set((s.rateCards || []).map((c) => c.carrierId))) {
    if (s.rateCardReminders[carrierId] === month) continue;
    s.rateCardReminders[carrierId] = month;
    notice(s, carrierId, "rate_card_monthly");
    sent++;
  }
  return sent;
}

export async function runRateCardWatch(now = new Date()) {
  const s = readState();
  const month = now.toISOString().slice(0, 7);
  const due = [...new Set((s.rateCards || []).map((c) => c.carrierId))].some(
    (cid) => s.rateCardReminders?.[cid] !== month,
  );
  if (!due) return false;
  await mutate((st) => rateCardWatch(st, now));
  return true;
}
