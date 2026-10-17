import { readState } from "./store.js";
import { paymentAmount } from "./operations.js";

// Administration growth numbers: weekly sign-ups and operations, monthly subscription revenue,
// busiest routes and crossings, and the sign-up funnel. Accounts of the viewer's world only.
const DAY = 86400000;
const weekStart = (t) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  return d.getTime();
};

export function growth(s, demo, now = Date.now()) {
  const users = s.users.filter((u) => u.role !== "admin" && !!u.demo === !!demo);
  const ids = new Set(users.map((u) => u.id));
  const orders = s.shipments.filter((x) => !x.parentId && ids.has(x.ownerId));
  const first = weekStart(now) - 11 * 7 * DAY;
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    start: new Date(first + i * 7 * DAY).toISOString().slice(0, 10),
    signups: 0,
    shipments: 0,
    completed: 0,
  }));
  const slot = (iso) => {
    const t = Date.parse(iso || "");
    if (!t || t < first) return null;
    return weeks[Math.floor((weekStart(t) - first) / (7 * DAY))] || null;
  };
  for (const u of users) {
    const w = slot(u.createdAt);
    if (w) w.signups++;
  }
  for (const o of orders) {
    const w = slot(o.createdAt);
    if (w) w.shipments++;
    const c = o.status === "delivered" ? slot(o.completedAt) : null;
    if (c) c.completed++;
  }
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    return { month: d.toISOString().slice(0, 7), revenue: 0 };
  });
  for (const u of users)
    for (const p of u.subscription?.payments || []) {
      const m = months.find((x) => x.month === String(p.at).slice(0, 7));
      if (m) m.revenue += p.amount ?? paymentAmount(s, u, p.months || 0);
    }
  months.forEach((m) => (m.revenue = Math.round(m.revenue)));
  const count = (list, key) => {
    const map = new Map();
    for (const x of list) {
      const k = key(x);
      if (k) map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, n]) => ({ name, n }));
  };
  const kinds = {};
  for (const u of users) {
    const k = u.accountType === "individual" ? "individual" : u.role;
    kinds[k] = (kinds[k] || 0) + 1;
  }
  const active = new Set();
  for (const x of s.shipments)
    for (const id of [x.ownerId, x.carrierId]) if (ids.has(id) && x.bidId) active.add(id);
  return {
    weeks,
    months,
    kinds,
    routes: count(orders, (o) => (o.origin && o.destination ? `${o.origin} → ${o.destination}` : "")),
    crossings: count(orders, (o) => o.crossing || ""),
    funnel: {
      registered: users.length,
      approved: users.filter((u) => u.verified).length,
      active: active.size,
    },
  };
}

export function growthRoutes(app) {
  app.get("/api/admin/growth", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    res.json(growth(readState(), !!req.user.demo));
  });
}
