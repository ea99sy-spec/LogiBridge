import { readState, mutate } from "./store.js";
import { requiresApproval } from "../shared/access.js";
import { queueEmail, mailConfigured, flushEmails } from "./email.js";
const text = (v, max) => {
  if (typeof v !== "string" || v.length > max) throw Error("Invalid profile");
  return v.trim();
};
export function profileRoutes(app) {
  app.put("/api/profile", async (req, res) => {
    const b = req.body;
    if (typeof b.companyEmails !== "boolean") throw Error("Invalid email preference");
    const company = req.user.accountType !== "individual";
    const profile = {
      about: text(b.about, 2000),
      services: text(b.services, 2000),
      website: text(b.website || "", 300),
      location: text(b.location || "", 120),
      contactEmail: text(b.contactEmail || "", 254).toLowerCase(),
      contactPhone: text(b.contactPhone || "", 30),
      companyEmails: b.companyEmails,
      whatsappNotify: b.whatsappNotify === true,
    };
    if (!profile.about || !profile.services) throw Error("Required field missing");
    if (profile.website && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(profile.website))
      throw Error("Website must use https:// or http://");
    // Companies show a contact email on their profile page (members only).
    if (company && !profile.contactEmail) throw Error("Contact email required");
    if (profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail))
      throw Error("Invalid email");
    if (profile.contactPhone && !/^\+?[0-9 ()-]{6,30}$/.test(profile.contactPhone))
      throw Error("Invalid phone number");
    // Optional logo: a small PNG/JPEG prepared (resized) in the browser.
    let logo;
    if (b.logo === null) logo = null;
    else if (typeof b.logo === "string" && b.logo) {
      const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(b.logo);
      if (!m || Buffer.from(m[2], "base64").length > 150000)
        throw Error("Logo must be a PNG or JPEG under 150 KB");
      logo = b.logo;
    }
    await mutate((s) => {
      const u = s.users.find((u) => u.id === req.user.id);
      u.profile = { ...profile, logo: logo === undefined ? u.profile?.logo || null : logo };
      if (!requiresApproval(u)) announceCompany(s, u);
    });
    res.json({ ok: true });
  });
  app.get("/api/directory", (req, res) => {
    const s = readState();
    // Reputation shown on each card: average stars, number of reviews and closed operations.
    const reputation = (id) => {
      const scores = s.ratings.filter((r) => r.targetId === id).map((r) => r.score);
      return {
        rating: scores.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null,
        reviews: scores.length,
        completed: s.shipments.filter(
          (sh) => sh.status === "delivered" && (sh.ownerId === id || sh.carrierId === id),
        ).length,
        recent: s.ratings
          .filter((r) => r.targetId === id && r.comment)
          .slice(-2)
          .map((r) => ({ score: r.score, comment: r.comment.slice(0, 200) })),
      };
    };
    res.json(
      s.users
        .filter(
          (u) => u.role !== "admin" && !requiresApproval(u) && !u.disabled && !!u.demo === !!req.user.demo,
        )
        .map((u) => ({
          id: u.id,
          name: u.name,
          accountType: u.accountType,
          verified: u.verified,
          ...reputation(u.id),
          routes: u.accountType === "carrier" ? u.details?.routes || "" : "",
          fleetSize: u.accountType === "carrier" ? u.details?.fleetSize || null : null,
          logo: u.profile?.logo || null,
          profile: {
            about: u.profile?.about || "",
            services: u.profile?.services || "",
            location: u.profile?.location || "",
            website: u.profile?.website || "",
          },
        })),
    );
  });
  // Full profile page of one company or person, visible to approved members only.
  app.get("/api/companies/:id", (req, res) => {
    const s = readState();
    const u = s.users.find(
      (x) =>
        x.id === req.params.id &&
        x.role !== "admin" &&
        !x.disabled &&
        !requiresApproval(x) &&
        !!x.demo === !!req.user.demo,
    );
    if (!u) return res.status(404).json({ error: "Profile unavailable" });
    const d = u.details || {};
    const reviews = s.ratings
      .filter((r) => r.targetId === u.id)
      .map((r) => ({
        score: r.score,
        comment: r.comment || "",
        by: s.users.find((x) => x.id === r.userId)?.name || "",
        at: r.createdAt || null,
      }))
      .reverse();
    const scores = reviews.map((r) => r.score);
    res.json({
      id: u.id,
      name: u.name,
      accountType: u.accountType,
      verified: !!u.verified,
      memberSince: u.createdAt || null,
      logo: u.profile?.logo || null,
      profile: {
        about: u.profile?.about || "",
        services: u.profile?.services || "",
        location: u.profile?.location || "",
        website: u.profile?.website || "",
        contactEmail: u.profile?.contactEmail || "",
        contactPhone: u.profile?.contactPhone || "",
      },
      // Business details only; tax number, login email and documents stay private.
      details: {
        country: d.country || "",
        city: d.city || "",
        activity: d.activity || "",
        products: d.products || "",
        routes: d.routes || "",
        fleetSize: d.fleetSize || null,
        equipment: d.equipment || "",
        warehouse: d.warehouse || "",
        crossings: Array.isArray(d.crossings) ? d.crossings : [],
        license: u.accountType === "broker" ? d.license || "" : "",
      },
      rating: scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null,
      reviews: reviews.slice(0, 20),
      reviewCount: reviews.length,
      completed: s.shipments.filter(
        (sh) => sh.status === "delivered" && (sh.ownerId === u.id || sh.carrierId === u.id),
      ).length,
      products: u.accountType === "supplier" ? s.products.filter((p) => p.supplierId === u.id) : [],
      groups:
        u.accountType === "carrier"
          ? s.groups.filter((g) => g.carrierId === u.id && g.date >= new Date().toISOString().slice(0, 10))
          : [],
    });
  });
  app.get("/api/admin/email-status", (req, res) => {
    if (req.user.role !== "admin" || req.user.demo) return res.sendStatus(403);
    const s = readState();
    res.json({
      configured: mailConfigured(),
      supportEmail: s.supportEmail || "",
      counts: Object.fromEntries(
        ["pending", "sending", "sent", "failed"].map((k) => [
          k,
          (s.emailOutbox || []).filter((x) => x.status === k).length,
        ]),
      ),
    });
  });
  app.put("/api/admin/contact", async (req, res) => {
    if (req.user.role !== "admin" || req.user.demo) return res.sendStatus(403);
    const email = text(req.body.email, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Invalid email");
    await mutate((s) => {
      s.supportEmail = email;
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/emails/retry", async (req, res) => {
    if (req.user.role !== "admin" || req.user.demo) return res.sendStatus(403);
    await mutate((s) => {
      for (const p of s.emailOutbox || [])
        if (p.status === "failed") {
          p.status = "pending";
          p.attempts = 0;
          delete p.nextAttempt;
        }
    });
    res.json(await flushEmails());
  });
}
export function announceCompany(s, owner) {
  if (owner.accountType === "individual" || owner.demo || owner.announcedAt || !owner.profile?.services)
    return;
  owner.announcedAt = new Date().toISOString();
  for (const u of s.users.filter(
    (u) => u.id !== owner.id && u.role !== "admin" && u.accountType !== "individual" && !requiresApproval(u),
  ))
    queueEmail(
      s,
      u.id,
      "company_joined",
      { company: owner.name, about: owner.profile.about, services: owner.profile.services },
      `company/${owner.id}/${u.id}`,
    );
}
