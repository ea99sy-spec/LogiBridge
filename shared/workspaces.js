import { requiresApproval } from "./access.js";
const modules = {
  merchant: [
    "dashboard",
    "guide",
    "profile",
    "directory",
    "newShipment",
    "shipments",
    "documents",
    "tracking",
    "groups",
    "customs",
    "hub",
    "kyb",
    "border",
    "ratings",
    "marketplace",
    "contracts",
    "reports",
    "integrations",
    "returnTrips",
    "prices",
    "feedback",
    "security",
  ],
  individual: [
    "dashboard",
    "guide",
    "profile",
    "directory",
    "newShipment",
    "shipments",
    "tracking",
    "groups",
    "documents",
    "kyb",
    "hub",
    "customs",
    "ratings",
    "marketplace",
    "contracts",
    "border",
    "returnTrips",
    "prices",
    "feedback",
    "security",
  ],
  carrier: [
    "dashboard",
    "guide",
    "profile",
    "directory",
    "jobs",
    "fleet",
    "groups",
    "tracking",
    "documents",
    "hub",
    "kyb",
    "border",
    "ratings",
    "marketplace",
    "contracts",
    "drivers",
    "reports",
    "returnTrips",
    "prices",
    "feedback",
    "security",
  ],
  broker: [
    "dashboard",
    "guide",
    "profile",
    "directory",
    "jobs",
    "tracking",
    "documents",
    "border",
    "hub",
    "kyb",
    "ratings",
    "contracts",
    "prices",
    "feedback",
    "security",
  ],
  supplier: [
    "dashboard",
    "guide",
    "profile",
    "directory",
    "inventory",
    "orders",
    "documents",
    "calendar",
    "hub",
    "kyb",
    "prices",
    "feedback",
    "security",
  ],
  admin: [
    "dashboard",
    "guide",
    "admin",
    "notes",
    "companies",
    "accountsReport",
    "feedbackAdmin",
    "returnTrips",
    "prices",
    "kyb",
    "shipments",
    "tracking",
    "documents",
    "border",
    "hub",
    "security",
  ],
};
export function accountKind(user) {
  return user.role === "admin" ? "admin" : user.accountType === "individual" ? "individual" : user.role;
}
export function workspaceModules(user, flags = {}) {
  if (requiresApproval(user)) return ["dashboard", "guide", "profile", "kyb", "feedback", "security"];
  return (
    (modules[accountKind(user)] || [])
      // Private admin notes are for registered administrators only, not the shared demo admin.
      .filter((key) => !["notes", "accountsReport"].includes(key) || !user.demo)
      .filter((key) => !["ratings", "marketplace", "contracts"].includes(key) || flags[key])
      .filter((key) => !["inventory", "orders"].includes(key) || flags.marketplace)
  );
}
// Carriers see open transport jobs, customs brokers see open clearance jobs,
// and both always see the jobs assigned to them.
export function visibleShipments(state, user) {
  return state.shipments.filter(
    (s) =>
      user.role === "admin" ||
      (user.role === "carrier" &&
        ((s.status === "open" && s.legType !== "clearance" && !s.isOrder) || s.carrierId === user.id)) ||
      (user.role === "broker" &&
        ((s.status === "open" && s.legType === "clearance") || s.carrierId === user.id)) ||
      (user.role === "merchant" && s.ownerId === user.id),
  );
}
export function vendorOrders(state, user) {
  return state.orders.filter(
    (o) =>
      user.role === "admin" ||
      o.userId === user.id ||
      (user.role === "supplier" &&
        state.products.some((p) => p.id === o.productId && p.supplierId === user.id)),
  );
}
