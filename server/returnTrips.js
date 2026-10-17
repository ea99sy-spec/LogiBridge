import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { validCountry } from "../shared/countries.js";
import { crossingKeys } from "../shared/crossings.js";

// Empty return trips: a carrier going back empty offers the truck at a lower price, and traders
// with goods on that route ask for it. Fewer empty kilometres for carriers, cheaper trips for traders.
const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const city = (v) => text(v, 80).toLocaleLowerCase("en");

export function visibleTrips(s, user) {
  return (s.returnTrips || [])
    .filter((x) => !!x.demo === !!user.demo)
    .filter(
      (x) =>
        user.role === "admin" ||
        x.carrierId === user.id ||
        (x.status === "open" && (x.dateTo || x.date) >= today()) ||
        x.requests.some((r) => r.userId === user.id),
    )
    .map((x) => ({
      ...x,
      // Each trader sees only their own request; the carrier and the administration see all.
      requests:
        user.role === "admin" || x.carrierId === user.id
          ? x.requests
          : x.requests.filter((r) => r.userId === user.id),
    }));
}

export function returnTripRoutes(app) {
  app.post("/api/return-trips", async (req, res) => {
    if (req.user.role !== "carrier") throw new Error("Carrier account required");
    const b = req.body;
    const date = text(b.date, 10),
      dateTo = text(b.dateTo, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) throw new Error("Invalid departure date");
    if (dateTo && (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < date))
      throw new Error("Invalid departure date");
    if (!validCountry(b.originCountry) || !validCountry(b.destinationCountry))
      throw new Error("Invalid route country");
    const from = text(b.from, 80),
      to = text(b.to, 80);
    if (!from || !to) throw new Error("Required field missing");
    const price = Number(b.price),
      capacity = Number(b.capacityTons);
    if (!Number.isFinite(price) || price <= 0 || price > 1000000) throw new Error("Invalid price");
    if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 100) throw new Error("Invalid capacity");
    const crossing = crossingKeys.includes(b.crossing) ? b.crossing : "";
    await mutate((s) => {
      s.returnTrips ||= [];
      if (s.returnTrips.filter((x) => x.carrierId === req.user.id && x.status === "open").length >= 30)
        throw new Error("Too many open trips");
      const trip = {
        id: id(),
        carrierId: req.user.id,
        demo: !!req.user.demo,
        from,
        to,
        originCountry: b.originCountry,
        destinationCountry: b.destinationCountry,
        crossing,
        date,
        dateTo: dateTo || "",
        truckType: text(b.truckType, 60),
        capacityTons: Math.round(capacity * 10) / 10,
        price: Math.round(price * 100) / 100,
        note: text(b.note, 300),
        status: "open",
        createdAt: new Date().toISOString(),
        requests: [],
      };
      s.returnTrips.push(trip);
      // Traders with an open shipment on the same country pair (and city when given) hear about it.
      const told = new Set();
      for (const sh of s.shipments.filter(
        (x) =>
          x.status === "open" &&
          !x.parentId &&
          x.originCountry === trip.originCountry &&
          x.destinationCountry === trip.destinationCountry &&
          (city(x.origin) === city(from) || city(x.destination) === city(to)),
      )) {
        const owner = s.users.find((u) => u.id === sh.ownerId);
        if (!owner || !!owner.demo !== trip.demo || told.has(owner.id)) continue;
        told.add(owner.id);
        notice(s, owner.id, "return_trip_match", sh.id, `${from} → ${to} · ${date}`);
      }
    });
    res.status(201).json({ ok: true });
  });
  app.post("/api/return-trips/:id/request", async (req, res) => {
    if (!["merchant"].includes(req.user.role)) throw new Error("Trader account required");
    const note = text(req.body?.note, 300);
    await mutate((s) => {
      const trip = (s.returnTrips || []).find((x) => x.id === req.params.id && !!x.demo === !!req.user.demo);
      if (!trip || trip.status !== "open") throw new Error("Trip unavailable");
      if (trip.requests.some((r) => r.userId === req.user.id && r.status === "pending"))
        throw new Error("Request already sent");
      trip.requests.push({
        id: id(),
        userId: req.user.id,
        note,
        status: "pending",
        at: new Date().toISOString(),
      });
      notice(
        s,
        trip.carrierId,
        "return_trip_request",
        undefined,
        `${req.user.name}: ${trip.from} → ${trip.to}`,
      );
    });
    res.json({ ok: true });
  });
  // Carrier: accept or decline a request, mark the trip booked, or cancel it.
  app.post("/api/return-trips/:id/update", async (req, res) => {
    const b = req.body || {};
    await mutate((s) => {
      const trip = (s.returnTrips || []).find((x) => x.id === req.params.id);
      if (!trip || trip.carrierId !== req.user.id) throw new Error("Trip unavailable");
      if (b.requestId) {
        const r = trip.requests.find((x) => x.id === b.requestId);
        if (!r || !["accepted", "declined"].includes(b.decision)) throw new Error("Invalid request");
        r.status = b.decision;
        notice(
          s,
          r.userId,
          "return_trip_" + b.decision,
          undefined,
          `${trip.from} → ${trip.to} · ${trip.date}`,
        );
        if (b.decision === "accepted") trip.status = "booked";
      } else if (["open", "booked", "cancelled"].includes(b.status)) trip.status = b.status;
      else throw new Error("Invalid request");
    });
    res.json({ ok: true });
  });
}
