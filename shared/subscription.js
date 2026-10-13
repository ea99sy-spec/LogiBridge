// Monthly subscription with a free start (no commission on shipments).
// - Every approved account gets FREE_MONTHS free months, counted from approval.
// - Accounts that complete ACTIVE_OPERATIONS operations within those months earn BONUS_MONTHS more.
// - After that, the administrator records paid months (manual payment for now).
export const FREE_MONTHS = 3;
export const BONUS_MONTHS = 3;
export const ACTIVE_OPERATIONS = 7;

export function addMonths(iso, months) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

// Completed operations of an account: delivered shipments it owns (an order of three stages counts
// once), delivered jobs it carried or cleared, and completed equipment orders it supplied.
export function completedOperations(state, user, from, to) {
  const inWindow = (iso) => !from || !iso || (iso >= from && iso <= to);
  const own = state.shipments.filter(
    (s) => s.ownerId === user.id && !s.parentId && s.status === "delivered" && inWindow(s.completedAt),
  ).length;
  const carried = state.shipments.filter(
    (s) => s.carrierId === user.id && !s.isOrder && s.status === "delivered" && inWindow(s.completedAt),
  ).length;
  const supplied = (state.orders || []).filter(
    (o) =>
      o.status === "completed" &&
      state.products?.find((p) => p.id === o.productId)?.supplierId === user.id &&
      inWindow(o.updatedAt),
  ).length;
  return own + carried + supplied;
}

export function subscriptionOf(state, user, now = Date.now()) {
  if (!user || user.role === "admin" || user.demo) return { status: "none" };
  const start = user.subscription?.startedAt;
  if (!start) return { status: "pending" }; // starts when the account is approved
  const trialEnd = addMonths(start, FREE_MONTHS);
  const operations = completedOperations(state, user, start, trialEnd);
  const bonus = operations >= ACTIVE_OPERATIONS;
  const freeUntil = bonus ? addMonths(start, FREE_MONTHS + BONUS_MONTHS) : trialEnd;
  const paidUntil = user.subscription?.paidUntil || null;
  const endsAt = paidUntil && paidUntil > freeUntil ? paidUntil : freeUntil;
  const nowIso = new Date(now).toISOString();
  const status = nowIso < freeUntil ? "trial" : paidUntil && nowIso < paidUntil ? "paid" : "expired";
  return {
    status,
    startedAt: start,
    trialEnd,
    freeUntil,
    paidUntil,
    endsAt,
    bonus,
    operations: Math.min(operations, ACTIVE_OPERATIONS),
    target: ACTIVE_OPERATIONS,
    // Operations only count toward the bonus during the first free months.
    bonusOpen: !bonus && nowIso < trialEnd,
    daysLeft: Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 86400000)),
  };
}

// Monthly prices in USD shown on the home page (the administrator can change or hide them).
export const defaultPricing = {
  visible: true,
  currency: "USD",
  prices: { merchant: 29, carrier: 19, broker: 19, supplier: 15, individual: 0 },
};
export function pricingOf(state) {
  const p = state.settings?.pricing || {};
  return {
    visible: p.visible ?? defaultPricing.visible,
    currency: defaultPricing.currency,
    prices: { ...defaultPricing.prices, ...(p.prices || {}) },
  };
}
