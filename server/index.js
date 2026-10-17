import express from "express";
import { randomBytes } from "node:crypto";
import { createClient } from "redis";
import { initialize, readState, mutate, id } from "./store.js";
import { splitCrossBorder } from "../shared/crossings.js";
import {
  syncOrder,
  cancelOrder,
  acceptBid,
  reserveGroup,
  transitionShipment,
  optionalFeatures,
  positive,
  crossingDocuments,
} from "./domain.js";
import {
  hashPassword,
  checkPassword,
  publicUser,
  validateDocument,
  encryptDocument,
  decryptDocument,
  validFutureDate,
} from "./identity.js";
import { validCountry } from "../shared/countries.js";
import { operationRoutes } from "./operations.js";
import { routeDetails } from "../shared/routes.js";
import { visibleShipments, vendorOrders } from "../shared/workspaces.js";
import {
  advancedRoutes,
  publicAdvancedRoutes,
  advancedState,
  integrationAuth,
  notice,
  shipmentNotice,
  matchRoutes,
} from "./advanced.js";

import { cloudEnabled, writeSession, readSession, deleteSession } from "./cloud-store.js";
import { paymentRoutes, paymentState } from "./payments.js";
import { requiresApproval } from "../shared/access.js";
import { queueEmail, queueAdminEmail, mailConfigured, flushEmails } from "./email.js";
import { whatsappConfigured, flushWhatsApp } from "./whatsapp.js";
import { subscriptionOf, pricingOf } from "../shared/subscription.js";
import { publicStats } from "./stats.js";
import { noteRoutes } from "./notes.js";
import { reputationMap } from "./insights.js";
import { priceIndexRoutes } from "./priceIndex.js";
import { returnTripRoutes, visibleTrips } from "./returnTrips.js";
import { commercialRoutes } from "./commercial.js";
import { driverRoutes, driversFor, driverInfo } from "./drivers.js";
import { sharedTruckRoutes, sharedMatches, suggestSharing } from "./sharedTruck.js";
import { paytrPublicRoutes, paytrRoutes } from "./paytr.js";
import { growthRoutes } from "./growth.js";
import { buildShipment, insertShipment } from "./shipmentFactory.js";
import { recurringRoutes, recurringFor, runRecurringWatch } from "./recurring.js";
import { monthlyReportRoutes, runMonthlyWatch } from "./monthlyReport.js";
import { publicPageRoutes, seoRoutes, companySlug } from "./publicPages.js";
import { teamRoutes, teamInviteRoute, memberBlocked } from "./team.js";
import { crossingTimes } from "../shared/crossingTimes.js";
import { crossingKeys } from "../shared/crossings.js";
import { inviterFor, rewardReferral, referralState } from "./referrals.js";
import { checkGoods, prohibitedRules } from "../shared/prohibited.js";
import { feedbackRoutes } from "./feedback.js";
import { documentRoutes, documentVisible, requestVisible } from "./documents.js";
import { accountsReportRoutes } from "./accountsReport.js";
import { TERMS_VERSION, termsOutdated } from "../shared/legal.js";
import { trackingRoutes, publicTrackingRoutes, newDeliveryCode, runTrackingWatch } from "./tracking.js";
import { profileRoutes, announceCompany } from "./profiles.js";
import {
  publicAccountRoutes,
  privateAccountRoutes,
  twoFactorRoutes,
  checkSecondFactor,
  queueEmailVerification,
  emailVerificationRequired,
} from "./account.js";
import { readDetails } from "./details.js";
import { verifyTaxId } from "./tax.js";
import { normalizeTaxId } from "../shared/tax.js";
import { demoEnabled, demoActive, sameWorld, shipmentWorld, isDemoUser } from "./world.js";
// Recent congestion reports, without who sent them (demo reports stay in the demo world).
function crossingReports(s, demo) {
  return (s.crossingReports || [])
    .filter((r) => !!r.demo === demo && Date.now() - Date.parse(r.createdAt) < 86400000)
    .map(({ id, crossing, level, note, role, createdAt }) => ({
      id,
      crossing,
      level,
      note,
      role,
      createdAt,
    }));
}
export async function createApp() {
  await initialize();
  const app = express();
  const sessions = new Map();
  if (process.env.LOGIBRIDGE_SERVERLESS === "true" || process.env.TRUST_PROXY === "true")
    app.set("trust proxy", 1);
  // Demo sign-in follows the administrator's switch (default: DEMO_MODE variable).
  const DEMO_NOW = () => demoActive(readState());
  let redis;
  if (process.env.REDIS_URL) {
    redis = createClient({ url: process.env.REDIS_URL });
    redis.on("error", (e) => console.error("Redis:", e.message));
    await redis.connect();
  }
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4mb" }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.get("host")}`
    )
      return res.status(403).json({ error: "Origin rejected" });
    next();
  });
  const authAttempts = new Map();
  function authLimit(req, res, next) {
    const key = req.ip,
      now = Date.now(),
      entry = authAttempts.get(key);
    if (!entry || entry.until < now) authAttempts.set(key, { count: 1, until: now + 600000 });
    else if (++entry.count > 30)
      return res.status(429).json({ error: "Too many attempts. Try again later." });
    if (authAttempts.size > 10000)
      for (const [k, v] of authAttempts) if (v.until < now) authAttempts.delete(k);
    next();
  }
  const txt = (v, max = 300) => {
    if (typeof v !== "string" || !v.trim()) throw new Error("Required field missing");
    if (v.length > max) throw new Error("Text too long");
    return v.trim();
  };
  const role = (user, ...roles) => {
    if (!roles.includes(user.role)) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
  };
  const enabled = (state, key) => {
    if (!state.flags[key]) throw new Error("Feature disabled");
  };
  function notify(state, shipment, event) {
    shipmentNotice(state, shipment, event);
  }
  // Emails that tell each side what happened and when an operation is finished.
  function operationEmails(s, sh, action, bidders = []) {
    const owner = s.users.find((u) => u.id === sh.ownerId),
      carrier = s.users.find((u) => u.id === sh.carrierId),
      escrow = s.escrows.find((e) => e.shipmentId === sh.id);
    const info = {
      الشحنة: sh.title,
      المسار: `${sh.origin} → ${sh.destination}`,
      التاجر: owner?.name,
      الناقل: carrier?.name,
      المبلغ: escrow ? `${escrow.amount} USD` : "",
    };
    const ref = `${action}/${sh.id}`;
    if (action === "pay_direct") {
      queueEmail(s, sh.carrierId, "direct_payment", { shipment: sh.title }, ref);
      queueAdminEmail(s, "direct_payment", info, "admin/" + ref);
    } else if (action === "confirm_payment") {
      queueEmail(s, sh.ownerId, "payment_confirmed", { shipment: sh.title }, ref);
    } else if (action === "dispatch") {
      queueEmail(s, sh.ownerId, "dispatched", { shipment: sh.title }, ref);
      queueAdminEmail(s, "dispatched", info, "admin/" + ref);
    } else if (action === "arrive") {
      queueEmail(s, sh.ownerId, "arrived", { shipment: sh.title }, ref);
    } else if (action === "confirm") {
      for (const u of [sh.ownerId, sh.carrierId])
        queueEmail(s, u, "operation_completed", { shipment: sh.title }, `${ref}/${u}`);
      queueAdminEmail(s, "operation_completed", info, "admin/" + ref);
    } else if (action === "dispute") {
      queueAdminEmail(s, "dispute_opened", info, "admin/" + ref);
    } else if (action === "cancel") {
      for (const c of new Set([...bidders, sh.carrierId].filter(Boolean)))
        queueEmail(s, c, "shipment_cancelled", { shipment: sh.title }, `${ref}/${c}`);
      queueAdminEmail(s, "shipment_cancelled", info, "admin/" + ref);
    }
  }
  app.get("/api/health", (req, res) =>
    res.json({
      ok: true,
      demo: DEMO_NOW(),
      supportEmail: readState().supportEmail || process.env.MAIL_REPLY_TO || "",
      emailConfigured: mailConfigured(),
      // Platform WhatsApp for visitors (set by the administrator; empty = no button).
      whatsapp: readState().settings?.publicWhatsapp || "",
      // Legal details of the company running the platform (shown in the footer and legal pages).
      company: readState().settings?.company?.legalName ? readState().settings.company : null,
      // Subscription prices for the home page, unless the administrator hid them.
      pricing: pricingOf(readState()).visible ? pricingOf(readState()) : null,
      // Live platform numbers (real accounts only), unless the administrator hid them.
      stats: readState().settings?.showStats === false ? null : publicStats(readState()),
      storage: cloudEnabled() ? "netlify-blobs" : process.env.DATABASE_URL ? "postgresql" : "json",
      redis: !!redis,
    }),
  );
  // Route price index and quick estimate from real deals (public, registered accounts only).
  priceIndexRoutes(app, { publicOnly: true });
  // Team invite acceptance (public: the employee has no session yet).
  teamInviteRoute(app, { sessionFor, authLimit });
  // PayTR payment notices (server to server, no session).
  paytrPublicRoutes(app);
  // Public company pages, route pages and the sitemap (no account needed).
  publicPageRoutes(app);
  seoRoutes(app);
  // Border and customs notices posted by the administration (public, like the rules page).
  app.get("/api/border", (req, res) => {
    const s = readState();
    res.json({
      notices: s.settings?.borderNotices || [],
      reports: crossingReports(s, false),
      // Best time to cross, from all queue reports so far (registered accounts only).
      times: Object.fromEntries(crossingKeys.map((k) => [k, crossingTimes(s.crossingStats, k)])),
    });
  });
  async function sessionFor(user, res, respond = true, memberId) {
    const token = randomBytes(32).toString("hex"),
      expiry = Date.now() + 86400000;
    const value = { userId: user.id, expiry, createdAt: Date.now(), ...(memberId ? { memberId } : {}) };
    if (cloudEnabled()) await writeSession(token, value);
    else if (redis) await redis.set(`session:${token}`, JSON.stringify(value), { EX: 86400 });
    else sessions.set(token, value);
    res.cookie("lb_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 86400000,
    });
    if (respond) res.json({ user: publicUser(user, true) });
  }
  async function endSession(req) {
    const token = req.headers.cookie?.match(/lb_session=([^;]+)/)?.[1];
    if (!token) return;
    if (cloudEnabled()) await deleteSession(token);
    else if (redis) await redis.del(`session:${token}`);
    else sessions.delete(token);
  }
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const b = req.body;
    if (!["merchant", "carrier", "supplier", "individual", "broker"].includes(b.accountType))
      throw new Error("Invalid account type");
    const email = txt(b.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    if (b.acceptTerms !== "yes" && b.acceptTerms !== true) throw new Error("Accept the terms to continue");
    const credential = await hashPassword(b.password);
    const details = readDetails(b.accountType, b);
    const taxId = b.accountType === "individual" ? null : normalizeTaxId(txt(b.taxId, 40));
    let taxCheck = null;
    if (taxId) {
      // Check digits are verified immediately; EU numbers are also checked with VIES.
      taxCheck = await verifyTaxId(details.country, taxId);
      if (taxCheck.status === "invalid") throw new Error("Invalid company tax number");
    }
    const user = {
      id: id(),
      role: b.accountType === "individual" ? "merchant" : b.accountType,
      accountType: b.accountType,
      name: txt(b.name, 120),
      taxId,
      taxCheck,
      details,
      email,
      credential,
      verified: false,
      verificationStatus: "not_submitted",
      verificationLevel: "none",
      plan: "free",
      demo: false,
      createdAt: new Date().toISOString(),
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: TERMS_VERSION,
    };
    await mutate((s) => {
      if (s.users.some((u) => u.email === email)) throw new Error("Email already registered");
      const inviter = inviterFor(s, b.ref);
      if (inviter) user.referredBy = inviter.id;
      s.users.push(user);
      queueEmailVerification(s, user);
      queueEmail(s, user.id, "registered");
      for (const a of s.users.filter((u) => u.role === "admin" && !u.demo))
        notice(s, a.id, "account_registered");
      queueAdminEmail(s, "account_registered", {
        الاسم: user.name,
        النوع: { merchant: "تاجر", carrier: "ناقل", supplier: "مورد معدات", individual: "فرد" }[
          user.accountType
        ],
        البريد: user.email,
        الهاتف: details.phone,
        البلد: details.country,
        "الرقم الضريبي": taxId ? `${taxId} (${taxCheck.status} · ${taxCheck.method})` : "",
      });
    });
    await sessionFor(user, res);
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const user = readState().users.find(
      (u) =>
        u.email ===
          String(req.body.email || "")
            .trim()
            .toLowerCase() && !u.demo,
    );
    // Team members sign in with their own email and work inside their company's account.
    if (!user) {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();
      const member = (readState().teamMembers || []).find((m) => m.email === email && !m.disabled);
      const company = member && readState().users.find((u) => u.id === member.companyId);
      if (
        member?.credential &&
        company &&
        !company.disabled &&
        (await checkPassword(req.body.password, member.credential))
      ) {
        await mutate((s) => {
          const m = (s.teamMembers || []).find((x) => x.id === member.id);
          if (m) m.lastLoginAt = new Date().toISOString();
        });
        return sessionFor(company, res, true, member.id);
      }
    }
    // The login page an account is opened from does not matter: a valid email and
    // password always open that account's own workspace. This avoids the confusing
    // "wrong page" failure while revealing nothing to someone without the password.
    if (!user || !(await checkPassword(req.body.password, user.credential)))
      return res.status(401).json({ error: "Invalid credentials or account type" });
    if (user.disabled) return res.status(403).json({ error: "Account disabled" });
    if (user.totp) {
      if (!req.body.code) return res.status(401).json({ error: "Two-factor code required", twoFactor: true });
      const factor = checkSecondFactor(user, req.body.code);
      if (!factor) return res.status(401).json({ error: "Invalid two-factor code", twoFactor: true });
      if (factor.kind === "backup")
        await mutate((s) => {
          s.users.find((u) => u.id === user.id).totp.backup.splice(factor.index, 1);
        });
    }
    await mutate((s) => {
      queueEmail(s, user.id, "login", { time: new Date().toISOString() });
      // Usage numbers for the administrator's accounts report.
      const u = s.users.find((x) => x.id === user.id);
      u.loginCount = (u.loginCount || 0) + 1;
      u.lastLoginAt = new Date().toISOString();
    });
    await sessionFor(user, res);
  });
  app.post("/api/login", async (req, res) => {
    if (!DEMO_NOW()) return res.status(503).json({ error: "Demo login disabled" });
    const user = readState().users.find((u) => u.id === req.body.userId && u.demo);
    if (!user) return res.status(400).json({ error: "Unknown demo account" });
    await sessionFor(user, res);
  });
  // Logging out must work even when the session already expired.
  app.post("/api/logout", async (req, res) => {
    await endSession(req);
    res.clearCookie("lb_session", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
    });
    res.json({ ok: true });
  });
  publicAccountRoutes(app, { authLimit, txt });
  publicAdvancedRoutes(app);
  publicTrackingRoutes(app);
  app.use("/api", async (req, res, next) => {
    if (req.path === "/v1/shipments") return integrationAuth(req, res, next);
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("lb_session="))
      ?.slice(11);
    let session =
      token &&
      (cloudEnabled()
        ? await readSession(token)
        : redis
          ? JSON.parse((await redis.get(`session:${token}`)) || "null")
          : sessions.get(token));
    if (!session || session.expiry < Date.now()) return res.status(401).json({ error: "Sign in required" });
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.get("host")}`
    )
      return res.status(403).json({ error: "Origin rejected" });
    req.user = readState().users.find((u) => u.id === session.userId);
    if (!req.user || (!DEMO_NOW() && req.user.demo))
      return res.status(401).json({ error: "Sign in required" });
    if (session.memberId) {
      const m = (readState().teamMembers || []).find(
        (x) => x.id === session.memberId && x.companyId === req.user.id && !x.disabled && x.credential,
      );
      if (!m || (m.sessionsValidAfter && (session.createdAt || 0) < m.sessionsValidAfter))
        return res.status(401).json({ error: "Sign in required" });
      req.member = m;
      if (memberBlocked(m, req.method, req.path))
        return res.status(403).json({ error: "Your team role does not allow this" });
    }
    // Password changes and resets end every session that was opened before them.
    if (req.user.sessionsValidAfter && (session.createdAt || 0) < req.user.sessionsValidAfter)
      return res.status(401).json({ error: "Sign in required" });
    if (req.user.disabled) return res.status(403).json({ error: "Account disabled" });
    // Usage tracking (at most once every 30 minutes per account): last visit and active days.
    if (!req.user.demo && Date.now() - Date.parse(req.user.lastSeenAt || 0) > 30 * 60000) {
      const now = new Date().toISOString();
      await mutate((s) => {
        const u = s.users.find((x) => x.id === req.user.id);
        if (!u) return;
        if (u.lastSeenAt?.slice(0, 10) !== now.slice(0, 10)) u.activeDays = (u.activeDays || 0) + 1;
        u.lastSeenAt = now;
      });
    }
    if (
      requiresApproval(req.user) &&
      ![
        "/state",
        "/logout",
        "/kyb",
        "/profile",
        "/account/password",
        "/account/accept-terms",
        "/feedback",
        "/fx",
        "/notifications/read",
        "/account/2fa/setup",
        "/account/2fa/enable",
        "/account/2fa/disable",
      ].includes(req.path)
    )
      return res.status(403).json({ error: "Account approval required" });
    if (
      emailVerificationRequired(readState(), req.user) &&
      ![
        "/state",
        "/logout",
        "/fx",
        "/account/resend-verification",
        "/account/password",
        "/account/accept-terms",
        "/notifications/read",
      ].includes(req.path)
    )
      return res.status(403).json({ error: "Email verification required" });
    // Expired subscriptions can still read and finish current work, but not start new business,
    // when the administrator turns this on.
    if (
      req.method === "POST" &&
      /^\/(shipments|bids|groups|products|orders)$|^\/shipments\/[^/]+\/accept$|^\/groups\/[^/]+\/reserve$/.test(
        req.path,
      )
    ) {
      // New business needs the current terms accepted (asked once after every legal update).
      if (termsOutdated(req.user)) return res.status(428).json({ error: "Accept the updated terms" });
      const s = readState();
      if (s.settings?.enforceSubscription && subscriptionOf(s, req.user).status === "expired")
        return res.status(402).json({ error: "Subscription expired" });
    }
    next();
  });
  app.get("/api/state", (req, res) => {
    const fullState = readState();
    const s = readState(),
      admin = req.user.role === "admin";
    if (requiresApproval(req.user))
      return res.json({
        user: {
          ...publicUser(req.user, true),
          publicSlug:
            req.user.accountType !== "individual" && req.user.role !== "admin" ? companySlug(req.user) : null,
          ...(req.member
            ? { member: { id: req.member.id, name: req.member.name, teamRole: req.member.teamRole } }
            : {}),
        },
        users: [publicUser(req.user)],
        approvalRequired: true,
        emailVerificationRequired: emailVerificationRequired(s, req.user),
        realtime: false,
        emailConfigured: mailConfigured(),
        whatsappConfigured: whatsappConfigured(),
        borderNotices: s.settings?.borderNotices || [],
        supportEmail: s.supportEmail || "",
        demo: DEMO_NOW(),
        flags: s.flags,
        kyb: s.kyb.filter((d) => d.userId === req.user.id).map(({ content, encryptedContent, ...d }) => d),
        notifications: s.notifications.filter((n) => n.userId === req.user.id),
        shipments: [],
        bids: [],
        groups: [],
        products: [],
        orders: [],
        payments: [],
        escrows: [],
        messages: [],
        reservations: [],
        ratings: [],
        contracts: [],
        fleets: [],
        shipmentDocuments: [],
        documentRequests: [],
        returnTrips: [],
        drivers: [],
        // Invite link works while the account waits for approval too.
        referral: referralState(s, req.user),
        trackingEvents: [],
        driverLinks: [],
        equipmentBookings: [],
        settlements: [],
        apiKeys: [],
        checklists: {},
      });
    // Keep demo data and registered-account data apart before anything else.
    const world = (ownerId) => sameWorld(s, req.user, ownerId);
    s.shipments = s.shipments.filter((sh) => world(sh.ownerId));
    const shipmentIds = new Set(s.shipments.map((sh) => sh.id));
    s.bids = s.bids.filter((b) => shipmentIds.has(b.shipmentId));
    s.escrows = s.escrows.filter((e) => shipmentIds.has(e.shipmentId));
    s.contracts = s.contracts.filter((c) => shipmentIds.has(c.shipmentId));
    s.settlements = s.settlements.filter((x) => shipmentIds.has(x.shipmentId));
    s.groups = s.groups.filter((g) => world(g.carrierId));
    s.products = s.products.filter((p) => world(p.supplierId));
    s.ratings = s.ratings.filter((r) => world(r.userId));
    s.kyb = s.kyb.filter((k) => world(k.userId));
    s.reservations = s.reservations.filter((r) => world(r.userId));
    s.orders = s.orders.filter((o) => world(o.userId));
    s.equipmentBookings = s.equipmentBookings.filter((b) => world(b.userId));
    s.users = s.users.filter((u) => !!u.demo === !!req.user.demo || u.id === req.user.id);
    const mayReview = (x) => admin && (!req.user.demo || s.users.find((u) => u.id === x.userId)?.demo);
    const visibleShipment = (id) =>
      s.shipments.some((sh) => sh.id === id && (admin || [sh.ownerId, sh.carrierId].includes(req.user.id)));
    const {
      emailOutbox,
      whatsappOutbox: _whatsapp,
      crossingReports: _reports,
      settings: _settings,
      stagedDemoSeeded: _staged,
      passwordResets,
      operationsDemoSeeded,
      fx,
      payments: _payments,
      bankAccount: _bank,
      adminNotes: _adminNotes, // private administrator notes: only via /api/admin/notes
      documentRequests: _documentRequests, // filtered per account below
      feedback: _feedback, // only through /api/feedback and /api/admin/feedback
      returnTrips: _returnTrips, // filtered per account below
      crossingStats: _crossingStats, // public summary on /api/border only
      drivers: _drivers, // own drivers (carrier) or all (admin), without documents, below
      sharedPairs: _sharedPairs, // internal: suggestions already sent
      subscriptionOrders: _subscriptionOrders, // online payment orders (private)
      teamMembers: _teamMembers, // only through /api/team
      recurring: _recurring, // filtered below
      monthlyReportsSent: _monthlyReportsSent,
      ...shared
    } = s;
    res.json({
      ...shared,
      emailConfigured: mailConfigured(),
      whatsappConfigured: whatsappConfigured(),
      subscription: subscriptionOf(readState(), req.user),
      pricing: pricingOf(readState()).visible ? pricingOf(readState()) : null,
      borderNotices: s.settings?.borderNotices || [],
      crossingReports: crossingReports(s, !!req.user.demo),
      supportEmail: s.supportEmail || "",
      realtime: !cloudEnabled(),
      ...advancedState(s, req.user),
      ...paymentState(s, req.user),
      fleets: (s.fleets || []).filter((f) => f.userId === req.user.id),
      shipments: visibleShipments(s, req.user).map((full) => {
        // Invoice and packing list live on the order; stages only say whether they exist.
        const root = full.parentId ? fullState.shipments.find((x) => x.id === full.parentId) : full;
        const sh = {
          ...full,
          hasCommercialDocs: !!root?.commercialDocs,
          driverInfo: driverInfo(fullState, full, req.user),
          // Other small open shipments on the same route and week (shared-truck suggestion).
          shareMatches: sharedMatches(fullState, full).length,
        };
        const {
          privateDetails,
          commercialDocs,
          lastPosition,
          track,
          publicToken,
          deliveryCode,
          pod,
          destinationPoint,
          ...publicShipment
        } = sh;
        // The delivery code and the receiver's link belong to the owner only.
        if (admin || sh.ownerId === req.user.id) return sh;
        if (sh.carrierId === req.user.id) {
          const { publicToken: _p, deliveryCode: _d, commercialDocs: _c, ...carrierView } = sh;
          return carrierView;
        }
        return publicShipment;
      }),
      // Measured reputation (on-time share, payment speed, stars) for offers and shipment cards.
      reputation: reputationMap(fullState, req.user),
      returnTrips: visibleTrips(fullState, req.user),
      referral: referralState(fullState, req.user),
      drivers: driversFor(fullState, req.user),
      documentRequests: (fullState.documentRequests || []).filter((r) =>
        requestVisible(fullState, req.user, r),
      ),
      shipmentDocuments: fullState.shipmentDocuments
        .filter((d) => documentVisible(fullState, req.user, d))
        .map(({ encryptedContent, views, ...doc }) => ({
          ...doc,
          // Who opened a document: shown to the uploader and the administration only.
          ...(doc.userId === req.user.id || req.user.role === "admin" ? { views: views || [] } : {}),
          // The operation a document belongs to (a 3-stage order groups all its stages).
          fileId:
            doc.orderId ||
            fullState.shipments.find((x) => x.id === doc.shipmentId)?.parentId ||
            doc.shipmentId,
        })),
      trackingEvents: s.trackingEvents.filter((e) => visibleShipment(e.shipmentId)),
      recurring: recurringFor(fullState, req.user),
      users: s.users.map((u) => publicUser(u)),
      user: {
        ...publicUser(req.user, true),
        publicSlug:
          req.user.accountType !== "individual" && req.user.role !== "admin" ? companySlug(req.user) : null,
        ...(req.member
          ? { member: { id: req.member.id, name: req.member.name, teamRole: req.member.teamRole } }
          : {}),
      },
      emailVerificationRequired: emailVerificationRequired(readState(), req.user),
      demo: DEMO_NOW(),
      kyb: s.kyb
        .filter((x) => mayReview(x) || x.userId === req.user.id)
        .map(({ content, encryptedContent, ...x }) => x),
      bids: s.bids.filter(
        (b) =>
          admin ||
          b.carrierId === req.user.id ||
          s.shipments.some((sh) => sh.id === b.shipmentId && sh.ownerId === req.user.id),
      ),
      messages: s.messages.filter((m) => m.senderId === req.user.id || m.recipientId === req.user.id),
      escrows: s.escrows.filter(
        (e) =>
          admin ||
          s.shipments.some(
            (sh) => sh.id === e.shipmentId && [sh.ownerId, sh.carrierId].includes(req.user.id),
          ),
      ),
      reservations: s.reservations.filter(
        (x) =>
          admin ||
          x.userId === req.user.id ||
          (req.user.role === "carrier" &&
            s.groups.some((g) => g.id === x.groupId && g.carrierId === req.user.id)),
      ),
      orders: vendorOrders(s, req.user),
      contracts: s.contracts.filter(
        (x) =>
          admin ||
          s.shipments.some(
            (sh) => sh.id === x.shipmentId && [sh.ownerId, sh.carrierId].includes(req.user.id),
          ),
      ),
      notifications: s.notifications.filter((x) => x.userId === req.user.id),
      checklists: s.checklists[req.user.id] || {},
    });
  });
  profileRoutes(app);
  privateAccountRoutes(app, { sessionFor });
  twoFactorRoutes(app);
  documentRoutes(app);
  feedbackRoutes(app);
  operationRoutes(app);
  noteRoutes(app);
  accountsReportRoutes(app);
  priceIndexRoutes(app);
  returnTripRoutes(app);
  commercialRoutes(app);
  driverRoutes(app);
  sharedTruckRoutes(app);
  paytrRoutes(app);
  growthRoutes(app);
  teamRoutes(app, { sessionFor });
  recurringRoutes(app);
  monthlyReportRoutes(app);
  trackingRoutes(app);
  paymentRoutes(app);
  advancedRoutes(app);
  app.post(["/api/shipments", "/api/v1/shipments"], async (req, res) => {
    role(req.user, "merchant");
    const b = req.body;
    const shipment = buildShipment(req.user, b);
    // Prohibited goods are refused before anything is saved; the administration is told.
    const banned = checkGoods(
      { hsCode: shipment.hsCode, title: b.title, description: b.description },
      prohibitedRules(readState().settings),
    );
    if (banned.length) {
      await mutate((s) => {
        for (const a of s.users.filter((u) => u.role === "admin" && !!u.demo === !!req.user.demo))
          notice(s, a.id, "prohibited_attempt", undefined, `${req.user.name}: ${banned.join("، ")}`);
      });
      throw new Error("Prohibited goods: this request cannot be accepted");
    }
    const created = await mutate((s) => {
      if (req.path === "/api/v1/shipments") {
        const requestKey = req.get("Idempotency-Key");
        if (requestKey) {
          if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey)) throw Error("Invalid Idempotency-Key");
          const old = s.shipments.find((x) => x.ownerId === req.user.id && x.integrationKey === requestKey);
          if (old) return old;
          shipment.integrationKey = requestKey;
        }
      }
      return insertShipment(s, req.user, shipment);
    });
    res.status(201).json(created);
  });
  app.post("/api/bids", async (req, res) => {
    role(req.user, "carrier", "broker");
    const b = req.body;
    const price = positive(b.price, "price"),
      days = positive(b.days, "days"),
      note = b.note ? txt(b.note, 500) : "";
    if (!Number.isInteger(days) || days > 365) throw new Error("Invalid days");
    // Optional delay guarantee: % of the price given back for every late day (capped in domain.js).
    const delayPct = b.delayPct === undefined || b.delayPct === "" ? 0 : Number(b.delayPct);
    if (![0, 1, 2, 3, 5].includes(delayPct)) throw new Error("Invalid request");
    await mutate((s) => {
      const target = s.shipments.find((x) => x.id === b.shipmentId);
      if (!target || !shipmentWorld(s, req.user, target)) throw new Error("Shipment unavailable");
      if (target.status !== "open") throw new Error("Shipment closed");
      // Customs clearance stages are for customs brokers; transport stages for carriers.
      if ((target.legType === "clearance") !== (req.user.role === "broker"))
        throw new Error("This stage needs a different provider type");
      if (s.bids.some((x) => x.shipmentId === b.shipmentId && x.carrierId === req.user.id))
        throw new Error("You already submitted an offer");
      notice(s, s.shipments.find((x) => x.id === b.shipmentId).ownerId, "bid_received", b.shipmentId);
      queueEmail(
        s,
        s.shipments.find((x) => x.id === b.shipmentId).ownerId,
        "bid_received",
        { shipment: s.shipments.find((x) => x.id === b.shipmentId).title, carrier: req.user.name },
        `bid/${b.shipmentId}/${req.user.id}`,
      );
      s.bids.push({
        id: id(),
        shipmentId: b.shipmentId,
        carrierId: req.user.id,
        price,
        days,
        note,
        ...(delayPct ? { delayPct } : {}),
        createdAt: new Date().toISOString(),
      });
    });
    res.status(201).json({ ok: true });
  });
  // A carrier may withdraw its own offer while the shipment is still open.
  app.delete("/api/bids/:id", async (req, res) => {
    role(req.user, "carrier", "broker");
    await mutate((s) => {
      const bid = s.bids.find((x) => x.id === req.params.id && x.carrierId === req.user.id);
      const sh = s.shipments.find((x) => x.id === bid?.shipmentId);
      if (!bid || !sh) throw new Error("Bid unavailable");
      if (sh.status !== "open") throw new Error("Shipment already assigned");
      s.bids = s.bids.filter((x) => x.id !== bid.id);
      notice(s, sh.ownerId, "bid_withdrawn", sh.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/shipments/:id/accept", async (req, res) => {
    role(req.user, "merchant");
    const sh = await mutate((s) => {
      const sh = acceptBid(s, req.params.id, req.body.bidId, req.user.id);
      if (sh.parentId) syncOrder(s, sh.parentId);
      s.trackingEvents.push({
        id: id(),
        shipmentId: sh.id,
        actorId: req.user.id,
        event: "assigned",
        source: "platform",
        createdAt: new Date().toISOString(),
      });
      shipmentNotice(s, sh, "assigned");
      if (!req.user.demo) {
        const bid = s.bids.find((b) => b.id === sh.bidId);
        queueEmail(s, sh.carrierId, "bid_accepted", { shipment: sh.title }, `accepted/${sh.id}`);
        queueAdminEmail(s, "bid_accepted", {
          الشحنة: sh.title,
          التاجر: req.user.name,
          الناقل: s.users.find((u) => u.id === sh.carrierId)?.name,
          السعر: bid ? `${bid.price} USD` : "",
        });
      }
      return sh;
    });
    res.json(sh);
  });
  app.post("/api/shipments/:id/action", async (req, res) => {
    if (req.body.action === "fund" && !req.user.demo)
      return res
        .status(400)
        .json({ error: "Submit a bank payment receipt; administrator confirmation is required" });
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id);
      if (!sh || !shipmentWorld(s, req.user, sh)) throw new Error("Unknown shipment");
      if (sh.isOrder) {
        if (req.body.action !== "cancel") throw new Error("Invalid transition or actor");
        const legs = cancelOrder(s, sh, req.user);
        for (const leg of legs) {
          const people = new Set([
            ...s.bids.filter((b) => b.shipmentId === leg.id).map((b) => b.carrierId),
            leg.carrierId,
          ]);
          for (const c of [...people].filter(Boolean)) notice(s, c, "cancel", leg.id);
          if (!req.user.demo) operationEmails(s, leg, "cancel", [...people].filter(Boolean));
        }
        return;
      }
      const bidders = s.bids.filter((b) => b.shipmentId === sh.id).map((b) => b.carrierId);
      transitionShipment(s, sh, req.body.action, req.user);
      if (sh.parentId && syncOrder(s, sh.parentId) && !req.user.demo) {
        const order = s.shipments.find((x) => x.id === sh.parentId);
        queueEmail(
          s,
          order.ownerId,
          "operation_completed",
          { shipment: order.title },
          `order-done/${order.id}`,
        );
        queueAdminEmail(
          s,
          "operation_completed",
          { الطلب: order.title, المسار: `${order.origin} → ${order.destination}` },
          `admin/order-done/${order.id}`,
        );
      }
      if (req.body.action === "cancel") for (const c of new Set(bidders)) notice(s, c, "cancel", sh.id);
      s.trackingEvents.push({
        id: id(),
        shipmentId: sh.id,
        actorId: req.user.id,
        event: req.body.action,
        source: "platform",
        createdAt: new Date().toISOString(),
      });
      notify(s, sh, req.body.action);
      if (!req.user.demo) operationEmails(s, sh, req.body.action, bidders);
    });
    res.json({ ok: true });
  });
  app.post("/api/groups/:id/reserve", async (req, res) => {
    role(req.user, "merchant");
    const result = await mutate((s) => {
      const g = s.groups.find((x) => x.id === req.params.id);
      if (!g || !sameWorld(s, req.user, g.carrierId)) throw new Error("Unknown group");
      if (g.date < new Date().toISOString().slice(0, 10)) throw new Error("Group departed");
      const r = {
        id: id(),
        groupId: g.id,
        userId: req.user.id,
        ...reserveGroup(g, req.body.volume),
        createdAt: new Date().toISOString(),
      };
      s.reservations.push(r);
      notice(s, g.carrierId, "group_reserved");
      if (!req.user.demo)
        queueAdminEmail(s, "group_reserved", {
          الرحلة: `${g.origin} → ${g.destination} (${g.date})`,
          الحاجز: req.user.name,
          الحجم: `${r.volume} m³`,
          المبلغ: `${r.price} USD`,
        });
      return r;
    });
    res.status(201).json(result);
  });
  app.patch("/api/flags", async (req, res) => {
    role(req.user, "admin");
    if (req.user.demo) return res.status(403).json({ error: "A registered administrator is required" });
    await mutate((s) => {
      for (const [k, v] of Object.entries(req.body)) {
        if (!optionalFeatures.includes(k) || typeof v !== "boolean") throw new Error("Invalid feature");
        s.flags[k] = v;
      }
    });
    res.json({ ok: true });
  });
  app.post("/api/checklist", async (req, res) => {
    const { crossing, key, checked } = req.body;
    if (!crossingDocuments[crossing]?.includes(key) || typeof checked !== "boolean")
      throw new Error("Invalid document");
    await mutate((s) => {
      s.checklists[req.user.id] ||= {};
      s.checklists[req.user.id][`${crossing}:${key}`] = checked;
    });
    res.json({ ok: true });
  });
  app.post("/api/fleets", async (req, res) => {
    role(req.user, "carrier");
    const b = req.body;
    await mutate((s) => {
      s.fleets ||= [];
      s.fleets.push({
        id: id(),
        userId: req.user.id,
        name: txt(b.name, 80),
        capacity: positive(b.capacity, "capacity"),
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/groups", async (req, res) => {
    role(req.user, "carrier");
    const b = req.body;
    const route = routeDetails({ ...b, crossing: b.crossing || (!b.transportType ? "bab" : undefined) });
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
      !Number.isFinite(Date.parse(b.date)) ||
      b.date < new Date().toISOString().slice(0, 10)
    )
      throw new Error("Invalid departure date");
    await mutate((s) => {
      s.groups.push({
        id: id(),
        carrierId: req.user.id,
        ...route,
        origin: txt(b.origin, 80),
        destination: txt(b.destination, 80),
        capacity: positive(b.capacity, "capacity"),
        booked: 0,
        pricePerM3: positive(b.pricePerM3, "price"),
        date: b.date,
      });
      for (const sh of s.shipments.filter((x) => x.status === "open")) matchRoutes(s, sh);
    });
    res.json({ ok: true });
  });
  app.post("/api/plan", async (req, res) => {
    if (!["free", "pro"].includes(req.body.plan)) throw new Error("Invalid plan");
    // Plans are not billed yet, so only demo accounts may switch them.
    if (!req.user.demo) return res.status(403).json({ error: "Plan changes are not available yet" });
    await mutate((s) => {
      s.users.find((u) => u.id === req.user.id).plan = req.body.plan;
    });
    res.json({ ok: true, simulated: true });
  });
  app.post("/api/products", async (req, res) => {
    role(req.user, "supplier");
    await mutate((s) => {
      enabled(s, "marketplace");
      if (!["sale", "rental"].includes(req.body.type)) throw new Error("Invalid listing type");
      s.products.push({
        id: id(),
        supplierId: req.user.id,
        title: txt(req.body.title, 80),
        price: positive(req.body.price, "price"),
        type: req.body.type,
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/kyb", async (req, res) => {
    role(req.user, "merchant", "carrier", "supplier");
    const b = req.body;
    validateDocument(b);
    const person = req.user.accountType === "individual";
    // Companies complete their profile first, so the administrator reviews it with the documents.
    if (!person && !req.user.demo && (!req.user.profile?.about || !req.user.profile?.contactEmail))
      throw new Error("Complete your company profile first");
    if (!validCountry(b.country) && !(req.user.demo && !b.country)) throw new Error("Valid country required");
    if (person && !validFutureDate(b.expiry)) throw new Error("Valid passport expiry required");
    const details = person
      ? {
          fullName: txt(b.fullName, 120),
          passportLast4: txt(b.passportNumber, 40).slice(-4),
          expiry: b.expiry,
        }
      : {
          company: txt(b.company),
          registration: txt(b.registration, 80),
          registry: txt(b.registry || (req.user.demo ? "Demo registry" : ""), 120),
        };
    if (!person) {
      details.taxId = txt(b.taxId || req.user.taxId || (req.user.demo ? "DEMO-TAX" : ""), 40);
      if (!/^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,39}$/.test(details.taxId))
        throw new Error("Invalid company tax number");
    }
    await mutate((s) => {
      if (s.kyb.some((x) => x.userId === req.user.id && x.status === "pending"))
        throw new Error("Application pending");
      s.kyb.push({
        id: id(),
        userId: req.user.id,
        kind: person ? "person" : "company",
        country: b.country || "TR",
        ...details,
        filename: txt(b.filename),
        mime: b.mime,
        encryptedContent: encryptDocument(b.content),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      const u = s.users.find((u) => u.id === req.user.id);
      u.verified = false;
      u.verificationStatus = "pending";
      u.verificationLevel = "none";
      if (!person) u.taxId = details.taxId;
      queueEmail(s, u.id, "application", { name: details.fullName || details.company });
      if (!u.demo)
        queueAdminEmail(s, "verification_submitted", {
          الحساب: u.name,
          النوع: u.accountType,
          البلد: b.country,
          "الرقم الضريبي": details.taxId || "",
        });
      for (const a of s.users.filter((u) => u.role === "admin" && !u.demo))
        notice(s, a.id, "account_registered");
    });
    res.json({ ok: true, completed: true });
  });
  app.get("/api/kyb/:id/document", (req, res) => {
    role(req.user, "admin");
    const doc = readState().kyb.find((x) => x.id === req.params.id);
    if (!doc) return res.sendStatus(404);
    if (req.user.demo && !readState().users.find((u) => u.id === doc.userId)?.demo)
      return res.sendStatus(403);
    res.set("Content-Type", doc.mime);
    res.set("Content-Disposition", 'attachment; filename="verification-document"');
    res.send(decryptDocument(doc.encryptedContent));
  });
  app.post("/api/kyb/:id/review", async (req, res) => {
    role(req.user, "admin");
    if (!["approved", "rejected"].includes(req.body.status)) throw new Error("Invalid review");
    await mutate((s) => {
      const doc = s.kyb.find((x) => x.id === req.params.id && x.status === "pending");
      if (!doc) throw new Error("Application unavailable");
      const owner = s.users.find((u) => u.id === doc.userId),
        b = req.body;
      if (req.user.demo && !owner.demo) {
        const error = new Error("A registered administrator is required");
        error.status = 403;
        throw error;
      }
      if (b.status === "approved" && !owner.demo) {
        if (b.documentMatches !== true) throw new Error("Document review required");
        if (
          doc.kind === "company" &&
          (b.registryMatches !== true || b.businessActive !== true || !b.reference)
        )
          throw new Error("Official registry review and reference required");
        if (doc.kind === "person" && (!validFutureDate(doc.expiry) || b.passportMatches !== true))
          throw new Error("Passport review required");
      }
      if (b.status === "rejected" && !owner.demo && !b.reason) throw new Error("Rejection reason required");
      doc.status = b.status;
      doc.review = {
        reviewerId: req.user.id,
        reviewedAt: new Date().toISOString(),
        reference: b.reference ? txt(b.reference, 500) : null,
        reason: b.reason ? txt(b.reason, 500) : null,
        documentMatches: b.documentMatches === true,
        registryMatches: b.registryMatches === true,
        businessActive: b.businessActive === true,
        passportMatches: b.passportMatches === true,
      };
      notice(s, owner.id, "verification_" + b.status, undefined, doc.review.reason);
      owner.verified = b.status === "approved";
      if (owner.verified && !owner.demo && !owner.subscription?.startedAt)
        owner.subscription = { ...owner.subscription, startedAt: new Date().toISOString() };
      if (owner.verified) rewardReferral(s, owner);
      owner.verificationStatus = b.status;
      owner.verificationLevel = owner.verified ? (owner.demo ? "demo" : "manual_review") : "none";
      queueEmail(
        s,
        owner.id,
        b.status === "approved" ? "approved" : "rejected",
        { reason: doc.review.reason || "" },
        `review/${doc.id}`,
      );
      if (owner.verified) announceCompany(s, owner);
    });
    res.json({ ok: true });
  });
  app.post("/api/messages", async (req, res) => {
    const b = req.body;
    const message = txt(b.text, 2000);
    const state = readState();
    if (
      !state.users.some(
        (u) =>
          u.id === b.recipientId &&
          u.id !== req.user.id &&
          !requiresApproval(u) &&
          !!u.demo === !!req.user.demo,
      )
    )
      throw new Error("Invalid recipient");
    // A failing translation service must never stop the message itself.
    const result = await translate(message, b.targetLanguage).catch((e) => {
      if (e.message === "Invalid language") throw e;
      return { text: message, mode: "unavailable" };
    });
    await mutate((s) => {
      queueEmail(s, b.recipientId, "message_received", { sender: req.user.name });
      notice(s, b.recipientId, "message_received");
      s.messages.push({
        id: id(),
        senderId: req.user.id,
        recipientId: b.recipientId,
        text: message,
        translated: result.text,
        translationMode: result.mode,
        targetLanguage: b.targetLanguage,
        createdAt: new Date().toISOString(),
      });
    });
    res.json({ ok: true });
  });
  async function translate(text, lang) {
    if (!["ar", "en", "tr"].includes(lang)) throw new Error("Invalid language");
    if (!process.env.AI_SERVICE_URL) return { text, mode: "unavailable" };
    const response = await fetch(`${process.env.AI_SERVICE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Key": process.env.AI_SERVICE_KEY || "" },
      body: JSON.stringify({ text, language: lang }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Translation service unavailable");
    return { text: (await response.json()).text, mode: "ai" };
  }
  app.post("/api/customs", async (req, res) => {
    role(req.user, "merchant");
    const description = txt(req.body.description, 1000);
    if (!process.env.AI_SERVICE_URL)
      return res.json({
        mode: "demo",
        hsCode: null,
        answer: null,
        checklist: ["invoice", "packing", "origin", "transport", "customs"],
      });
    const fallback = {
      mode: "demo",
      hsCode: null,
      answer: null,
      checklist: ["invoice", "packing", "origin", "transport", "customs"],
    };
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL}/customs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Service-Key": process.env.AI_SERVICE_KEY || "" },
        body: JSON.stringify({
          description,
          language: ["ar", "en", "tr"].includes(req.body.language) ? req.body.language : "en",
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("AI service unavailable");
      res.json(await response.json());
    } catch {
      res.json(fallback);
    }
  });
  app.post("/api/ratings", async (req, res) => {
    await mutate((s) => {
      enabled(s, "ratings");
      const sh = s.shipments.find((x) => x.id === req.body.shipmentId && x.status === "delivered");
      if (!sh || ![sh.ownerId, sh.carrierId].includes(req.user.id))
        throw new Error("Delivered shipment required");
      const score = Number(req.body.score);
      if (
        !Number.isInteger(score) ||
        score < 1 ||
        score > 5 ||
        s.ratings.some((x) => x.shipmentId === sh.id && x.userId === req.user.id)
      )
        throw new Error("Invalid or duplicate rating");
      s.ratings.push({
        id: id(),
        shipmentId: sh.id,
        userId: req.user.id,
        targetId: req.user.id === sh.ownerId ? sh.carrierId : sh.ownerId,
        score,
        comment: req.body.comment ? txt(req.body.comment, 1000) : "",
        createdAt: new Date().toISOString(),
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/orders", async (req, res) => {
    role(req.user, "merchant", "carrier");
    const result = await mutate((s) => {
      enabled(s, "marketplace");
      const p = s.products.find((x) => x.id === req.body.productId);
      if (!p || !sameWorld(s, req.user, p.supplierId)) throw new Error("Unknown product");
      if (p.type === "rental") throw new Error("Use dated equipment booking");
      const quantity = positive(req.body.quantity, "quantity");
      if (!Number.isInteger(quantity) || quantity > 1000) throw new Error("Invalid quantity");
      const order = {
        id: id(),
        userId: req.user.id,
        productId: p.id,
        quantity,
        total: Math.round(quantity * p.price * 100) / 100,
        status: "demo_reserved",
        createdAt: new Date().toISOString(),
      };
      s.orders.push(order);
      notice(s, p.supplierId, "order_received");
      if (!req.user.demo) {
        queueEmail(s, p.supplierId, "order_received", { product: p.title, quantity: String(quantity) });
        queueAdminEmail(s, "order_placed", {
          المنتج: p.title,
          الكمية: quantity,
          المشتري: req.user.name,
          الإجمالي: `${order.total} USD`,
        });
      }
      return order;
    });
    res.json(result);
  });
  app.post("/api/contracts", async (req, res) => {
    await mutate((s) => {
      enabled(s, "contracts");
      const sh = s.shipments.find((x) => x.id === req.body.shipmentId && x.status !== "open");
      if (!sh || ![sh.ownerId, sh.carrierId].includes(req.user.id))
        throw new Error("Assigned shipment required");
      if (s.contracts.some((x) => x.shipmentId === sh.id && x.userId === req.user.id))
        throw new Error("Already acknowledged");
      s.contracts.push({
        id: id(),
        shipmentId: sh.id,
        userId: req.user.id,
        name: txt(req.body.name),
        createdAt: new Date().toISOString(),
        type: "demo_acknowledgement",
      });
    });
    res.json({ ok: true });
  });
  // Unknown API paths answer with JSON instead of the HTML application.
  app.use(["/api", "/driver-api"], (req, res) => res.status(404).json({ error: "Not found" }));
  if (process.env.LOGIBRIDGE_SERVERLESS === "true") {
    // Netlify serves the static files and the SPA fallback itself.
  } else if (process.argv.includes("--production")) {
    const root = process.cwd().replace(/\\/g, "/") + "/dist/";
    app.use(express.static(root, { index: false }));
    // Browser version of the driver app (copied from mobile/www at build time).
    app.get(["/driver-app", "/driver-app/"], (req, res) => {
      const path = req.originalUrl.split("?")[0];
      if (path === "/driver-app") return res.redirect(301, "/driver-app/");
      res.sendFile(root + "driver-app/index.html");
    });
    // Every page of the single-page application (/, /reset-password, /workspace/...).
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.set("Cache-Control", "no-cache");
      res.sendFile(root + "index.html");
    });
  } else {
    const { createServer } = await import("vite" + String(""));
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  app.use((err, req, res, next) => {
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Document must be under 2 MB" });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request" });
    // Programming errors are logged but never shown to visitors.
    if (err instanceof TypeError || err instanceof ReferenceError || err instanceof RangeError) {
      console.error(err);
      return res.status(500).json({ error: "Unexpected server error" });
    }
    if ((err.status || 400) >= 500) console.error(err.message);
    res.status(err.status || 400).json({ error: err.message });
  });
  // Outside Netlify there is no scheduled function, so deliver queued emails here.
  if (process.env.LOGIBRIDGE_SERVERLESS !== "true" && mailConfigured() && !process.env.NODE_TEST_CONTEXT) {
    const timer = setInterval(() => flushEmails(5).catch((e) => console.error("Email:", e.message)), 30000);
    timer.unref();
  }
  // Late or stopped trucks are checked every five minutes (on Netlify by the scheduled function).
  if (process.env.LOGIBRIDGE_SERVERLESS !== "true" && !process.env.NODE_TEST_CONTEXT) {
    const timer = setInterval(
      () =>
        runTrackingWatch()
          .then(() => runRecurringWatch())
          .then(() => runMonthlyWatch())
          .catch((e) => console.error("Tracking:", e.message)),
      300000,
    );
    timer.unref();
  }
  if (
    process.env.LOGIBRIDGE_SERVERLESS !== "true" &&
    whatsappConfigured() &&
    !process.env.NODE_TEST_CONTEXT
  ) {
    const timer = setInterval(
      () => flushWhatsApp(5).catch((e) => console.error("WhatsApp:", e.message)),
      30000,
    );
    timer.unref();
  }
  return app;
}
const port = Number(process.env.PORT || 3000);
if (process.env.LOGIBRIDGE_SERVERLESS !== "true")
  createApp()
    .then((app) =>
      app.listen(port, process.env.HOST || "127.0.0.1", () =>
        console.log(`LogiBridge: http://localhost:${port} (demo=${demoEnabled()})`),
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
