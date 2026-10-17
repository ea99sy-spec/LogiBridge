import { readState, mutate } from "./store.js";
import { notice } from "./advanced.js";
import { queueEmail } from "./email.js";

// Monthly report for every company: what it did on the platform last month (shipments,
// completed operations, money moved through accepted offers and punctuality). Sent once at the
// start of each month as a notice and an email, and always viewable in the workspace.

const DAY = 86400000;
export const lastMonth = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
};
const round = (n) => Math.round(n * 100) / 100;

export function monthlyReport(s, user, month) {
  const inMonth = (iso) => typeof iso === "string" && iso.startsWith(month);
  const legs = (s.shipments || []).filter((x) => !x.isOrder);
  const price = (sh) => Number((s.bids || []).find((b) => b.id === sh.bidId)?.price) || 0;
  const done = (sh) => sh.completedAt || (sh.status === "delivered" ? sh.arrivedAt : null);
  // As the shipment owner.
  const posted = (s.shipments || []).filter(
    (x) => x.ownerId === user.id && !x.parentId && inMonth(x.createdAt),
  );
  const ownAccepted = legs.filter((x) => x.ownerId === user.id && inMonth(x.acceptedAt));
  const ownDone = legs.filter((x) => x.ownerId === user.id && x.status === "delivered" && inMonth(done(x)));
  // As the carrier / customs broker.
  const won = legs.filter((x) => x.carrierId === user.id && inMonth(x.acceptedAt));
  const jobsDone = legs.filter(
    (x) => x.carrierId === user.id && x.status === "delivered" && inMonth(done(x)),
  );
  let onTimeCount = 0,
    onTime = 0;
  for (const sh of legs) {
    const arrived = sh.arrivedAt || sh.pod?.at || sh.completedAt;
    if (sh.carrierId !== user.id || !inMonth(arrived) || !sh.bidId) continue;
    const bid = (s.bids || []).find((b) => b.id === sh.bidId);
    const start = Math.max(Date.parse(sh.date || 0) || 0, Date.parse(sh.acceptedAt || 0) || 0);
    if (!bid || !start) continue;
    const due = new Date(start + (Number(bid.days) || 0) * DAY);
    due.setUTCHours(23, 59, 59, 999);
    onTimeCount++;
    if (Date.parse(arrived) <= due.getTime()) onTime++;
  }
  const routes = {};
  for (const x of [...posted, ...won]) {
    const k = `${x.origin} → ${x.destination}`;
    routes[k] = (routes[k] || 0) + 1;
  }
  return {
    month,
    posted: posted.length,
    accepted: ownAccepted.length,
    completed: ownDone.length,
    spent: round(ownAccepted.reduce((a, x) => a + price(x), 0)),
    offersSent: (s.bids || []).filter((b) => b.carrierId === user.id && inMonth(b.createdAt)).length,
    won: won.length,
    jobsDone: jobsDone.length,
    earned: round(won.reduce((a, x) => a + price(x), 0)),
    onTimePct: onTimeCount ? Math.round((onTime / onTimeCount) * 100) : null,
    onTimeCount,
    orders: (s.orders || []).filter(
      (o) =>
        inMonth(o.createdAt) &&
        (s.products || []).some((p) => p.id === o.productId && p.supplierId === user.id),
    ).length,
    topRoute:
      Object.entries(routes)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)[0] || null,
  };
}
const empty = (r) =>
  !r.posted && !r.accepted && !r.completed && !r.offersSent && !r.won && !r.jobsDone && !r.orders;

// Arabic summary lines for the email.
function lines(r) {
  return [
    r.posted && `طلبات شحن نشرتها: ${r.posted}`,
    r.accepted && `عروض قبلتها: ${r.accepted} (بقيمة $${r.spent})`,
    r.completed && `شحنات اكتملت: ${r.completed}`,
    r.offersSent && `عروض قدّمتها: ${r.offersSent}`,
    r.won && `عمليات حصلت عليها: ${r.won} (بقيمة $${r.earned})`,
    r.jobsDone && `عمليات نفّذتها: ${r.jobsDone}`,
    r.onTimePct !== null && `الالتزام بالموعد: ${r.onTimePct}% من ${r.onTimeCount}`,
    r.orders && `طلبات معدات: ${r.orders}`,
    r.topRoute && `أكثر طريق: ${r.topRoute}`,
  ].filter(Boolean);
}

// Sends last month's report once per account. Returns true when something changed.
export function monthlyWatch(s, now = new Date()) {
  const month = lastMonth(now);
  s.monthlyReportsSent ||= {};
  if (s.monthlyReportsSent.month === month && s.monthlyReportsSent.done) return false;
  // Only in the first week of a month (a deploy late in the month does not send an old report).
  const send = now.getUTCDate() <= 7;
  for (const u of send ? s.users : []) {
    if (u.demo || u.role === "admin" || u.disabled || !u.verified) continue;
    const r = monthlyReport(s, u, month);
    if (empty(r)) continue;
    notice(s, u.id, "monthly_report", undefined, month);
    queueEmail(
      s,
      u.id,
      "monthly_report",
      { month: `تقرير شهر ${month}`, summary: lines(r).join("\n") },
      `monthly/${month}/${u.id}`,
    );
  }
  s.monthlyReportsSent = { month, done: true, at: now.toISOString() };
  return true;
}

export async function runMonthlyWatch() {
  const sent = readState().monthlyReportsSent;
  if (sent?.month === lastMonth() && sent.done) return false;
  await mutate((s) => monthlyWatch(s));
  return true;
}

export function monthlyReportRoutes(app) {
  app.get("/api/reports/monthly", (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : lastMonth();
    res.json(monthlyReport(readState(), req.user, month));
  });
}
