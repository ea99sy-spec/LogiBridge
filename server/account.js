import { randomBytes, createHash } from "node:crypto";
import { readState, mutate } from "./store.js";
import { hashPassword, checkPassword } from "./identity.js";
import { queueEmail, mailConfigured, flushEmails } from "./email.js";

const hash = (v) => createHash("sha256").update(String(v)).digest("hex");
const RESET_MINUTES = 60;

function siteUrl() {
  return (process.env.URL || process.env.SITE_URL || "https://logibridge-ea99sy.netlify.app").replace(
    /\/$/,
    "",
  );
}

// Routes that work without signing in: "forgot password" and "reset password".
export function publicAccountRoutes(app, { authLimit, txt }) {
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
