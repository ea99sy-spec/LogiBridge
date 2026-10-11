import { randomBytes, createHash } from "node:crypto";
import { readState, mutate } from "./store.js";
import { hashPassword, checkPassword, encryptDocument, decryptDocument } from "./identity.js";
import { newSecret, verifyTotp, newBackupCodes, useBackupCode } from "./totp.js";
import { queueEmail, mailConfigured, flushEmails } from "./email.js";

const hash = (v) => createHash("sha256").update(String(v)).digest("hex");
const RESET_MINUTES = 60;

function siteUrl() {
  return (process.env.URL || process.env.SITE_URL || "https://logibridge-ea99sy.netlify.app").replace(
    /\/$/,
    "",
  );
}

// Email confirmation: a one-time link sent after registration.
export function queueEmailVerification(s, user) {
  const token = randomBytes(32).toString("hex");
  user.emailVerified = false;
  user.emailVerifyHash = hash(token);
  user.emailVerifyExpires = new Date(Date.now() + 3 * 86400000).toISOString();
  queueEmail(
    s,
    user.id,
    "verify_email",
    { url: `${siteUrl()}/verify-email#${token}` },
    `verify/${user.emailVerifyHash}`,
  );
}
export const emailVerificationRequired = (s, user) =>
  s.settings?.requireEmailVerification === true &&
  user.emailVerified === false &&
  !user.demo &&
  user.role !== "admin";

// Routes that work without signing in: "forgot password" and "reset password".
export function publicAccountRoutes(app, { authLimit, txt }) {
  app.post("/api/auth/verify-email", authLimit, async (req, res) => {
    const token = String(req.body.token || "");
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Verification link invalid or expired");
    await mutate((s) => {
      const u = s.users.find(
        (x) => x.emailVerifyHash === hash(token) && Date.parse(x.emailVerifyExpires) > Date.now(),
      );
      if (!u) throw new Error("Verification link invalid or expired");
      u.emailVerified = true;
      u.emailVerifiedAt = new Date().toISOString();
      delete u.emailVerifyHash;
      delete u.emailVerifyExpires;
    });
    res.json({ ok: true });
  });
  app.post("/api/auth/forgot", authLimit, async (req, res) => {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Invalid email");
    const configured = mailConfigured();
    if (configured) {
      const token = randomBytes(32).toString("hex");
      await mutate((s) => {
        const user = s.users.find((u) => u.email === email && !u.demo && u.credential);
        if (!user) return;
        s.passwordResets ||= [];
        const now = Date.now();
        // Keep the list small and allow only a few requests per hour per account.
        s.passwordResets = s.passwordResets.filter((r) => Date.parse(r.expiresAt) > now - 86400000);
        const recent = s.passwordResets.filter(
          (r) => r.userId === user.id && Date.parse(r.createdAt) > now - 3600000,
        );
        if (recent.length >= 3) return;
        s.passwordResets.push({
          userId: user.id,
          tokenHash: hash(token),
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + RESET_MINUTES * 60000).toISOString(),
          used: false,
        });
        queueEmail(s, user.id, "password_reset", { url: `${siteUrl()}/reset-password#${token}` });
      });
      flushEmails(2).catch(() => {});
    }
    // Same answer whether or not the email exists, so accounts cannot be discovered.
    res.json({ ok: true, emailConfigured: configured, supportEmail: readState().supportEmail || "" });
  });

  app.post("/api/auth/reset", authLimit, async (req, res) => {
    const token = String(req.body.token || "");
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Reset link invalid or expired");
    const credential = await hashPassword(req.body.password);
    await mutate((s) => {
      const entry = (s.passwordResets || []).find(
        (r) => r.tokenHash === hash(token) && !r.used && Date.parse(r.expiresAt) > Date.now(),
      );
      const user = s.users.find((u) => u.id === entry?.userId);
      if (!entry || !user) throw new Error("Reset link invalid or expired");
      entry.used = true;
      for (const r of s.passwordResets) if (r.userId === user.id) r.used = true;
      user.credential = credential;
      user.sessionsValidAfter = Date.now();
      queueEmail(s, user.id, "password_changed");
    });
    res.json({ ok: true });
  });
}

// Routes for a signed-in account.
export function privateAccountRoutes(app, { sessionFor }) {
  app.post("/api/account/resend-verification", async (req, res) => {
    if (req.user.emailVerified !== false) return res.json({ ok: true, alreadyVerified: true });
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.user.id);
      const recent = (s.emailOutbox || []).filter(
        (m) =>
          m.userId === u.id && m.event === "verify_email" && Date.parse(m.createdAt) > Date.now() - 600000,
      );
      if (recent.length >= 2) throw new Error("Too many attempts. Try again later.");
      queueEmailVerification(s, u);
    });
    flushEmails(1).catch(() => {});
    res.json({ ok: true, emailConfigured: mailConfigured() });
  });
  app.post("/api/account/password", async (req, res) => {
    if (req.user.demo || !req.user.credential)
      return res.status(403).json({ error: "Demo accounts cannot change passwords" });
    if (!(await checkPassword(req.body.currentPassword, req.user.credential)))
      return res.status(400).json({ error: "Current password is incorrect" });
    if (req.body.currentPassword === req.body.newPassword) throw new Error("New password must be different");
    const credential = await hashPassword(req.body.newPassword);
    const user = await mutate((s) => {
      const u = s.users.find((x) => x.id === req.user.id);
      u.credential = credential;
      // Sign out every other device; this one gets a fresh session below.
      u.sessionsValidAfter = Date.now();
      queueEmail(s, u.id, "password_changed");
      return u;
    });
    await new Promise((r) => setTimeout(r, 2));
    await sessionFor(user, res);
  });
}

// Two-factor secrets are stored encrypted with the same key as uploaded documents.
export const sealSecret = (secret) => encryptDocument(Buffer.from(secret).toString("base64"));
export const openSecret = (sealed) => decryptDocument(sealed).toString();

// Checks a code from the authenticator app, or a one-time backup code.
// Returns "totp", "backup" or null; a used backup code is removed by the caller via `index`.
export function checkSecondFactor(user, code) {
  if (!user.totp) return null;
  if (verifyTotp(openSecret(user.totp.secret), code)) return { kind: "totp" };
  const index = useBackupCode(user.totp.backup || [], code);
  return index >= 0 ? { kind: "backup", index } : null;
}

export function twoFactorRoutes(app) {
  app.post("/api/account/2fa/setup", async (req, res) => {
    if (req.user.demo || !req.user.credential)
      return res.status(403).json({ error: "Demo accounts cannot change passwords" });
    if (!(await checkPassword(req.body.password, req.user.credential)))
      return res.status(400).json({ error: "Current password is incorrect" });
    const secret = newSecret();
    await mutate((s) => {
      s.users.find((u) => u.id === req.user.id).totpPending = sealSecret(secret);
    });
    const label = encodeURIComponent(`LogiBridge:${req.user.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=LogiBridge&digits=6&period=30`;
    const { default: QRCode } = await import("qrcode");
    res.json({ secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
  });
  app.post("/api/account/2fa/enable", async (req, res) => {
    const { codes, hashes } = newBackupCodes();
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.user.id);
      if (!u.totpPending) throw new Error("Start two-factor setup again");
      if (!verifyTotp(openSecret(u.totpPending), req.body.code)) throw new Error("Invalid two-factor code");
      u.totp = { secret: u.totpPending, backup: hashes, enabledAt: new Date().toISOString() };
      delete u.totpPending;
    });
    res.json({ ok: true, backupCodes: codes });
  });
  app.post("/api/account/2fa/disable", async (req, res) => {
    if (!(await checkPassword(req.body.password, req.user.credential)))
      return res.status(400).json({ error: "Current password is incorrect" });
    if (!checkSecondFactor(req.user, req.body.code)) throw new Error("Invalid two-factor code");
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.user.id);
      delete u.totp;
      delete u.totpPending;
    });
    res.json({ ok: true });
  });
}
