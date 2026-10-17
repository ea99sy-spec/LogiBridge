import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { buildShipment, insertShipment } from "./shipmentFactory.js";
import { checkGoods, prohibitedRules } from "../shared/prohibited.js";

// Recurring shipments: a trader who ships the same goods on the same route every week or month
// saves it once. The platform publishes each shipment a few days before its date, and tells the
// carrier the trader usually works with (with the agreed price) so they can send their offer first.

export const EVERY = { weekly: 7, biweekly: 14, monthly: 0 };
const iso = (d) => d.toISOString().slice(0, 10);
export function nextOf(date, every) {
  const d = new Date(date + "T12:00:00Z");
  if (every === "monthly") {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  } else d.setUTCDate(d.getUTCDate() + EVERY[every]);
  return iso(d);
}
const addDays = (date, n) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

// The fields of an earlier shipment that are copied into each new one.
function templateFrom(sh) {
  const keep = [
    "title",
    "origin",
    "destination",
    "originCountry",
    "destinationCountry",
    "crossing",
    "description",
    "hsCode",
    "category",
    "volume",
    "weight",
    "insuranceRequested",
  ];
  const t = Object.fromEntries(
    keep.filter((k) => sh[k] !== undefined && sh[k] !== null).map((k) => [k, sh[k]]),
  );
  if (sh.privateDetails) Object.assign(t, sh.privateDetails);
  return t;
}

// Publishes what is due. Returns true when something changed.
export function recurringWatch(s, today = iso(new Date())) {
  let changed = false;
  for (const r of s.recurring || []) {
    if (!r.active) continue;
    const owner = s.users.find((u) => u.id === r.ownerId);
    if (!owner || owner.disabled) continue;
    let guard = 0;
    while (r.active && addDays(r.nextDate, -r.leadDays) <= today && guard++ < 60) {
      changed = true;
      if (r.endDate && r.nextDate > r.endDate) {
        r.active = false;
        r.endedAt = new Date().toISOString();
        break;
      }
      // A date already in the past was missed (for example the site was down): skip it.
      if (r.nextDate < today) {
        r.nextDate = nextOf(r.nextDate, r.every);
        continue;
      }
      const banned = checkGoods(r.template, prohibitedRules(s.settings));
      if (banned.length) {
        r.active = false;
        r.pausedReason = "prohibited";
        notice(s, r.ownerId, "recurring_paused", undefined, r.template.title);
        break;
      }
      try {
        const sh = buildShipment(owner, { ...r.template, date: r.nextDate });
        sh.recurringId = r.id;
        insertShipment(s, owner, sh);
        (r.runs ||= []).push({ shipmentId: sh.id, date: r.nextDate, at: new Date().toISOString() });
        r.runs = r.runs.slice(-24);
        notice(s, r.ownerId, "recurring_published", sh.id, r.nextDate);
        if (r.preferredCarrierId)
          notice(
            s,
            r.preferredCarrierId,
            "recurring_invite",
            sh.id,
            `${owner.name} · ${r.nextDate}${r.agreedPrice ? ` · $${r.agreedPrice}` : ""}`,
          );
      } catch (e) {
        r.active = false;
        r.pausedReason = e.message;
        notice(s, r.ownerId, "recurring_paused", undefined, r.template.title);
        break;
      }
      r.nextDate = nextOf(r.nextDate, r.every);
    }
  }
  return changed;
}

export async function runRecurringWatch() {
  const copy = JSON.parse(JSON.stringify(readState()));
  if (!recurringWatch(copy)) return false;
  await mutate((s) => recurringWatch(s));
  return true;
}

export function recurringFor(s, user) {
  return (s.recurring || [])
    .filter((r) => r.ownerId === user.id || r.preferredCarrierId === user.id || user.role === "admin")
    .filter((r) => {
      const o = s.users.find((u) => u.id === r.ownerId);
      return o && !!o.demo === !!user.demo;
    })
    .map((r) =>
      // A carrier sees its contract, not the trader's private sender/recipient details.
      r.ownerId === user.id || user.role === "admin"
        ? r
        : {
            ...r,
            template: {
              title: r.template.title,
              origin: r.template.origin,
              destination: r.template.destination,
              volume: r.template.volume,
              weight: r.template.weight,
            },
          },
    );
}

export function recurringRoutes(app) {
  const mine = (s, req) => {
    const r = (s.recurring || []).find((x) => x.id === req.params.id && x.ownerId === req.user.id);
    if (!r) throw new Error("Schedule unavailable");
    return r;
  };
  const read = (s, b, base = {}) => {
    const out = { ...base };
    if (b.every !== undefined) {
      if (!(b.every in EVERY)) throw new Error("Invalid request");
      out.every = b.every;
    }
    if (b.leadDays !== undefined) {
      const n = Number(b.leadDays);
      if (!Number.isInteger(n) || n < 1 || n > 14) throw new Error("Invalid request");
      out.leadDays = n;
    }
    if (b.endDate !== undefined) {
      if (b.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(b.endDate)) throw new Error("Invalid request");
      out.endDate = b.endDate || null;
    }
    if (b.preferredCarrierId !== undefined) {
      if (b.preferredCarrierId) {
        const c = s.users.find((u) => u.id === b.preferredCarrierId && u.role === "carrier" && !u.disabled);
        if (!c) throw new Error("Carrier unavailable");
      }
      out.preferredCarrierId = b.preferredCarrierId || null;
    }
    if (b.agreedPrice !== undefined) {
      const p = b.agreedPrice === "" || b.agreedPrice === null ? null : Number(b.agreedPrice);
      if (p !== null && (!Number.isFinite(p) || p <= 0 || p > 1e7)) throw new Error("Invalid price");
      out.agreedPrice = p;
    }
    return out;
  };
  app.post("/api/recurring", async (req, res) => {
    if (req.user.role !== "merchant") throw Object.assign(new Error("Forbidden"), { status: 403 });
    const b = req.body || {};
    const today = iso(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.firstDate || "") || b.firstDate <= today)
      throw new Error("Invalid date");
    let created;
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === b.shipmentId && x.ownerId === req.user.id && !x.parentId);
      if (!sh) throw new Error("Shipment unavailable");
      s.recurring ||= [];
      if (s.recurring.filter((r) => r.ownerId === req.user.id && r.active).length >= 30)
        throw new Error("Too many schedules");
      const template = templateFrom(sh);
      // Checked now so a mistake shows immediately, not on the first publication day.
      buildShipment(req.user, { ...template, date: b.firstDate });
      if (checkGoods(template, prohibitedRules(s.settings)).length)
        throw new Error("Prohibited goods: this request cannot be accepted");
      created = {
        id: id(),
        ownerId: req.user.id,
        template,
        fromShipmentId: sh.id,
        every: "weekly",
        leadDays: 3,
        endDate: null,
        preferredCarrierId: null,
        agreedPrice: null,
        ...read(s, b),
        nextDate: b.firstDate,
        active: true,
        runs: [],
        createdAt: new Date().toISOString(),
      };
      s.recurring.push(created);
      recurringWatch(s);
    });
    res.status(201).json(created);
  });
  app.post("/api/recurring/:id", async (req, res) => {
    const b = req.body || {};
    await mutate((s) => {
      const r = mine(s, req);
      Object.assign(r, read(s, b));
      if (b.active !== undefined) {
        if (typeof b.active !== "boolean") throw new Error("Invalid request");
        r.active = b.active;
        delete r.pausedReason;
        // Resuming moves a past date forward instead of publishing old shipments.
        const today = iso(new Date());
        while (r.active && r.nextDate <= today) r.nextDate = nextOf(r.nextDate, r.every);
      }
      recurringWatch(s);
    });
    res.json({ ok: true });
  });
  app.delete("/api/recurring/:id", async (req, res) => {
    await mutate((s) => {
      const r = mine(s, req);
      s.recurring = s.recurring.filter((x) => x !== r);
    });
    res.json({ ok: true });
  });
}
