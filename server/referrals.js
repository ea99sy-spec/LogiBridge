import { createHash } from "node:crypto";
import { notice } from "./advanced.js";

// "Invite a company, earn a free month": every account has a short invite code. When an invited
// company account is approved, the inviter gets one more free month (up to MAX_REWARD months).
export const MAX_REWARD = 12;
export const referralCode = (userId) =>
  createHash("sha256")
    .update("lb-ref:" + userId)
    .digest("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();

export function inviterFor(s, code) {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(c)) return null;
  return s.users.find((u) => !u.demo && u.role !== "admin" && referralCode(u.id) === c) || null;
}

// Called when an account is approved: reward its inviter once.
export function rewardReferral(s, approved) {
  if (approved.demo || !approved.referredBy || approved.referralRewarded) return;
  if (approved.accountType === "individual") return; // only company accounts earn a month
  const inviter = s.users.find((u) => u.id === approved.referredBy && !u.demo);
  if (!inviter) return;
  approved.referralRewarded = new Date().toISOString();
  inviter.subscription ||= {};
  const months = inviter.subscription.rewardMonths || 0;
  if (months >= MAX_REWARD) return;
  inviter.subscription.rewardMonths = months + 1;
  notice(s, inviter.id, "referral_reward", undefined, approved.name);
}

export function referralState(s, user) {
  if (user.demo || user.role === "admin") return null;
  const invited = s.users.filter((u) => u.referredBy === user.id);
  return {
    code: referralCode(user.id),
    invited: invited.length,
    joined: invited.filter((u) => u.referralRewarded).length,
    months: user.subscription?.rewardMonths || 0,
    max: MAX_REWARD,
  };
}
