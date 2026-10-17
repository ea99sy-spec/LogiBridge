import { mutate } from "./store.js";
import { notice } from "./advanced.js";

// Small shipments on the same route in the same week can share one truck: the platform points
// them out to their owners, owners can say they accept sharing, and carriers see it.
const TRUCK_M3 = 80,
  TRUCK_KG = 24000,
  DAYS = 3;
const city = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
const near = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) <= DAYS * 86400000;
const isDemo = (s, id) => !!s.users.find((u) => u.id === id)?.demo;

export function sharedMatches(s, sh) {
  if (!sh || sh.status !== "open" || sh.isOrder || sh.legType === "clearance") return [];
  return s.shipments.filter(
    (x) =>
      x.id !== sh.id &&
      x.status === "open" &&
      !x.isOrder &&
      x.legType !== "clearance" &&
      x.ownerId !== sh.ownerId &&
      isDemo(s, x.ownerId) === isDemo(s, sh.ownerId) &&
      city(x.origin) === city(sh.origin) &&
      city(x.destination) === city(sh.destination) &&
      near(x.date, sh.date) &&
      Number(x.volume) + Number(sh.volume) <= TRUCK_M3 &&
      Number(x.weight) + Number(sh.weight) <= TRUCK_KG,
  );
}

// Called after a shipment (or stage) is created: tell both owners once per pair.
export function suggestSharing(s, sh) {
  for (const other of sharedMatches(s, sh)) {
    s.sharedPairs ||= [];
    const key = [sh.id, other.id].sort().join("|");
    if (s.sharedPairs.includes(key)) continue;
    s.sharedPairs.push(key);
    notice(s, sh.ownerId, "shared_truck_suggestion", sh.id);
    notice(s, other.ownerId, "shared_truck_suggestion", other.id);
  }
}

export function sharedTruckRoutes(app) {
  // The owner says whether the shipment may share a truck with another trader's goods.
  app.post("/api/shipments/:id/share", async (req, res) => {
    if (typeof req.body?.open !== "boolean") throw new Error("Invalid request");
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id);
      if (!sh || sh.ownerId !== req.user.id) throw new Error("Shipment unavailable");
      sh.shareOpen = req.body.open;
      for (const leg of s.shipments.filter((x) => x.parentId === sh.id)) leg.shareOpen = req.body.open;
    });
    res.json({ ok: true });
  });
}
