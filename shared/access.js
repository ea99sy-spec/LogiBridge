// Every registered account (company or individual) needs the administrator's
// approval before it can use the platform. Demo accounts and administrators are exempt.
export const requiresApproval = (user) =>
  !!user && user.demo === false && user.role !== "admin" && !user.verified;
