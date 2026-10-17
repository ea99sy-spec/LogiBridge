import { randomBytes, createHash } from "node:crypto";
import { readState, mutate, id } from "./store.js";
import { hashPassword } from "./identity.js";

// Team accounts: a company invites its employees, each with their own email and password and a
// role. A member works inside the company's account (same shipments, documents, messages), within
// the limits of the role:
//   manager    — everything except managing the team and the owner's password / 2FA
//   operations — daily work; no account settings, verification, team or subscription payments
//   viewer     — read only
export const TEAM_ROLES = ["manager", "operations", "viewer"];
const INVITE_DAYS = 7;
const hash = (v) => createHash("sha256").update(v).digest("hex");
const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

export const publicMember = (m) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  teamRole: m.teamRole,
  disabled: !!m.disabled,
  invited: !m.credential,
  createdAt: m.createdAt,
  lastLoginAt: m.lastLoginAt || null,
});

// Paths (after /api) a member may not use with a write request, by role.
export function memberBlocked(member, method, path) {
  if (!member) return false;
  const always = ["/logout", "/notifications/read"];
  if (always.includes(path)) return false;
  if (/^\/team(\/|$)/.test(path)) return true;
  if (/^\/account\/(password|2fa|document-privacy)/.test(path)) return true;
  if (method === "GET") return false;
  if (member.teamRole === "viewer") return true;
  if (member.teamRole === "operations") return /^\/(account|kyb|profile|subscription)(\/|$)/.test(path);
  return false;
}

export function teamRoutes(app, { sessionFor }) {
  const owner = (req) => {
    if (req.member)
      throw Object.assign(new Error("Only the account owner can manage the team"), { status: 403 });
    if (req.user.demo || req.user.role === "admin" || req.user.accountType === "individual")
      throw Object.assign(new Error("Team accounts are for companies"), { status: 403 });
  };
  app.get("/api/team", (req, res) => {
    owner(req);
    res.json({
      members: (readState().teamMembers || []).filter((m) => m.companyId === req.user.id).map(publicMember),
    });
  });
  app.post("/api/team", async (req, res) => {
    owner(req);
    const name = text(req.body?.name, 120),
      email = text(req.body?.email, 254).toLowerCase(),
      teamRole = req.body?.teamRole;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    if (!TEAM_ROLES.includes(teamRole)) throw new Error("Invalid request");
    const token = randomBytes(32).toString("hex");
    await mutate((s) => {
      s.teamMembers ||= [];
      if (s.users.some((u) => u.email === email) || s.teamMembers.some((m) => m.email === email))
        throw new Error("Email already registered");
      if (s.teamMembers.filter((m) => m.companyId === req.user.id).length >= 25)
        throw new Error("Team is full");
      s.teamMembers.push({
        id: id(),
        companyId: req.user.id,
        name,
        email,
        teamRole,
        credential: null,
        inviteHash: hash(token),
        inviteExpires: Date.now() + INVITE_DAYS * 86400000,
        createdAt: new Date().toISOString(),
      });
    });
    res.status(201).json({ ok: true, link: `/team-invite#${token}` });
  });
  // New invite link (first sign-in or a forgotten password); the old password stops working.
  app.post("/api/team/:id/link", async (req, res) => {
    owner(req);
    const token = randomBytes(32).toString("hex");
    await mutate((s) => {
      const m = (s.teamMembers || []).find((x) => x.id === req.params.id && x.companyId === req.user.id);
      if (!m) throw new Error("Member unavailable");
      m.inviteHash = hash(token);
      m.inviteExpires = Date.now() + INVITE_DAYS * 86400000;
      m.credential = null;
      m.sessionsValidAfter = Date.now();
    });
    res.json({ ok: true, link: `/team-invite#${token}` });
  });
  app.put("/api/team/:id", async (req, res) => {
    owner(req);
    const b = req.body || {};
    if (b.teamRole !== undefined && !TEAM_ROLES.includes(b.teamRole)) throw new Error("Invalid request");
    if (b.disabled !== undefined && typeof b.disabled !== "boolean") throw new Error("Invalid request");
    await mutate((s) => {
      const m = (s.teamMembers || []).find((x) => x.id === req.params.id && x.companyId === req.user.id);
      if (!m) throw new Error("Member unavailable");
      if (b.teamRole) m.teamRole = b.teamRole;
      if (b.disabled !== undefined) m.disabled = b.disabled;
    });
    res.json({ ok: true });
  });
  app.delete("/api/team/:id", async (req, res) => {
    owner(req);
    await mutate((s) => {
      const before = (s.teamMembers || []).length;
      s.teamMembers = (s.teamMembers || []).filter(
        (x) => !(x.id === req.params.id && x.companyId === req.user.id),
      );
      if (s.teamMembers.length === before) throw new Error("Member unavailable");
    });
    res.json({ ok: true });
  });
}

// Public: the employee opens the invite link and chooses a password, then is signed in.
export function teamInviteRoute(app, { sessionFor, authLimit }) {
  app.post("/api/team/accept", authLimit, async (req, res) => {
    const token = String(req.body?.token || "");
    const credential = await hashPassword(req.body?.password);
    let member, company;
    await mutate((s) => {
      member = (s.teamMembers || []).find(
        (m) => token && m.inviteHash === hash(token) && m.inviteExpires > Date.now() && !m.disabled,
      );
      if (!member) throw new Error("Invite link expired or already used");
      company = s.users.find((u) => u.id === member.companyId && !u.disabled);
      if (!company) throw new Error("Account unavailable");
      member.credential = credential;
      delete member.inviteHash;
      delete member.inviteExpires;
      member.lastLoginAt = new Date().toISOString();
    });
    await sessionFor(company, res, true, member.id);
  });
}
