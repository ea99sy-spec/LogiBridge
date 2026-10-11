// Demo accounts and registered accounts live in separate "worlds".
// A demo visitor must never see or touch data that belongs to registered
// accounts, and registered accounts must never see demo data.

export const demoEnabled = () => process.env.DEMO_MODE === "true";
// The administrator can show or hide demo sign-in from the admin workspace.
// Without a saved choice, the DEMO_MODE environment variable decides.
export function demoActive(state) {
  const saved = state?.settings?.demoLogin;
  return typeof saved === "boolean" ? saved : demoEnabled();
}

export function isDemoUser(state, userId) {
  return !!(state.users || []).find((u) => u.id === userId)?.demo;
}

// True when the record owned by `ownerId` belongs to the same world as `user`.
// Records without a known owner are treated as public (legacy data).
export function sameWorld(state, user, ownerId) {
  if (!ownerId || !(state.users || []).some((u) => u.id === ownerId)) return true;
  return isDemoUser(state, ownerId) === !!user.demo;
}

export function shipmentWorld(state, user, shipment) {
  return !!shipment && sameWorld(state, user, shipment.ownerId);
}
