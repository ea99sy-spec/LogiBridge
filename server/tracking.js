import { randomBytes, randomUUID } from "node:crypto";
import { crossings } from "../shared/crossings.js";
import { distanceKm, ZONE_KM, LEAVE_KM, waitLevel, parsePoint } from "../shared/geo.js";
import { notice, shipmentNotice } from "./advanced.js";
import { readPosition, requirePosition } from "./position.js";
import { validateDocument, encryptDocument } from "./identity.js";
import { transitionShipment, syncOrder, closeDelivered, AUTO_CLOSE_HOURS } from "./domain.js";
import { readState, mutate } from "./store.js";
import { subscriptionOf } from "../shared/subscription.js";
import { queueEmail } from "./email.js";
import { addCrossingStat } from "../shared/crossingTimes.js";

// A truck within this distance of the delivery point has arrived.
const ARRIVE_KM = 1.5;
const TRACK_LIMIT = 400,
  PHOTO_LIMIT = 15,
  PHOTO_BYTES = 350000;
export const photoStages = ["loading", "sealed", "crossing", "delivery"];
const people = (s, sh) => [sh.ownerId, sh.carrierId].filter(Boolean);
const event = (s, sh, name, extra = {}) =>
  s.trackingEvents.push({
    id: randomUUID(),
    shipmentId: sh.id,
    event: name,
    source: "platform",
    createdAt: new Date().toISOString(),
    ...extra,
  });

// Six-digit code the owner gives to the person receiving the goods; the driver enters it at delivery.
export const newDeliveryCode = () => String(100000 + (randomBytes(4).readUInt32BE() % 900000));

// Adds one GPS point to the shipment's route, then checks the crossing zone.
// `at` may be in the past (points saved on the phone while there was no signal).
export function recordPosition(s, sh, position, at, actorId, source) {
  const time = Date.parse(at);
  const when =
    Number.isFinite(time) && time <= Date.now() + 60000 && time > Date.now() - 48 * 3600000
      ? new Date(time).toISOString()
      : new Date().toISOString();
  sh.track ||= [];
  if (sh.track.some((p) => p.at === when)) return;
  sh.track.push({ lat: position.lat, lng: position.lng, at: when });
  sh.track.sort((a, b) => a.at.localeCompare(b.at));
  if (sh.track.length > TRACK_LIMIT) sh.track = sh.track.slice(-TRACK_LIMIT);
  if (!sh.lastPosition || when >= sh.lastPosition.at) sh.lastPosition = { ...position, at: when };
  delete sh.staleNoticeAt;
  checkCrossing(s, sh, { ...position, at: when }, actorId, source);
  checkDestination(s, sh, { ...position, at: when }, actorId, source);
}

// Arrival at the delivery point (when the owner or carrier set it): the stage becomes "arrived"
// and closes by itself after AUTO_CLOSE_HOURS unless the owner opens a dispute.
function checkDestination(s, sh, point, actorId, source) {
  const dest = sh.destinationPoint;
  if (!dest?.lat || sh.status !== "transit" || sh.isOrder || sh.legType === "clearance") return;
  if (distanceKm(point, dest) > ARRIVE_KM) return;
  sh.status = "arrived";
  sh.arrivedAt = point.at;
  sh.arrivedByGps = true;
  sh.autoCloseAt = new Date(Date.parse(point.at) + AUTO_CLOSE_HOURS * 3600000).toISOString();
  event(s, sh, "destination_arrived", { actorId, source });
  for (const u of people(s, sh))
    notice(s, u, "destination_arrived", sh.id, sh.autoCloseAt.slice(0, 16).replace("T", " ") + " UTC");
  queueEmail(s, sh.ownerId, "arrived", { shipment: sh.title }, `arrived/${sh.id}`);
  if (sh.parentId) syncOrder(s, sh.parentId);
}

// After an operation closes by itself: notices, emails, and the order's overall status.
function afterAutoClose(s, sh, reason) {
  event(s, sh, "confirm", { source: "platform", note: reason });
  for (const u of people(s, sh)) {
    notice(s, u, reason === "delivery_code" ? "closed_by_code" : "closed_after_arrival", sh.id);
    queueEmail(s, u, "operation_completed", { shipment: sh.title }, `shipment/${sh.id}/${u}/auto`);
  }
  if (sh.parentId) syncOrder(s, sh.parentId);
}

function checkCrossing(s, sh, point, actorId, source) {
  const c = crossings[sh.crossing];
  if (!c?.lat || sh.legType === "clearance" || sh.isOrder) return;
  const km = distanceKm(point, c);
  const demo = !!s.users.find((u) => u.id === sh.ownerId)?.demo;
  if (km <= ZONE_KM && !sh.crossingArrivedAt) {
    sh.crossingArrivedAt = point.at;
    event(s, sh, "crossing_arrived", { actorId, location: sh.crossing, source });
    const broker = sh.parentId
      ? s.shipments.find((x) => x.parentId === sh.parentId && x.legType === "clearance")?.carrierId
      : null;
    for (const u of new Set([...people(s, sh), broker].filter(Boolean)))
      notice(s, u, "crossing_arrived", sh.id);
  } else if (sh.crossingArrivedAt && !sh.crossingLeftAt && km > LEAVE_KM && point.at > sh.crossingArrivedAt) {
    sh.crossingLeftAt = point.at;
    const minutes = Math.round((Date.parse(point.at) - Date.parse(sh.crossingArrivedAt)) / 60000);
    event(s, sh, "crossing_left", { actorId, location: sh.crossing, source, note: String(minutes) });
    for (const u of people(s, sh)) notice(s, u, "crossing_left", sh.id);
    addGpsReport(s, sh.crossing, waitLevel(minutes), demo, point.at);
  } else if (sh.crossingArrivedAt && !sh.crossingLeftAt && km <= ZONE_KM) {
    // Still waiting: publish the measured wait every two hours as a live queue report.
    const waited = (Date.parse(point.at) - Date.parse(sh.crossingArrivedAt)) / 60000;
    if (
      waited >= 120 &&
      (!sh.gpsReportAt || Date.parse(point.at) - Date.parse(sh.gpsReportAt) >= 2 * 3600000)
    ) {
      sh.gpsReportAt = point.at;
      addGpsReport(s, sh.crossing, waitLevel(waited), demo, point.at);
    }
  }
}

function addGpsReport(s, crossing, level, demo, at) {
  addCrossingStat(s, crossing, level, at, demo);
  s.crossingReports = [
    { id: randomUUID(), crossing, level, note: "", userId: null, role: "gps", demo, createdAt: at },
    ...(s.crossingReports || []).filter((r) => Date.now() - Date.parse(r.createdAt) < 86400000),
  ].slice(0, 300);
}

// Alerts for trucks that stopped sending positions or stand still away from a crossing.
export function trackingWatch(s, now = Date.now()) {
  let changed = false;
  // Arrived with proof (GPS at the delivery point or a delivery proof) and no dispute: close.
  for (const sh of s.shipments.filter((x) => x.status === "arrived" && x.autoCloseAt)) {
    if (Date.parse(sh.autoCloseAt) > now) continue;
    if (closeDelivered(s, sh, "auto_after_arrival")) {
      afterAutoClose(s, sh, "auto_after_arrival");
      changed = true;
    } else delete sh.autoCloseAt;
  }
  for (const sh of s.shipments.filter(
    (x) => x.status === "transit" && !x.isOrder && x.legType !== "clearance",
  )) {
    const dispatched = s.trackingEvents.findLast?.(
      (e) => e.shipmentId === sh.id && e.event === "dispatch",
    )?.createdAt;
    const last = sh.lastPosition?.at || dispatched;
    if (!last) continue;
    if (now - Date.parse(last) > 6 * 3600000 && !sh.staleNoticeAt) {
      sh.staleNoticeAt = new Date(now).toISOString();
      for (const u of people(s, sh)) notice(s, u, "tracking_stale", sh.id);
      changed = true;
    }
    const track = sh.track || [];
    const latest = track[track.length - 1];
    if (!latest || now - Date.parse(latest.at) > 3600000) continue;
    const window = track.filter((p) => Date.parse(p.at) >= Date.parse(latest.at) - 3 * 3600000);
    const span = Date.parse(latest.at) - Date.parse(window[0].at);
    const still =
      window.length >= 3 && span >= 2.5 * 3600000 && window.every((p) => distanceKm(p, latest) < 0.5);
    const atCrossing = crossings[sh.crossing]?.lat && distanceKm(latest, crossings[sh.crossing]) <= ZONE_KM;
    if (still && !atCrossing && (!sh.stopNoticeAt || now - Date.parse(sh.stopNoticeAt) > 6 * 3600000)) {
      sh.stopNoticeAt = new Date(now).toISOString();
      for (const u of people(s, sh)) notice(s, u, "truck_stopped", sh.id);
      changed = true;
    }
  }
  return changed;
}
// Subscription reminders: bonus months earned, a week before the end, and when it ends.
export function subscriptionWatch(s, now = Date.now()) {
  let changed = false;
  for (const u of s.users.filter((x) => x.role !== "admin" && !x.demo && x.subscription?.startedAt)) {
    const sub = subscriptionOf(s, u, now);
    const sent = (u.subscription.sent ||= {});
    const once = (key, event, details) => {
      if (sent[key]) return;
      sent[key] = new Date(now).toISOString();
      notice(s, u.id, event, undefined, sub.endsAt.slice(0, 10));
      queueEmail(s, u.id, event, { until: sub.endsAt.slice(0, 10), ...details }, `${event}/${u.id}/${key}`);
      changed = true;
    };
    if (sub.bonus) once("bonus", "subscription_bonus", {});
    if (sub.status !== "expired" && sub.daysLeft <= 7)
      once("ending/" + sub.endsAt, "subscription_ending", {});
    if (sub.status === "expired") once("expired/" + sub.endsAt, "subscription_expired", {});
  }
  return changed;
}
// Runs the watches from a timer (local server) or the scheduled Netlify function.
export async function runTrackingWatch() {
  const copy = JSON.parse(JSON.stringify(readState()));
  const due = trackingWatch(copy) | subscriptionWatch(copy);
  if (!due) return false;
  await mutate((s) => {
    trackingWatch(s);
    subscriptionWatch(s);
  });
  return true;
}

// Photo of a delivery stage (resized JPEG/PNG from the phone).
export function savePhoto(s, sh, b, userId, byDriver) {
  if (!photoStages.includes(b.stage)) throw new Error("Invalid request");
  if (!["image/jpeg", "image/png"].includes(b.mime)) throw new Error("Invalid file type or signature");
  validateDocument(b);
  if (Buffer.from(b.content, "base64").length > PHOTO_BYTES) throw new Error("Photo too large");
  const photos = s.shipmentDocuments.filter((d) => d.shipmentId === sh.id && d.kind?.startsWith("photo_"));
  if (photos.length >= PHOTO_LIMIT) throw new Error("Photo limit reached");
  const position = readPosition(b);
  const now = new Date().toISOString();
  s.shipmentDocuments.push({
    id: randomUUID(),
    shipmentId: sh.id,
    userId,
    kind: "photo_" + b.stage,
    filename: `${b.stage}-${now.slice(0, 19)}.jpg`,
    mime: b.mime,
    encryptedContent: encryptDocument(b.content),
    ...(position ? { position } : {}),
    byDriver: !!byDriver,
    createdAt: now,
  });
  event(s, sh, "photo_" + b.stage, { actorId: userId, source: byDriver ? "driver_gps" : "carrier_manual" });
  for (const u of people(s, sh).filter((u) => u !== userId)) notice(s, u, "photo_added", sh.id);
}

// Proof of delivery: receiver's name and signature, and the owner's delivery code when given.
export function saveProof(s, sh, b, userId, byDriver) {
  if (!["transit", "arrived"].includes(sh.status))
    throw new Error("Delivery proof needs a shipment on the way");
  const recipient = typeof b.recipient === "string" ? b.recipient.trim() : "";
  if (!recipient || recipient.length > 120) throw new Error("Required field missing");
  if (b.mime !== "image/png") throw new Error("Signature required");
  validateDocument(b);
  if (Buffer.from(b.content, "base64").length > PHOTO_BYTES) throw new Error("Photo too large");
  const code = String(b.code || "").trim();
  if (code && sh.deliveryCode && code !== sh.deliveryCode) throw new Error("Wrong delivery code");
  const position = readPosition(b);
  const now = new Date().toISOString();
  s.shipmentDocuments.push({
    id: randomUUID(),
    shipmentId: sh.id,
    userId,
    kind: "photo_signature",
    filename: `signature-${now.slice(0, 10)}.png`,
    mime: "image/png",
    encryptedContent: encryptDocument(b.content),
    ...(position ? { position } : {}),
    byDriver: !!byDriver,
    createdAt: now,
  });
  sh.pod = {
    recipient,
    at: now,
    codeVerified: !!code && code === sh.deliveryCode,
    ...(position ? { position } : {}),
  };
  if (sh.status === "transit") transitionShipment(s, sh, "arrive", { id: sh.carrierId, role: "carrier" });
  if (sh.parentId) syncOrder(s, sh.parentId);
  // The receiver's code proves the goods reached the right person: close the operation now.
  // Without the code, it closes by itself after the waiting time unless the owner disputes.
  if (sh.pod.codeVerified && closeDelivered(s, sh, "delivery_code")) afterAutoClose(s, sh, "delivery_code");
  else if (sh.status === "arrived")
    sh.autoCloseAt ||= new Date(Date.now() + AUTO_CLOSE_HOURS * 3600000).toISOString();
  event(s, sh, "delivery_proof", {
    actorId: userId,
    note: recipient,
    source: byDriver ? "driver_gps" : "carrier_manual",
  });
  shipmentNotice(s, sh, "delivery_proof");
}

// Read-only page for the final receiver: stage, rough position and milestones, nothing private.
const milestones = new Set([
  "dispatch",
  "arrive",
  "confirm",
  "crossing_arrived",
  "crossing_left",
  "delivery_proof",
]);
export function publicView(s, sh) {
  const parts = sh.isOrder
    ? s.shipments.filter((x) => x.parentId === sh.id).sort((a, b) => a.legIndex - b.legIndex)
    : [sh];
  const positions = parts
    .map((p) => p.lastPosition)
    .filter(Boolean)
    .sort((a, b) => b.at.localeCompare(a.at));
  const p = positions[0];
  return {
    title: sh.title,
    origin: sh.origin,
    destination: sh.destination,
    status: sh.status,
    crossing: sh.crossing || null,
    isOrder: !!sh.isOrder,
    legs: sh.isOrder ? parts.map((l) => ({ legType: l.legType, status: l.status })) : [],
    // Rounded to about one kilometre.
    position: p ? { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100, at: p.at } : null,
    events: s.trackingEvents
      .filter((e) => parts.some((x) => x.id === e.shipmentId) && milestones.has(e.event))
      .map((e) => ({ event: e.event, at: e.createdAt })),
    delivered: sh.status === "delivered" || parts.some((l) => l.pod),
  };
}

export function publicTrackingRoutes(app) {
  app.get("/api/public/track/:token", (req, res) => {
    const token = String(req.params.token || "");
    if (!/^[a-f0-9]{40}$/.test(token)) return res.status(404).json({ error: "Not found" });
    const s = readState();
    const sh = s.shipments.find((x) => x.publicToken === token);
    if (!sh || sh.status === "cancelled") return res.status(404).json({ error: "Not found" });
    res.json(publicView(s, sh));
  });
}

export function trackingRoutes(app) {
  const mine = (s, req, owner = false) => {
    const sh = s.shipments.find((x) => x.id === req.params.id);
    if (!sh || (owner ? sh.ownerId !== req.user.id : sh.carrierId !== req.user.id)) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return sh;
  };
  // Owner turns the receiver's tracking link on or off.
  app.post("/api/shipments/:id/public-link", async (req, res) => {
    let token = null;
    await mutate((s) => {
      const sh = mine(s, req, true);
      if (sh.parentId) throw new Error("Invalid request");
      sh.publicToken = req.body.enabled === false ? null : sh.publicToken || randomBytes(20).toString("hex");
      token = sh.publicToken;
    });
    res.json({ token });
  });
  // Owner or carrier sets the delivery point (coordinates or a map link) for arrival estimates.
  app.post("/api/shipments/:id/destination-point", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id);
      if (!sh || ![sh.ownerId, sh.carrierId].includes(req.user.id)) {
        const e = new Error("Forbidden");
        e.status = 403;
        throw e;
      }
      const point = req.body.point ? parsePoint(req.body.point) : null;
      if (req.body.point && !point) throw new Error("Invalid location");
      sh.destinationPoint = point;
    });
    res.json({ ok: true });
  });
  // Several GPS points at once (saved on the phone while offline).
  app.post("/api/shipments/:id/positions", async (req, res) => {
    const list = Array.isArray(req.body.positions) ? req.body.positions.slice(0, 200) : [];
    if (!list.length) throw new Error("Invalid location");
    await mutate((s) => {
      const sh = mine(s, req);
      if (!["assigned", "transit", "arrived"].includes(sh.status))
        throw new Error("Assigned carrier required");
      for (const p of list) recordPosition(s, sh, requirePosition(p), p.at, req.user.id, "carrier_gps");
      if (sh.parentId) syncOrder(s, sh.parentId);
    });
    res.json({ ok: true, saved: list.length });
  });
  app.post("/api/shipments/:id/photos", async (req, res) => {
    await mutate((s) => {
      const sh = mine(s, req);
      if (!["assigned", "transit", "arrived", "delivered"].includes(sh.status))
        throw new Error("Assigned carrier required");
      savePhoto(s, sh, req.body, req.user.id, false);
    });
    res.status(201).json({ ok: true });
  });
  app.post("/api/shipments/:id/proof", async (req, res) => {
    await mutate((s) => saveProof(s, mine(s, req), req.body, req.user.id, false));
    res.status(201).json({ ok: true });
  });
}
