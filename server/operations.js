import { randomUUID } from "node:crypto";
import { crossings, crossingKeys } from "../shared/crossings.js";
import { queueEmail, adminRecipient, mailConfigured } from "./email.js";
import { whatsappConfigured, waNumber } from "./whatsapp.js";
import { verifyTaxId } from "./tax.js";
import { announceCompany } from "./profiles.js";
import { demoActive } from "./world.js";
import { notice } from "./advanced.js";
import { publicUser, validateDocument, encryptDocument, decryptDocument } from "./identity.js";
import { readPosition } from "./position.js";
import { recordPosition } from "./tracking.js";
import { readState, mutate, id } from "./store.js";
import { requiresApproval } from "../shared/access.js";
import { subscriptionOf, addMonths, pricingOf } from "../shared/subscription.js";
const text = (value, max = 300) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid text");
  return value.trim();
};
const canSee = (user, shipment) =>
  user.role === "admin" || [shipment.ownerId, shipment.carrierId].includes(user.id);
export function operationRoutes(app) {
  app.patch("/api/orders/:id/status", async (req, res) => {
    if (req.user.role !== "supplier") return res.status(403).json({ error: "Forbidden" });
    await mutate((s) => {
      if (!s.flags.marketplace) throw new Error("Feature disabled");
      const order = s.orders.find((o) => o.id === req.params.id),
        product = s.products.find((p) => p.id === order?.productId);
      if (!order || product?.supplierId !== req.user.id) throw new Error("Order unavailable");
      const allowed = { demo_reserved: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"] };
      if (!allowed[order.status]?.includes(req.body.status)) throw new Error("Invalid order transition");
      order.status = req.body.status;
      order.updatedAt = new Date().toISOString();
      notice(s, order.userId, "order_update");
      queueEmail(s, order.userId, "order_update", { product: product.title, status: order.status });
    });
    res.json({ ok: true });
  });
  app.get("/api/admin/accounts", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const s = readState();
    res.json(
      s.users
        .filter((u) => u.role !== "admin" && !!u.demo === !!req.user.demo)
        .map((u) => ({
          ...publicUser(u),
          disabled: !!u.disabled,
          createdAt: u.createdAt || null,
          taxId: !req.user.demo || u.demo ? u.taxId || null : null,
          taxCheck: !req.user.demo || u.demo ? u.taxCheck || null : null,
          details: !req.user.demo || u.demo ? u.details || {} : {},
          ...(!req.user.demo || u.demo ? { email: u.email } : {}),
          shipmentCount: s.shipments.filter((sh) => sh.ownerId === u.id || sh.carrierId === u.id).length,
          applicationCount: s.kyb.filter((d) => d.userId === u.id && (!req.user.demo || u.demo)).length,
          subscription: subscriptionOf(s, u),
          rejectionReason:
            u.verificationStatus === "rejected" && (!req.user.demo || u.demo)
              ? u.review?.reason ||
                s.kyb.filter((d) => d.userId === u.id && d.status === "rejected").at(-1)?.review?.reason ||
                ""
              : "",
        })),
    );
  });
  app.get("/api/admin/accounts/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const s = readState(),
      account = s.users.find((u) => u.id === req.params.id && u.role !== "admin");
    if (!account) return res.sendStatus(404);
    if (req.user.demo && !account.demo)
      return res.status(403).json({ error: "A registered administrator is required" });
    res.json({
      account: publicUser(account, true),
      applications: s.kyb
        .filter((d) => d.userId === account.id)
        .map(({ encryptedContent, content, ...d }) => d),
      shipments: s.shipments
        .filter((sh) => [sh.ownerId, sh.carrierId].includes(account.id))
        .map(({ privateDetails, ...sh }) => sh),
    });
  });
  const realAdmin = (req, res) => {
    if (req.user.role === "admin" && !req.user.demo) return true;
    res.status(403).json({ error: "A registered administrator is required" });
    return false;
  };
  // Full copy of the platform data for safekeeping (registered administrator only).
  app.get("/api/admin/backup", (req, res) => {
    if (!realAdmin(req, res)) return;
    const day = new Date().toISOString().slice(0, 10);
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="logibridge-backup-${day}.json"`);
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), state: readState() }));
  });
  // Platform settings the owner controls from the admin workspace.
  app.get("/api/admin/settings", (req, res) => {
    if (!realAdmin(req, res)) return;
    const s = readState();
    res.json({
      demoLogin: demoActive(s),
      requireEmailVerification: s.settings?.requireEmailVerification === true,
      activityEmails: s.settings?.activityEmails !== false,
      notifyEmail: s.settings?.notifyEmail || "",
      adminWhatsapp: s.settings?.adminWhatsapp || "",
      enforceSubscription: s.settings?.enforceSubscription === true,
      pricing: pricingOf(s),
      whatsappConfigured: whatsappConfigured(),
      recipient: adminRecipient(s),
      emailConfigured: mailConfigured(),
    });
  });
  app.put("/api/admin/settings", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const b = req.body;
    for (const k of ["demoLogin", "activityEmails", "requireEmailVerification", "enforceSubscription"])
      if (k in b && typeof b[k] !== "boolean") throw new Error("Invalid request");
    let notifyEmail;
    if ("notifyEmail" in b) {
      notifyEmail = String(b.notifyEmail || "")
        .trim()
        .toLowerCase();
      if (notifyEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail) || notifyEmail.length > 254))
        throw new Error("Invalid email");
    }
    let pricing;
    if ("pricing" in b) {
      const p = b.pricing || {};
      if (typeof p.visible !== "boolean") throw new Error("Invalid request");
      const prices = {};
      for (const k of ["merchant", "carrier", "broker", "supplier", "individual"]) {
        const v = Number(p.prices?.[k]);
        if (!Number.isFinite(v) || v < 0 || v > 10000) throw new Error("Invalid request");
        prices[k] = Math.round(v * 100) / 100;
      }
      pricing = { visible: p.visible, prices };
    }
    let adminWhatsapp;
    if ("adminWhatsapp" in b) {
      adminWhatsapp = String(b.adminWhatsapp || "").trim();
      if (adminWhatsapp && !waNumber(adminWhatsapp)) throw new Error("Invalid phone number");
    }
    await mutate((s) => {
      s.settings ||= {};
      if (adminWhatsapp !== undefined) s.settings.adminWhatsapp = adminWhatsapp;
      if (pricing) s.settings.pricing = pricing;
      if ("demoLogin" in b) s.settings.demoLogin = b.demoLogin;
      if ("activityEmails" in b) s.settings.activityEmails = b.activityEmails;
      if ("requireEmailVerification" in b) s.settings.requireEmailVerification = b.requireEmailVerification;
      if ("enforceSubscription" in b) s.settings.enforceSubscription = b.enforceSubscription;
      if (notifyEmail !== undefined) s.settings.notifyEmail = notifyEmail;
    });
    res.json({ ok: true });
  });
  // Record paid subscription months (manual payment until online payment is added).
  app.post("/api/admin/accounts/:id/subscription", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const months = Number(req.body.months);
    if (!Number.isInteger(months) || months < 1 || months > 24) throw new Error("Invalid request");
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.params.id && x.role !== "admin" && !x.demo);
      if (!u) throw new Error("Account unavailable");
      const now = new Date().toISOString();
      u.subscription ||= { startedAt: now };
      u.subscription.startedAt ||= now;
      const current = subscriptionOf(s, u);
      const from = current.endsAt && current.endsAt > now ? current.endsAt : now;
      u.subscription.paidUntil = addMonths(from, months);
      (u.subscription.payments ||= []).push({ months, at: now, by: req.user.id });
      notice(s, u.id, "subscription_paid", undefined, u.subscription.paidUntil.slice(0, 10));
    });
    res.json({ ok: true });
  });
  // Border and customs notices shown on the public rules page and in every workspace.
  app.post("/api/admin/border-notices", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const b = req.body;
    const field = (v, max, optional) => {
      const value = typeof v === "string" ? v.trim() : "";
      if (!value && !optional) throw new Error("Required field missing");
      if (value.length > max) throw new Error("Text too long");
      return value;
    };
    const item = {
      id: randomUUID(),
      date: field(b.date, 10),
      title: field(b.title, 160),
      body: field(b.body, 1500),
      crossing: field(b.crossing, 20, true),
      source: field(b.source, 300, true),
      level: ["info", "warning"].includes(b.level) ? b.level : "info",
      createdAt: new Date().toISOString(),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date)))
      throw new Error("Invalid date");
    if (item.crossing && !crossingKeys.includes(item.crossing)) throw new Error("Invalid request");
    if (item.source && !/^https?:\/\/[^\s]+$/i.test(item.source))
      throw new Error("Website must use https:// or http://");
    await mutate((s) => {
      s.settings ||= {};
      s.settings.borderNotices = [item, ...(s.settings.borderNotices || [])]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 50);
      // Tell every approved member: in the notification bell, and by email/WhatsApp unless they opted out.
      if (b.notify !== false)
        for (const u of s.users.filter(
          (u) => u.role !== "admin" && !u.demo && !u.disabled && !requiresApproval(u),
        )) {
          notice(s, u.id, "border_notice", undefined, item.title);
          if (u.profile?.borderEmails !== false)
            queueEmail(
              s,
              u.id,
              "border_notice",
              {
                title: item.title,
                body: item.body,
                crossing: item.crossing
                  ? `${crossings[item.crossing].sy} / ${crossings[item.crossing].tr}`
                  : "",
              },
              `border/${item.id}/${u.id}`,
            );
        }
    });
    res.json({ ok: true });
  });
  app.delete("/api/admin/border-notices/:id", async (req, res) => {
    if (!realAdmin(req, res)) return;
    await mutate((s) => {
      s.settings ||= {};
      s.settings.borderNotices = (s.settings.borderNotices || []).filter((n) => n.id !== req.params.id);
    });
    res.json({ ok: true });
  });
  // Crossing congestion reports from carriers and customs brokers (crowd-sourced, expire after a day).
  app.post("/api/crossing-reports", async (req, res) => {
    const b = req.body;
    if (!["carrier", "broker"].includes(req.user.role)) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    if (!crossingKeys.includes(b.crossing)) throw new Error("Invalid request");
    const level = Number(b.level);
    if (![0, 1, 2, 3, 4].includes(level)) throw new Error("Invalid request");
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 280) : "";
    await mutate((s) => {
      const now = new Date().toISOString();
      s.crossingReports = [
        {
          id: randomUUID(),
          crossing: b.crossing,
          level,
          note,
          userId: req.user.id,
          role: req.user.role,
          demo: !!req.user.demo,
          createdAt: now,
        },
        ...(s.crossingReports || []).filter((r) => Date.now() - Date.parse(r.createdAt) < 86400000),
      ].slice(0, 300);
      // Long queues (6 hours or more): warn owners of orders still waiting to cross there.
      if (level >= 3)
        for (const o of s.shipments.filter(
          (sh) =>
            sh.isOrder &&
            sh.crossing === b.crossing &&
            !["delivered", "cancelled"].includes(sh.status) &&
            !!s.users.find((u) => u.id === sh.ownerId)?.demo === !!req.user.demo,
        ))
          if (
            !s.notifications.some(
              (n) =>
                n.userId === o.ownerId &&
                n.event === "crossing_busy" &&
                n.shipmentId === o.id &&
                Date.now() - Date.parse(n.createdAt) < 6 * 3600000,
            )
          )
            notice(s, o.ownerId, "crossing_busy", o.id, note);
    });
    res.status(201).json({ ok: true });
  });
  // Approve or reject an account directly. Until approved, the account cannot use the platform.
  app.post("/api/admin/accounts/:id/review", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const b = req.body;
    if (!["approved", "rejected"].includes(b.status)) throw new Error("Invalid review");
    const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 500) : "";
    if (b.status === "rejected" && !reason) throw new Error("Rejection reason required");
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.params.id && x.role !== "admin" && !x.demo);
      if (!u) throw new Error("Account unavailable");
      const now = new Date().toISOString();
      u.verified = b.status === "approved";
      // The free months start counting when the account is approved.
      if (u.verified && !u.subscription?.startedAt) u.subscription = { ...u.subscription, startedAt: now };
      u.verificationStatus = b.status;
      u.verificationLevel = u.verified ? "admin_approval" : "none";
      u.review = { reviewerId: req.user.id, reviewedAt: now, status: b.status, reason };
      for (const d of s.kyb.filter((d) => d.userId === u.id && d.status === "pending")) {
        d.status = b.status;
        d.review = { reviewerId: req.user.id, reviewedAt: now, reason: reason || null, direct: true };
      }
      notice(s, u.id, "verification_" + b.status, undefined, reason);
      queueEmail(s, u.id, b.status, { reason }, `account-review/${u.id}/${now}`);
      if (u.verified) announceCompany(s, u);
    });
    res.json({ ok: true });
  });
  // Run the tax number check again (check digits, and VIES for EU numbers).
  app.post("/api/admin/accounts/:id/tax-check", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const account = readState().users.find((u) => u.id === req.params.id && !u.demo);
    if (!account?.taxId) throw new Error("Account has no tax number");
    const result = await verifyTaxId(account.details?.country || "TR", account.taxId);
    await mutate((s) => {
      s.users.find((u) => u.id === account.id).taxCheck = result;
    });
    res.json(result);
  });
  // A registered administrator can suspend an abusive account and restore it later.
  app.post("/api/admin/accounts/:id/status", async (req, res) => {
    if (req.user.role !== "admin" || req.user.demo)
      return res.status(403).json({ error: "A registered administrator is required" });
    if (typeof req.body.disabled !== "boolean") throw new Error("Invalid request");
    await mutate((s) => {
      const u = s.users.find((x) => x.id === req.params.id && x.role !== "admin" && !x.demo);
      if (!u) throw new Error("Account unavailable");
      u.disabled = req.body.disabled;
      if (u.disabled) u.sessionsValidAfter = Date.now();
    });
    res.json({ ok: true });
  });
  app.post("/api/shipments/:id/submit", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id && x.ownerId === req.user.id);
      if (!sh) throw Error("Shipment unavailable");
      if (sh.submittedAt) return;
      if (!s.shipmentDocuments.some((d) => d.shipmentId === sh.id))
        throw Error("Upload shipment documents first");
      sh.submittedAt = new Date().toISOString();
      queueEmail(s, req.user.id, "shipment_submitted", { shipment: sh.title }, `shipment/${sh.id}`);
    });
    res.json({ ok: true, completed: true });
  });
  app.post("/api/shipment-documents", async (req, res) => {
    const b = req.body;
    validateDocument(b);
    if (!["invoice", "packing", "origin", "transport", "customs", "other"].includes(b.kind))
      throw new Error("Invalid document kind");
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === b.shipmentId);
      if (!sh || ![sh.ownerId, sh.carrierId].includes(req.user.id)) throw new Error("Shipment unavailable");
      s.shipmentDocuments.push({
        id: id(),
        shipmentId: sh.id,
        userId: req.user.id,
        kind: b.kind,
        filename: text(b.filename),
        mime: b.mime,
        encryptedContent: encryptDocument(b.content),
        createdAt: new Date().toISOString(),
      });
    });
    res.status(201).json({ ok: true });
  });
  app.get("/api/shipment-documents/:id", (req, res) => {
    const s = readState(),
      doc = s.shipmentDocuments.find((x) => x.id === req.params.id),
      sh = s.shipments.find((x) => x.id === doc?.shipmentId);
    if (!doc || !sh) return res.sendStatus(404);
    if (!canSee(req.user, sh) || (req.user.demo && !s.users.find((u) => u.id === doc.userId)?.demo))
      return res.sendStatus(403);
    res.set("Content-Type", doc.mime).set("Content-Disposition", 'attachment; filename="shipment-document"');
    res.send(decryptDocument(doc.encryptedContent));
  });
  app.post("/api/shipments/:id/location", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id);
      if (!sh || req.user.id !== sh.carrierId || !["assigned", "transit", "arrived"].includes(sh.status))
        throw new Error("Assigned carrier required");
      const position = readPosition(req.body);
      const location =
          position && !String(req.body.location || "").trim()
            ? `GPS ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
            : text(req.body.location, 120),
        note = req.body.note ? text(req.body.note, 500) : "";
      if (position) recordPosition(s, sh, position, req.body.at, req.user.id, "carrier_gps");
      s.trackingEvents.push({
        id: id(),
        shipmentId: sh.id,
        actorId: req.user.id,
        event: "location_update",
        location,
        note,
        source: position ? "carrier_gps" : "carrier_manual",
        ...(position ? { position } : {}),
        createdAt: new Date().toISOString(),
      });
      sh.lastLocation = location;
    });
    res.json({ ok: true });
  });
}
