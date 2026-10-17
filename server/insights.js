// Reputation measured from what really happened on the platform, not only stars:
// - on time: share of a carrier's/broker's finished stages that arrived by the agreed day
//   (planned date or acceptance day + the days in the accepted offer, with the end of that day);
// - payment speed: average days a shipment owner took to pay after accepting an offer.
const DAY = 86400000;
const round1 = (n) => Math.round(n * 10) / 10;

export function onTimeOf(s, userId) {
  let count = 0,
    onTime = 0;
  for (const sh of s.shipments || []) {
    if (sh.carrierId !== userId || !sh.bidId || !["arrived", "delivered"].includes(sh.status)) continue;
    const bid = (s.bids || []).find((b) => b.id === sh.bidId);
    const arrived = sh.arrivedAt || sh.pod?.at || sh.completedAt;
    if (!bid || !arrived) continue;
    const start = Math.max(Date.parse(sh.date || 0) || 0, Date.parse(sh.acceptedAt || 0) || 0);
    if (!start) continue;
    const due = new Date(start + (Number(bid.days) || 0) * DAY);
    due.setUTCHours(23, 59, 59, 999);
    count++;
    if (Date.parse(arrived) <= due.getTime()) onTime++;
  }
  return { count, pct: count ? Math.round((onTime / count) * 100) : null };
}

export function paySpeedOf(s, userId) {
  const days = [];
  for (const sh of s.shipments || []) {
    if (sh.ownerId !== userId || !sh.acceptedAt) continue;
    const e = (s.escrows || []).find((x) => x.shipmentId === sh.id);
    const paid = e?.fundedAt || e?.paidAt;
    if (paid) days.push(Math.max(0, (Date.parse(paid) - Date.parse(sh.acceptedAt)) / DAY));
  }
  return {
    count: days.length,
    avgDays: days.length ? round1(days.reduce((a, b) => a + b, 0) / days.length) : null,
  };
}

// Trust level from measured behaviour (not paid, not chosen):
// gold   — 20+ completed, rating 4.5+, 90%+ on time (carriers) / pays within 3 days (owners)
// silver — 7+ completed, rating 4+, 75%+ on time / pays within 7 days
// bronze — at least one completed operation on the platform.
export function trustLevel(r) {
  const okRating = (min) => r.rating === null || r.rating >= min;
  const okOnTime = (min) => !r.onTimeCount || r.onTimePct >= min;
  const okPay = (max) => !r.payCount || r.payDays <= max;
  if (r.completed >= 20 && r.reviews >= 3 && okRating(4.5) && okOnTime(90) && okPay(3)) return "gold";
  if (r.completed >= 7 && okRating(4) && okOnTime(75) && okPay(7)) return "silver";
  if (r.completed >= 1) return "bronze";
  return null;
}

export function reputationOf(s, userId) {
  const scores = (s.ratings || []).filter((r) => r.targetId === userId).map((r) => r.score);
  const t = onTimeOf(s, userId),
    p = paySpeedOf(s, userId);
  const r = {
    rating: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    reviews: scores.length,
    completed: (s.shipments || []).filter(
      (sh) => sh.status === "delivered" && !sh.isOrder && (sh.ownerId === userId || sh.carrierId === userId),
    ).length,
    onTimePct: t.pct,
    onTimeCount: t.count,
    payDays: p.avgDays,
    payCount: p.count,
  };
  return { ...r, level: trustLevel(r) };
}

// Reputation of every account of the viewer's world (demo or registered), for offers and cards.
export function reputationMap(s, viewer) {
  const out = {};
  for (const u of s.users || [])
    if (u.role !== "admin" && !!u.demo === !!viewer.demo) out[u.id] = reputationOf(s, u.id);
  return out;
}
