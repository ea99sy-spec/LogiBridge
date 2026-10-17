import { requiresApproval } from "../shared/access.js";
import { randomBytes, createHash } from "node:crypto";
import { readPosition, requirePosition } from "./position.js";
import { recordPosition, savePhoto, saveProof } from "./tracking.js";
import { readState, mutate, id, subscribeState } from "./store.js";
import { transitionShipment, positive, syncOrder } from "./domain.js";
import { sameWorld, demoActive } from "./world.js";
import { queueAdminEmail } from "./email.js";
import { queueWhatsApp } from "./whatsapp.js";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const text = (v, max = 300) => {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new Error("Invalid text");
  return v.trim();
};
const allowed = (u, ...roles) => {
  if (!roles.includes(u.role)) throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const date = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v).toISOString().slice(0, 10) !== v)
    throw new Error("Invalid date");
  return v;
};
// In-app events that also go to WhatsApp for accounts that turned WhatsApp notices on
// (events already covered by the email/WhatsApp queue are not repeated here).
const whatsappEvents = {
  document_requested: "طُلبت منك وثيقة على شحنة",
  document_uploaded: "رُفعت الوثيقة التي طلبتها",
  crossing_arrived: "وصلت الشاحنة إلى المعبر",
  crossing_left: "عبرت الشاحنة المعبر",
  destination_arrived: "وصلت الشاحنة لمكان التسليم",
  closed_by_code: "أُغلقت العملية بالتسليم برمز الاستلام",
  closed_after_arrival: "أُغلقت العملية تلقائيًا بعد الوصول",
  truck_stopped: "الشاحنة متوقفة منذ مدة",
  tracking_stale: "توقف وصول موقع الشاحنة",
  return_trip_match: "رحلة عودة أرخص على طريق شحنتك",
  return_trip_request: "طلب جديد على رحلة العودة",
  return_trip_accepted: "قبل الناقل طلبك على رحلة العودة",
  shipment_rejected: "رفضت الإدارة طلب الشحن",
  feedback_replied: "ردّت الإدارة على رسالتك",
  recurring_invite: "عميل متكرر نشر شحنة جديدة لك",
  route_alert: "طلب شحن جديد على طريق محفوظ عندك",
  admin_nudge: "طلب شحن على طريقك ما وصله عرض بعد",
  shared_truck_suggestion: "يمكنك مشاركة شاحنة مع شحنة أخرى على نفس الطريق",
  referral_reward: "حصلت على شهر مجاني لأن شركة دعوتها انضمت",
  driver_verified: "تم توثيق السائق",
};
export function notice(s, userId, event, shipmentId, detail) {
  if (!userId) return;
  const u = s.users?.find((x) => x.id === userId);
  if (u && !u.demo && u.profile?.whatsappNotify === true && whatsappEvents[event]) {
    const title = shipmentId ? s.shipments?.find((x) => x.id === shipmentId)?.title : "";
    queueWhatsApp(
      s,
      u.details?.phone,
      `LogiBridge: ${whatsappEvents[event]}${title ? ` — ${title}` : ""}${detail ? ` (${String(detail).slice(0, 120)})` : ""}`,
      `wa/notice/${event}/${shipmentId || ""}/${userId}/${new Date().toISOString().slice(0, 13)}`,
    );
  }
  (s.notifications ||= []).push({
    id: id(),
    userId,
    event,
    shipmentId,
    ...(detail ? { detail: String(detail).slice(0, 500) } : {}),
    createdAt: new Date().toISOString(),
    status: "in_app",
    read: false,
  });
}
export function shipmentNotice(s, sh, event) {
  for (const u of new Set([sh.ownerId, sh.carrierId].filter(Boolean))) notice(s, u, event, sh.id);
}
const city = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase();
export function matchRoutes(s, sh) {
  const carriers = new Set(
    s.groups
      .filter(
        (g) =>
          g.date >= new Date().toISOString().slice(0, 10) &&
          g.capacity - g.booked >= sh.volume &&
          city(g.origin) === city(sh.origin) &&
          city(g.destination) === city(sh.destination) &&
          (g.originCountry || "TR") === (sh.originCountry || "TR") &&
          (g.destinationCountry || "SY") === (sh.destinationCountry || "SY") &&
          Math.abs(Date.parse(g.date) - Date.parse(sh.date)) <= 7 * 86400000,
      )
      .map((g) => g.carrierId),
  );
  for (const u of carriers)
    if (
      !s.notifications.some(
        (n) => n.userId === u && n.shipmentId === sh.id && n.event === "matching_opportunity",
      )
    )
      notice(s, u, "matching_opportunity", sh.id);
}
export function estimatePrice(s, b, user) {
  const weight = positive(b.weight, "weight");
  const samples = s.bids.filter(
    (bid) =>
      (!user || sameWorld(s, user, bid.carrierId)) &&
      s.shipments.some(
        (sh) =>
          sh.id === bid.shipmentId &&
          city(sh.origin) === city(b.origin) &&
          city(sh.destination) === city(b.destination) &&
          (!b.originCountry || sh.originCountry === b.originCountry) &&
          (!b.destinationCountry || sh.destinationCountry === b.destinationCountry) &&
          sh.weight >= weight / 2 &&
          sh.weight <= weight * 2,
      ),
  );
  const values = samples.map((bid) => {
    const sh = s.shipments.find((x) => x.id === bid.shipmentId);
    return (bid.price * weight) / sh.weight;
  });
  return {
    currency: "USD",
    samples: values.length,
    estimate: values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : null,
    method: "historical_route_weight",
    confidence: values.length >= 5 ? "moderate" : "low",
    simulated: samples.some((b) => s.users.find((u) => u.id === b.carrierId)?.demo),
  };
}
export function reserveEquipment(s, u, b) {
  if (!s.flags.marketplace) throw new Error("Feature disabled");
  const p = s.products.find((p) => p.id === b.productId && p.type === "rental");
  if (!p || !sameWorld(s, u, p.supplierId)) throw new Error("Rental equipment unavailable");
  const start = date(b.start),
    end = date(b.end);
  if (
    start < new Date().toISOString().slice(0, 10) ||
    end < start ||
    (Date.parse(end) - Date.parse(start)) / 86400000 > 365
  )
    throw new Error("Invalid rental dates");
  if (
    s.equipmentBookings.some(
      (x) => x.productId === p.id && x.status !== "cancelled" && x.start <= end && x.end >= start,
    )
  )
    throw new Error("Equipment dates overlap");
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  const booking = {
    id: id(),
    productId: p.id,
    userId: u.id,
    start,
    end,
    days,
    total: days * p.price,
    status: "reserved",
    createdAt: new Date().toISOString(),
  };
  s.equipmentBookings.push(booking);
  notice(s, p.supplierId, "equipment_booking");
  if (!u.demo && u.id !== p.supplierId)
    queueAdminEmail(s, "booking_created", {
      المعدات: p.title,
      الحاجز: u.name,
      الفترة: `${start} → ${end}`,
      الإجمالي: `${booking.total} USD`,
    });
  return booking;
}
export function advancedState(s, u) {
  const access = (sh) => u.role === "admin" || [sh.ownerId, sh.carrierId].includes(u.id);
  return {
    driverLinks: s.driverLinks.filter((x) => x.carrierId === u.id).map(({ tokenHash, ...x }) => x),
    equipmentBookings: s.equipmentBookings.map((x) => {
      const own =
        u.role === "admin" ||
        x.userId === u.id ||
        s.products.some((p) => p.id === x.productId && p.supplierId === u.id);
      return own ? x : { id: x.id, productId: x.productId, start: x.start, end: x.end, status: x.status };
    }),
    settlements: s.settlements.filter((x) => access(s.shipments.find((sh) => sh.id === x.shipmentId) || {})),
    apiKeys: s.apiKeys.filter((x) => x.userId === u.id).map(({ tokenHash, ...x }) => x),
  };
}
export function publicAdvancedRoutes(app) {
  // The driver mobile app (Capacitor) calls these endpoints from its own origin with a Bearer token;
  // no cookies are involved, so allowing that origin is safe.
  const appOrigins = new Set(["https://localhost", "http://localhost", "capacitor://localhost"]);
  app.use("/driver-api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && appOrigins.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Max-Age", "86400");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      return next();
    }
    if (req.method !== "GET" && origin && origin !== `${req.protocol}://${req.get("host")}`)
      return res.status(403).json({ error: "Origin rejected" });
    next();
  });
  const driver = (req) => {
    const token = req.get("Authorization")?.replace(/^Bearer /, "") || "";
    const s = readState(),
      link = s.driverLinks.find(
        (l) => l.tokenHash === hash(token) && !l.revoked && Date.parse(l.expiresAt) > Date.now(),
      ),
      sh = s.shipments.find((sh) => sh.id === link?.shipmentId && sh.carrierId === link.carrierId);
    if (!link || !sh || (!demoActive(s) && s.users.find((u) => u.id === link.carrierId)?.demo))
      throw Object.assign(new Error("Driver link expired or revoked"), { status: 401 });
    return { link, sh };
  };
  app.get("/driver-api/task", (req, res) => {
    const { link, sh } = driver(req);
    res.json({
      driverName: link.name,
      shipment: {
        id: sh.id,
        title: sh.title,
        origin: sh.origin,
        destination: sh.destination,
        status: sh.status,
        lastLocation: sh.lastLocation,
        lastPosition: sh.lastPosition || null,
        track: sh.track || [],
        crossing: sh.crossing || null,
        legType: sh.legType || null,
        destinationPoint: sh.destinationPoint || null,
        pod: sh.pod || null,
        photos: readState()
          .shipmentDocuments.filter((d) => d.shipmentId === sh.id && d.kind?.startsWith("photo_"))
          .map((d) => ({ kind: d.kind, createdAt: d.createdAt })),
      },
    });
  });
  const driverShipment = (s, link) => {
    const sh = s.shipments.find((x) => x.id === link.shipmentId && x.carrierId === link.carrierId);
    if (!sh) throw new Error("Assignment changed");
    return sh;
  };
  // Points saved on the phone while there was no signal, sent together.
  app.post("/driver-api/positions", async (req, res) => {
    const { link } = driver(req);
    const list = Array.isArray(req.body.positions) ? req.body.positions.slice(0, 200) : [];
    if (!list.length) throw new Error("Invalid location");
    await mutate((s) => {
      const sh = driverShipment(s, link);
      if (!["assigned", "transit", "arrived"].includes(sh.status)) throw new Error("Assignment changed");
      for (const p of list) recordPosition(s, sh, requirePosition(p), p.at, link.id, "driver_gps");
    });
    res.json({ ok: true, saved: list.length });
  });
  app.post("/driver-api/photo", async (req, res) => {
    const { link } = driver(req);
    await mutate((s) => savePhoto(s, driverShipment(s, link), req.body, link.carrierId, true));
    res.status(201).json({ ok: true });
  });
  app.post("/driver-api/proof", async (req, res) => {
    const { link } = driver(req);
    await mutate((s) => saveProof(s, driverShipment(s, link), req.body, link.carrierId, true));
    res.status(201).json({ ok: true });
  });
  app.post("/driver-api/update", async (req, res) => {
    const { link } = driver(req);
    if (req.body.action && !["dispatch", "arrive"].includes(req.body.action))
      throw new Error("Invalid driver action");
    await mutate((s) => {
      const current = s.driverLinks.find((l) => l.id === link.id);
      if (current.revoked || Date.parse(current.expiresAt) <= Date.now()) throw new Error("Link expired");
      const sh = s.shipments.find((x) => x.id === link.shipmentId && x.carrierId === link.carrierId);
      if (!sh) throw new Error("Assignment changed");
      const position = readPosition(req.body);
      const location =
          position && !String(req.body.location || "").trim()
            ? `GPS ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
            : text(req.body.location, 120),
        note = req.body.note ? text(req.body.note, 500) : "";
      if (position) recordPosition(s, sh, position, req.body.at, link.id, "driver_gps");
      if (req.body.action) {
        transitionShipment(s, sh, req.body.action, { id: link.carrierId, role: "carrier" });
        if (sh.parentId) syncOrder(s, sh.parentId);
      }
      sh.lastLocation = location;
      s.trackingEvents.push({
        id: id(),
        shipmentId: sh.id,
        actorId: link.id,
        event: req.body.action || "location_update",
        location,
        note,
        source: position ? "driver_gps" : "driver_manual",
        ...(position ? { position } : {}),
        createdAt: new Date().toISOString(),
      });
      shipmentNotice(s, sh, "driver_update");
    });
    res.json({ ok: true });
  });
}
let fxPending;
async function rates() {
  const s = readState();
  if (s.fx?.checkedAt && Date.now() - Date.parse(s.fx.checkedAt) < 3600000) return s.fx;
  if (!fxPending)
    fxPending = (async () => {
      try {
        const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,TRY,SYP", {
          signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw new Error("Rates unavailable");
        const rows = await response.json(),
          values = { USD: 1 },
          dates = {};
        for (const r of rows)
          if (
            ["EUR", "TRY", "SYP"].includes(r.quote) &&
            r.base === "USD" &&
            Number.isFinite(r.rate) &&
            r.rate > 0
          ) {
            values[r.quote] = r.rate;
            dates[r.quote] = r.date;
          }
        if (!values.EUR || !values.TRY) throw new Error("Incomplete rates");
        const fx = {
          rates: values,
          dates,
          source: "Frankfurter",
          checkedAt: new Date().toISOString(),
          stale: false,
        };
        await mutate((s) => {
          s.fx = fx;
        });
        return fx;
      } catch {
        return {
          ...(readState().fx || { rates: { USD: 1 }, dates: {}, source: "unavailable" }),
          stale: true,
        };
      } finally {
        fxPending = null;
      }
    })();
  return fxPending;
}
export function advancedRoutes(app) {
  app.get("/api/events", (req, res) => {
    if (process.env.LOGIBRIDGE_SERVERLESS === "true") return res.sendStatus(204);
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.flushHeaders();
    res.write("retry: 3000\n\n");
    let last = "";
    const publish = () => {
      const s = readState(),
        signature = JSON.stringify({
          notifications: s.notifications.filter((n) => n.userId === req.user.id),
          verification: s.users.find((u) => u.id === req.user.id)?.verificationStatus,
          shipments: s.shipments
            .filter((sh) => [sh.ownerId, sh.carrierId].includes(req.user.id))
            .map((sh) => [sh.id, sh.status, sh.lastLocation]),
        });
      if (signature !== last) {
        last = signature;
        res.write("event: update\ndata: {}\n\n");
      }
    };
    publish();
    const unsubscribe = subscribeState(publish),
      timer = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    req.on("close", () => {
      unsubscribe();
      clearInterval(timer);
    });
  });
  app.get("/api/reports", async (req, res) => {
    allowed(req.user, "merchant", "carrier", "broker");
    const month = req.query.month || "";
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
    const s = readState(),
      shipments = s.shipments.filter(
        (sh) =>
          [sh.ownerId, sh.carrierId].includes(req.user.id) &&
          (!month || sh.date.startsWith(month)) &&
          (!req.query.shipment || sh.id === req.query.shipment),
      );
    const rows = shipments
      .map((sh) => {
        const escrow = s.escrows.find((e) => e.shipmentId === sh.id),
          bid = s.bids.find((b) => b.id === sh.bidId);
        return {
          id: sh.id,
          title: sh.title,
          date: sh.date,
          origin: sh.origin,
          destination: sh.destination,
          hsCode: sh.hsCode || "",
          status: sh.status,
          amount: escrow?.amount || bid?.price || 0,
          currency: "USD",
          refund: escrow?.refundAmount || 0,
          commission: escrow?.commission || 0,
          net: escrow?.carrierNet || 0,
          insurance: sh.insuranceRequested ? "requested" : "none",
          payment: escrow?.paymentMethod === "direct" ? "direct" : escrow?.simulated === false ? "bank" : "",
          completed: sh.completedAt ? sh.completedAt.slice(0, 10) : "",
        };
      })
      .filter((r) => req.query.kind !== "invoices" || s.escrows.some((e) => e.shipmentId === r.id));
    const columns = Object.keys(
      rows[0] || {
        id: 0,
        title: 0,
        date: 0,
        origin: 0,
        destination: 0,
        hsCode: 0,
        status: 0,
        amount: 0,
        currency: 0,
        refund: 0,
        commission: 0,
        net: 0,
        insurance: 0,
        payment: 0,
        completed: 0,
      },
    );
    if (req.query.format === "xlsx") {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook(),
        sheet = workbook.addWorksheet(req.query.kind === "invoices" ? "Demo invoices" : "Shipments");
      sheet.columns = columns.map((key) => ({ header: key, key, width: 22 }));
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      res
        .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .set("Content-Disposition", 'attachment; filename="logibridge-report.xlsx"');
      return res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    if (req.query.format !== "print") throw new Error("Invalid format");
    const escape = (v) =>
      String(v).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
    res
      .type("html")
      .send(
        `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>LogiBridge report</title><style>body{font:14px Arial;padding:24px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{padding:8px;border:1px solid #ccc}th{background:#edf3fc}@media print{button{display:none}@page{size:landscape}}</style><h1>LogiBridge — ${req.query.kind === "invoices" ? "كشف عمليات وفواتير تجريبية" : "سجل الشحنات"}</h1><p>هذه بيانات منصة تجريبية، وليست فاتورة ضريبية معتمدة. جميع المبالغ الأساسية بالدولار.</p><button onclick="window.print()">طباعة / حفظ PDF</button><table><thead><tr>${columns.map((c) => `<th>${escape(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${escape(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`,
      );
  });
  app.get("/api/fx", async (req, res) => res.json(await rates()));
  app.post("/api/price-estimate", (req, res) => {
    allowed(req.user, "merchant");
    res.json(estimatePrice(readState(), req.body, req.user));
  });
  app.post("/api/notifications/read", async (req, res) => {
    await mutate((s) => {
      for (const n of s.notifications)
        if (n.userId === req.user.id && (!req.body.id || n.id === req.body.id)) n.read = true;
    });
    res.json({ ok: true });
  });
  app.post("/api/driver-links", async (req, res) => {
    allowed(req.user, "carrier");
    const token = randomBytes(32).toString("hex");
    const result = await mutate((s) => {
      const sh = s.shipments.find(
        (x) =>
          x.id === req.body.shipmentId &&
          x.carrierId === req.user.id &&
          ["assigned", "transit", "arrived"].includes(x.status),
      );
      if (!sh) throw new Error("Assigned shipment required");
      const link = {
        id: id(),
        carrierId: req.user.id,
        shipmentId: sh.id,
        name: text(req.body.name, 120),
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
      };
      s.driverLinks.push(link);
      return { id: link.id, expiresAt: link.expiresAt };
    });
    res.json({ ...result, url: `/driver#${token}` });
  });
  app.delete("/api/driver-links/:id", async (req, res) => {
    allowed(req.user, "carrier");
    await mutate((s) => {
      const l = s.driverLinks.find((l) => l.id === req.params.id && l.carrierId === req.user.id);
      if (!l) throw new Error("Unknown link");
      l.revoked = true;
    });
    res.json({ ok: true });
  });
  app.post("/api/equipment-bookings", async (req, res) => {
    allowed(req.user, "merchant", "carrier");
    res.status(201).json(await mutate((s) => reserveEquipment(s, req.user, req.body)));
  });
  app.post("/api/equipment-blocks", async (req, res) => {
    allowed(req.user, "supplier");
    await mutate((s) => {
      const p = s.products.find(
        (x) => x.id === req.body.productId && x.supplierId === req.user.id && x.type === "rental",
      );
      if (!p) throw new Error("Unknown rental equipment");
      reserveEquipment(s, req.user, req.body);
      s.equipmentBookings.at(-1).status = "blocked";
    });
    res.json({ ok: true });
  });
  app.patch("/api/equipment-bookings/:id", async (req, res) => {
    await mutate((s) => {
      const b = s.equipmentBookings.find((x) => x.id === req.params.id),
        p = s.products.find((x) => x.id === b?.productId);
      if (!b || !(b.userId === req.user.id || p?.supplierId === req.user.id))
        throw new Error("Booking unavailable");
      b.status = "cancelled";
    });
    res.json({ ok: true });
  });
  app.post("/api/settlements", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find(
        (x) =>
          x.id === req.body.shipmentId &&
          x.status === "disputed" &&
          [x.ownerId, x.carrierId].includes(req.user.id),
      );
      if (!sh || sh.disputeEscalated) throw new Error("Dispute unavailable");
      if (s.escrows.find((e) => e.shipmentId === sh.id)?.simulated === false)
        throw Error("Bank payment disputes require administrator review");
      const percent = Number(req.body.refundPercent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100)
        throw new Error("Invalid refund percent");
      for (const x of s.settlements)
        if (x.shipmentId === sh.id && x.status === "pending") x.status = "superseded";
      s.settlements.push({
        id: id(),
        shipmentId: sh.id,
        proposerId: req.user.id,
        refundPercent: percent,
        message: text(req.body.message, 1000),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      shipmentNotice(s, sh, "settlement_proposed");
    });
    res.json({ ok: true });
  });
  app.post("/api/settlements/:id/respond", async (req, res) => {
    await mutate((s) => {
      const x = s.settlements.find((x) => x.id === req.params.id && x.status === "pending"),
        sh = s.shipments.find((sh) => sh.id === x?.shipmentId);
      if (
        !x ||
        !sh ||
        sh.status !== "disputed" ||
        sh.disputeEscalated ||
        ![sh.ownerId, sh.carrierId].includes(req.user.id) ||
        x.proposerId === req.user.id
      )
        throw new Error("Counterparty required");
      if (!["accepted", "rejected"].includes(req.body.decision)) throw new Error("Invalid decision");
      x.status = req.body.decision;
      x.respondedAt = new Date().toISOString();
      if (x.status === "accepted") {
        const escrow = s.escrows.find((e) => e.shipmentId === sh.id && e.status === "disputed");
        if (!escrow) throw new Error("Disputed escrow required");
        escrow.refundAmount = Math.round(escrow.amount * x.refundPercent) / 100;
        escrow.commission = 0;
        escrow.carrierNet = Math.round((escrow.amount - escrow.refundAmount) * 100) / 100;
        escrow.status = "settled";
        sh.status = "delivered";
      }
      shipmentNotice(s, sh, "settlement_" + x.status);
    });
    res.json({ ok: true });
  });
  app.post("/api/shipments/:id/escalate", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find(
        (x) =>
          x.id === req.params.id && x.status === "disputed" && [x.ownerId, x.carrierId].includes(req.user.id),
      );
      if (!sh) throw new Error("Dispute unavailable");
      sh.disputeEscalated = true;
      for (const x of s.settlements)
        if (x.shipmentId === sh.id && x.status === "pending") x.status = "escalated";
      for (const u of s.users.filter((u) => u.role === "admin" && (!u.demo || req.user.demo)))
        notice(s, u.id, "dispute_escalated", sh.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/integrations/keys", async (req, res) => {
    allowed(req.user, "merchant");
    if (req.user.accountType === "individual") throw new Error("Company account required");
    const token = randomBytes(32).toString("hex");
    const key = await mutate((s) => {
      const key = {
        id: id(),
        userId: req.user.id,
        name: text(req.body.name, 100),
        tokenHash: hash(token),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        revoked: false,
      };
      s.apiKeys.push(key);
      return { id: key.id, name: key.name, expiresAt: key.expiresAt };
    });
    res.json({ ...key, token });
  });
  app.delete("/api/integrations/keys/:id", async (req, res) => {
    await mutate((s) => {
      const k = s.apiKeys.find((k) => k.id === req.params.id && k.userId === req.user.id);
      if (!k) throw new Error("Unknown key");
      k.revoked = true;
    });
    res.json({ ok: true });
  });
}
const apiCounts = new Map();
export function integrationAuth(req, res, next) {
  const token = req.get("Authorization")?.replace(/^Bearer /, "") || "",
    s = readState(),
    key = s.apiKeys.find(
      (k) => k.tokenHash === hash(token) && !k.revoked && Date.parse(k.expiresAt) > Date.now(),
    ),
    user = s.users.find(
      (u) => u.id === key?.userId && u.role === "merchant" && u.accountType !== "individual",
    );
  if (!user || (!demoActive(s) && user.demo)) return res.status(401).json({ error: "Invalid API key" });
  if (requiresApproval(user)) return res.status(403).json({ error: "Account approval required" });
  const now = Date.now(),
    count = apiCounts.get(key.id) || { until: now + 60000, n: 0 };
  if (count.until < now) {
    count.until = now + 60000;
    count.n = 0;
  }
  if (++count.n > 60) return res.status(429).json({ error: "API rate limit" });
  apiCounts.set(key.id, count);
  req.user = user;
  next();
}
