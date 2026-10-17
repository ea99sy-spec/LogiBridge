import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { cityKey } from "../shared/corridors.js";
import { crossingKeys } from "../shared/crossings.js";
import { requiresApproval } from "../shared/access.js";

// 1) Route alerts: a carrier saves the routes it works on (or a customs broker its crossings) and
//    hears about every new matching request at once.
// 2) Requests without offers: the administration sees open requests nobody answered yet, with the
//    providers most likely to take them, to call or message them.
// 3) Error log: browser and server errors, so problems are seen before companies complain.

const norm = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ");
const samePlace = (a, b) => {
  if (!a) return true; // empty side = any place
  const ka = cityKey(a),
    kb = cityKey(b);
  return ka && kb ? ka === kb : norm(a) === norm(b);
};
const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

export function alertMatches(alert, sh) {
  if (sh.legType === "clearance") return !!alert.crossing && alert.crossing === sh.crossing;
  if (alert.crossing) return false;
  return samePlace(alert.from, sh.origin) && samePlace(alert.to, sh.destination);
}

// Called when a request (or a stage of one) is published.
export function notifyRouteAlerts(s, sh) {
  if (sh.isOrder || sh.status !== "open") return;
  const owner = s.users.find((u) => u.id === sh.ownerId);
  const sent = new Set();
  for (const a of s.routeAlerts || []) {
    if (sent.has(a.userId) || a.userId === sh.ownerId) continue;
    const u = s.users.find((x) => x.id === a.userId);
    if (!u || u.disabled || !!u.demo !== !!owner?.demo || requiresApproval(u)) continue;
    if ((sh.legType === "clearance") !== (u.role === "broker")) continue;
    if (!alertMatches(a, sh)) continue;
    sent.add(a.userId);
    notice(s, a.userId, "route_alert", sh.id, `${sh.origin} → ${sh.destination} · ${sh.date}`);
  }
}

// Providers most likely to answer a request: route alerts, earlier jobs on the same pair, and the
// routes / crossings written in their profile.
export function likelyProviders(s, sh, limit = 6) {
  const broker = sh.legType === "clearance";
  const score = new Map();
  const add = (uid, pts, why) => {
    const cur = score.get(uid) || { pts: 0, why: new Set() };
    cur.pts += pts;
    cur.why.add(why);
    score.set(uid, cur);
  };
  for (const a of s.routeAlerts || []) if (alertMatches(a, sh)) add(a.userId, 5, "alert");
  for (const x of s.shipments || [])
    if (
      x.carrierId &&
      x.id !== sh.id &&
      (broker
        ? x.legType === "clearance" && x.crossing === sh.crossing
        : samePlace(x.origin, sh.origin) && samePlace(x.destination, sh.destination))
    )
      add(x.carrierId, 3, "history");
  for (const u of s.users) {
    if (broker && u.role === "broker" && (u.details?.crossings || []).includes(sh.crossing))
      add(u.id, 2, "profile");
    if (!broker && u.role === "carrier") {
      const r = norm(u.details?.routes);
      const hit = [sh.origin, sh.destination].filter((c) => {
        const k = cityKey(c);
        return r && (r.includes(norm(c)) || (k && r.includes(k)));
      }).length;
      if (hit) add(u.id, hit, "profile");
    }
  }
  const owner = s.users.find((u) => u.id === sh.ownerId);
  return [...score.entries()]
    .map(([uid, v]) => ({ u: s.users.find((x) => x.id === uid), ...v }))
    .filter(
      (x) =>
        x.u &&
        !x.u.disabled &&
        x.u.role === (broker ? "broker" : "carrier") &&
        !!x.u.demo === !!owner?.demo &&
        !requiresApproval(x.u) &&
        !(s.bids || []).some((b) => b.shipmentId === sh.id && b.carrierId === x.u.id),
    )
    .sort((a, b) => b.pts - a.pts)
    .slice(0, limit)
    .map((x) => ({
      id: x.u.id,
      name: x.u.name,
      phone: x.u.profile?.contactPhone || x.u.details?.phone || "",
      why: [...x.why],
      notified: (s.notifications || []).some(
        (n) =>
          n.userId === x.u.id &&
          n.shipmentId === sh.id &&
          ["route_alert", "matching_opportunity", "admin_nudge"].includes(n.event),
      ),
    }));
}

const MAX_LOG = 200;
export function logError(s, { source, message, path, userId, stack }) {
  s.errorLog ||= [];
  const msg = text(message, 300) || "Unknown error";
  const where = text(path, 200);
  const now = new Date().toISOString();
  const same = s.errorLog.find((e) => e.source === source && e.message === msg && e.path === where);
  if (same) {
    same.count = (same.count || 1) + 1;
    same.lastAt = now;
    if (userId) same.userId = userId;
    return;
  }
  s.errorLog.push({
    id: id(),
    source,
    message: msg,
    path: where,
    stack: text(stack, 1200),
    userId,
    count: 1,
    at: now,
    lastAt: now,
  });
  if (s.errorLog.length > MAX_LOG) s.errorLog = s.errorLog.slice(-MAX_LOG);
}

// Public: errors from visitors' browsers (rate limited, stored briefly, no personal data).
const recent = new Map();
export function clientErrorRoute(app) {
  app.post("/api/client-error", async (req, res) => {
    const ip = String(req.get("x-nf-client-connection-ip") || req.ip || "");
    const now = Date.now();
    if ((recent.get(ip) || 0) > now - 10000) return res.status(204).end();
    recent.set(ip, now);
    if (recent.size > 5000) recent.clear();
    const b = req.body || {};
    await mutate((s) =>
      logError(s, { source: "browser", message: b.message, path: b.path, stack: b.stack }),
    ).catch(() => {});
    res.status(204).end();
  });
}

export function adminToolsRoutes(app) {
  const admin = (req) => {
    if (req.user.role !== "admin") throw Object.assign(new Error("Forbidden"), { status: 403 });
  };
  // Route alerts (carriers and customs brokers).
  app.post("/api/route-alerts", async (req, res) => {
    if (!["carrier", "broker"].includes(req.user.role))
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    const b = req.body || {};
    const alert = { id: id(), userId: req.user.id, createdAt: new Date().toISOString() };
    if (req.user.role === "broker") {
      if (!crossingKeys.includes(b.crossing)) throw new Error("Border crossing required");
      alert.crossing = b.crossing;
    } else {
      alert.from = text(b.from, 80);
      alert.to = text(b.to, 80);
      if (!alert.from && !alert.to) throw new Error("Required field missing");
    }
    await mutate((s) => {
      s.routeAlerts ||= [];
      const mine = s.routeAlerts.filter((a) => a.userId === req.user.id);
      if (mine.length >= 20) throw new Error("Too many alerts");
      if (
        mine.some(
          (a) =>
            a.crossing === alert.crossing &&
            norm(a.from) === norm(alert.from) &&
            norm(a.to) === norm(alert.to),
        )
      )
        throw new Error("Alert already saved");
      s.routeAlerts.push(alert);
    });
    res.status(201).json(alert);
  });
  app.delete("/api/route-alerts/:id", async (req, res) => {
    await mutate((s) => {
      const before = (s.routeAlerts || []).length;
      s.routeAlerts = (s.routeAlerts || []).filter(
        (a) => !(a.id === req.params.id && a.userId === req.user.id),
      );
      if (s.routeAlerts.length === before) throw new Error("Invalid request");
    });
    res.json({ ok: true });
  });
  // Requests without offers.
  app.get("/api/admin/unanswered", (req, res) => {
    admin(req);
    const s = readState();
    const hours = Math.min(Math.max(Number(req.query.hours) || 6, 1), 720);
    const cutoff = Date.now() - hours * 3600000;
    const list = (s.shipments || [])
      .filter((sh) => {
        if (sh.isOrder || sh.status !== "open" || Date.parse(sh.createdAt) > cutoff) return false;
        const owner = s.users.find((u) => u.id === sh.ownerId);
        return (
          owner && !!owner.demo === !!req.user.demo && !(s.bids || []).some((b) => b.shipmentId === sh.id)
        );
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 50)
      .map((sh) => {
        const owner = s.users.find((u) => u.id === sh.ownerId);
        return {
          id: sh.id,
          title: sh.title,
          origin: sh.origin,
          destination: sh.destination,
          legType: sh.legType || null,
          crossing: sh.crossing || null,
          date: sh.date,
          createdAt: sh.createdAt,
          owner: {
            id: owner.id,
            name: owner.name,
            phone: owner.profile?.contactPhone || owner.details?.phone || "",
          },
          providers: likelyProviders(s, sh),
        };
      });
    res.json({ hours, list });
  });
  // Tell the suggested providers about one request.
  app.post("/api/admin/unanswered/:id/nudge", async (req, res) => {
    admin(req);
    let count = 0;
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id && x.status === "open");
      if (!sh) throw new Error("Shipment unavailable");
      const ids = Array.isArray(req.body?.providers) ? req.body.providers.slice(0, 20) : [];
      for (const p of likelyProviders(s, sh, 20))
        if (ids.includes(p.id) && !p.notified) {
          notice(s, p.id, "admin_nudge", sh.id, `${sh.origin} → ${sh.destination} · ${sh.date}`);
          count++;
        }
    });
    res.json({ ok: true, count });
  });
  // Error log.
  app.get("/api/admin/errors", (req, res) => {
    admin(req);
    if (req.user.demo) return res.json({ errors: [] });
    res.json({ errors: [...(readState().errorLog || [])].reverse() });
  });
  app.delete("/api/admin/errors", async (req, res) => {
    admin(req);
    if (req.user.demo) throw Object.assign(new Error("Forbidden"), { status: 403 });
    await mutate((s) => {
      s.errorLog = [];
    });
    res.json({ ok: true });
  });
}
