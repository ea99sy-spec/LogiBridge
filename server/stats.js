// Public platform numbers for the home page, counted live from real (non-demo) data.
// Nothing here is estimated or seeded: every number grows by itself as the platform is used.
export function publicStats(s) {
  const real = new Set((s.users || []).filter((u) => !u.demo).map((u) => u.id));
  const companies = (s.users || []).filter(
    (u) => !u.demo && u.role !== "admin" && u.accountType !== "individual" && u.verified,
  );
  // Whole orders only (a 3-stage order counts once, not once per stage).
  const orders = (s.shipments || []).filter((x) => !x.parentId && real.has(x.ownerId));
  const countries = new Set();
  for (const k of s.kyb || [])
    if (k.status === "approved" && real.has(k.userId) && k.country) countries.add(k.country);
  return {
    companies: companies.length,
    completed: orders.filter((x) => x.status === "delivered").length,
    active: orders.filter((x) => !["delivered", "cancelled", "demo_reserved"].includes(x.status)).length,
    countries: countries.size,
  };
}
