import { requiresApproval } from "./access.js";
const modules = {
  merchant: [
    "dashboard",
    "profile",
    "directory",
    "newShipment",
    "shipments",
    "recurring",
    "documents",
    "tracking",
    "groups",
    "customs",
    "hub",
    "kyb",
    "border",
    "marketplace",
    "reports",
    "integrations",
    "returnTrips",
    "team",
    "guide",
    "ratings",
    "feedback",
    "contracts",
    "support",
    "security",
  ],
  individual: [
    "dashboard",
    "profile",
    "directory",
    "newShipment",
    "shipments",
    "recurring",
    "tracking",
    "groups",
    "documents",
    "kyb",
    "hub",
    "customs",
    "marketplace",
    "border",
    "returnTrips",
    "prices",
    "guide",
    "ratings",
    "feedback",
    "contracts",
    "support",
    "security",
  ],
  carrier: [
    "dashboard",
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
    "marketplace",
    "drivers",
    "reports",
    "returnTrips",
    "prices",
    "team",
    "guide",
    "ratings",
    "feedback",
    "contracts",
    "support",
    "security",
  ],
  broker: [
    "dashboard",
    "profile",
    "directory",
    "jobs",
    "tracking",
    "documents",
    "border",
    "hub",
    "kyb",
    "prices",
    "team",
    "guide",
    "ratings",
    "feedback",
    "contracts",
    "support",
    "security",
  ],
  supplier: [
    "dashboard",
    "profile",
    "directory",
    "inventory",
    "orders",
    "documents",
    "calendar",
    "hub",
    "kyb",
    "prices",
    "team",
    "guide",
    "feedback",
    "support",
    "security",
  ],
  admin: [
    "dashboard",
    "admin",
    "notes",
    "companies",
    "growth",
    "accountsReport",
    "feedbackAdmin",
    "returnTrips",
    "prices",
    "kyb",
    "disputes",
    "subscriptionsAdmin",
    "shipments",
    "tracking",
    "documents",
    "border",
    "hub",
    "guide",
    "security",
  ],
};
export function accountKind(user) {
  return user.role === "admin" ? "admin" : user.accountType === "individual" ? "individual" : user.role;
}
export function workspaceModules(user, flags = {}) {
  if (requiresApproval(user))
    return ["dashboard", "guide", "profile", "kyb", "support", "feedback", "security"];
  return (
    (modules[accountKind(user)] || [])
      // Private admin notes are for registered administrators only, not the shared demo admin.
      .filter((key) => !["notes", "accountsReport"].includes(key) || !user.demo)
      .filter((key) => !["ratings", "marketplace", "contracts"].includes(key) || flags[key])
      .filter((key) => !["inventory", "orders"].includes(key) || flags.marketplace)
      // Team management is for real company owners; employees don't manage the owner's security.
      .filter((key) => key !== "team" || !user.demo)
      .filter((key) => !user.member || !["team", "security"].includes(key))
      .filter((key) => !["kyb"].includes(key) || !user.member || user.member.teamRole === "manager")
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
