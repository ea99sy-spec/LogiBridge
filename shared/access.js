export const requiresApproval=user=>!!user&&user.demo===false&&user.role!=='admin'&&user.accountType!=='individual'&&!user.verified;
