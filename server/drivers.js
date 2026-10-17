import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { validateDocument, encryptDocument, decryptDocument } from "./identity.js";

// Driver and truck verification: the carrier registers each driver with the plate, licence and a
// truck photo; the administration checks and marks the driver verified. The verified badge then
// shows on the shipments the driver is assigned to.
const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const FILES = ["license", "truck"];

const publicDriver = (d) => ({
  id: d.id,
  carrierId: d.carrierId,
  name: d.name,
  phone: d.phone,
  plate: d.plate,
  truckType: d.truckType,
  licenseNo: d.licenseNo,
  licenseExpiry: d.licenseExpiry,
  status: d.status,
  reason: d.reason || "",
  files: FILES.filter((k) => d.files?.[k]),
  createdAt: d.createdAt,
  reviewedAt: d.reviewedAt || null,
});

export function driversFor(s, user) {
  return (s.drivers || [])
    .filter((d) => d.carrierId === user.id || (user.role === "admin" && !!d.demo === !!user.demo))
    .map(publicDriver);
}

// What the people on a shipment see about its driver (no documents, no licence number).
export function driverInfo(s, sh, viewer) {
  const d = sh.driverId && (s.drivers || []).find((x) => x.id === sh.driverId);
  if (!d) return null;
  const owner = viewer && (viewer.id === sh.ownerId || viewer.role === "admin");
  return {
    name: d.name,
    plate: d.plate,
    truckType: d.truckType,
    verified: d.status === "verified",
    ...(owner ? { phone: d.phone } : {}),
  };
}

export function driverRoutes(app) {
  app.post("/api/drivers", async (req, res) => {
    if (req.user.role !== "carrier") throw new Error("Carrier account required");
    const b = req.body || {};
    const name = text(b.name, 120),
      plate = text(b.plate, 20).toUpperCase();
    if (!name || !plate) throw new Error("Required field missing");
    if (b.licenseExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(b.licenseExpiry)) throw new Error("Invalid date");
    let created;
    await mutate((s) => {
      s.drivers ||= [];
      if (s.drivers.filter((d) => d.carrierId === req.user.id).length >= 200)
        throw new Error("Too many drivers");
      created = {
        id: id(),
        carrierId: req.user.id,
        demo: !!req.user.demo,
        name,
        phone: text(b.phone, 30),
        plate,
        truckType: text(b.truckType, 60),
        licenseNo: text(b.licenseNo, 40),
        licenseExpiry: b.licenseExpiry || "",
        status: "pending",
        files: {},
        createdAt: new Date().toISOString(),
      };
      s.drivers.push(created);
    });
    res.status(201).json({ ok: true, driver: publicDriver(created) });
  });
  // One file at a time (licence photo or truck photo), encrypted like other documents.
  app.post("/api/drivers/:id/file", async (req, res) => {
    const b = req.body || {};
    if (!FILES.includes(b.kind)) throw new Error("Invalid request");
    validateDocument(b);
    await mutate((s) => {
      const d = (s.drivers || []).find((x) => x.id === req.params.id && x.carrierId === req.user.id);
      if (!d) throw new Error("Driver unavailable");
      d.files[b.kind] = {
        mime: b.mime,
        encryptedContent: encryptDocument(b.content),
        at: new Date().toISOString(),
      };
      if (d.status !== "verified") {
        d.status = "pending";
        if (FILES.every((k) => d.files[k]))
          for (const a of s.users.filter((u) => u.role === "admin" && !!u.demo === !!d.demo))
            notice(s, a.id, "driver_review", undefined, `${d.name} · ${d.plate}`);
      }
    });
    res.json({ ok: true });
  });
  app.get("/api/drivers/:id/file/:kind", (req, res) => {
    const s = readState();
    const d = (s.drivers || []).find((x) => x.id === req.params.id);
    const f = d?.files?.[req.params.kind];
    if (!f) return res.sendStatus(404);
    if (d.carrierId !== req.user.id && !(req.user.role === "admin" && !!d.demo === !!req.user.demo))
      return res.sendStatus(403);
    res.set("Content-Type", f.mime).set("Content-Disposition", "inline");
    res.send(decryptDocument(f.encryptedContent));
  });
  app.delete("/api/drivers/:id", async (req, res) => {
    await mutate((s) => {
      const d = (s.drivers || []).find((x) => x.id === req.params.id && x.carrierId === req.user.id);
      if (!d) throw new Error("Driver unavailable");
      s.drivers = s.drivers.filter((x) => x.id !== d.id);
      for (const sh of s.shipments.filter((x) => x.driverId === d.id)) delete sh.driverId;
    });
    res.json({ ok: true });
  });
  app.post("/api/admin/drivers/:id/review", async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const status = req.body?.status;
    if (!["verified", "rejected"].includes(status)) throw new Error("Invalid request");
    const reason = text(req.body?.reason, 300);
    if (status === "rejected" && reason.length < 3) throw new Error("Rejection reason required");
    await mutate((s) => {
      const d = (s.drivers || []).find((x) => x.id === req.params.id && !!x.demo === !!req.user.demo);
      if (!d) throw new Error("Driver unavailable");
      d.status = status;
      d.reason = status === "rejected" ? reason : "";
      d.reviewedAt = new Date().toISOString();
      notice(
        s,
        d.carrierId,
        status === "verified" ? "driver_verified" : "driver_rejected",
        undefined,
        `${d.name} · ${d.plate}${reason ? " — " + reason : ""}`,
      );
    });
    res.json({ ok: true });
  });
  // The carrier chooses which registered driver takes a shipment or stage.
  app.post("/api/shipments/:id/driver", async (req, res) => {
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id);
      if (!sh || sh.carrierId !== req.user.id) throw new Error("Assigned carrier required");
      if (!req.body?.driverId) {
        delete sh.driverId;
        return;
      }
      const d = (s.drivers || []).find((x) => x.id === req.body.driverId && x.carrierId === req.user.id);
      if (!d) throw new Error("Driver unavailable");
      sh.driverId = d.id;
      notice(
        s,
        sh.ownerId,
        "driver_assigned",
        sh.id,
        `${d.name} · ${d.plate}${d.status === "verified" ? " ✓" : ""}`,
      );
    });
    res.json({ ok: true });
  });
}
