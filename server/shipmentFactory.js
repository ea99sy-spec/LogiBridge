import { id } from "./store.js";
import { routeDetails } from "../shared/routes.js";
import { validCountry } from "../shared/countries.js";
import { splitCrossBorder } from "../shared/crossings.js";
import { positive } from "./domain.js";
import { matchRoutes } from "./advanced.js";
import { suggestSharing } from "./sharedTruck.js";
import { queueAdminEmail } from "./email.js";
import { newDeliveryCode } from "./tracking.js";
import { notifyRouteAlerts } from "./adminTools.js";

const txt = (v, max = 300) => {
  if (typeof v !== "string" || !v.trim()) throw new Error("Required field missing");
  if (v.length > max) throw new Error("Text too long");
  return v.trim();
};

// Shared by the shipment form, the integrations API and recurring schedules.
export function buildShipment(user, b) {
  const route = routeDetails(b);
  const hsCode = b.hsCode == null ? "" : String(b.hsCode).trim();
  if (!/^[0-9]{6,12}$/.test(hsCode)) throw new Error("HS Code is required and must contain 6 to 12 digits");
  if (
    !["textiles", "food", "machinery", "packaging", "other"].includes(b.category) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
    !Number.isFinite(Date.parse(b.date)) ||
    b.date < new Date().toISOString().slice(0, 10)
  )
    throw new Error("Invalid shipment details");
  if (
    (b.originCountry && !validCountry(b.originCountry)) ||
    (b.destinationCountry && !validCountry(b.destinationCountry))
  )
    throw new Error("Invalid route country");
  const privateDetails = b.senderName
    ? {
        senderName: txt(b.senderName, 120),
        recipientName: txt(b.recipientName, 120),
        phone: txt(b.phone, 40),
        destinationAddress: txt(b.destinationAddress, 300),
      }
    : null;
  const shipment = {
    id: id(),
    ownerId: user.id,
    title: txt(b.title),
    origin: txt(b.origin, 80),
    destination: txt(b.destination, 80),
    ...route,
    description: b.description ? txt(b.description, 2000) : "",
    hsCode,
    insuranceRequested: b.insuranceRequested === true || b.insuranceRequested === "on",
    insuranceStatus:
      b.insuranceRequested === true || b.insuranceRequested === "on" ? "requested" : "not_requested",
    privateDetails,
    category: b.category,
    volume: positive(b.volume, "volume"),
    weight: positive(b.weight, "weight"),
    date: b.date,
    status: "open",
    deliveryCode: newDeliveryCode(),
    createdAt: new Date().toISOString(),
  };
  return shipment;
}
export function insertShipment(s, user, shipment) {
  if (shipment.transportType === "crossBorder") {
    // Türkiye⇄Syria: an order with three stages, each taken by its own provider.
    shipment.isOrder = true;
    shipment.status = "coordinating";
    shipment.legs = [];
    for (const leg of splitCrossBorder(shipment)) {
      const child = {
        ...shipment,
        id: id(),
        isOrder: false,
        legs: undefined,
        integrationKey: undefined,
        parentId: shipment.id,
        legType: leg.legType,
        legIndex: leg.legIndex,
        originCountry: leg.originCountry,
        destinationCountry: leg.destinationCountry,
        transportType: leg.transportType,
        origin: leg.from || shipment.origin,
        destination: leg.to || shipment.destination,
        status: "open",
      };
      shipment.legs.push(child.id);
      s.shipments.push(child);
      if (leg.legType !== "clearance") {
        matchRoutes(s, child);
        suggestSharing(s, child);
      }
      notifyRouteAlerts(s, child);
    }
    s.shipments.push(shipment);
  } else {
    s.shipments.push(shipment);
    matchRoutes(s, shipment);
    suggestSharing(s, shipment);
    notifyRouteAlerts(s, shipment);
  }
  if (!user.demo)
    queueAdminEmail(s, "shipment_created", {
      الشحنة: shipment.title,
      صاحبها: user.name,
      المسار: `${shipment.origin} → ${shipment.destination}`,
      "الحجم/الوزن": `${shipment.volume} m³ / ${shipment.weight} kg`,
      التاريخ: shipment.date,
    });
  s.trackingEvents.push({
    id: id(),
    shipmentId: shipment.id,
    actorId: user.id,
    event: "open",
    source: "platform",
    createdAt: shipment.createdAt,
  });
  return shipment;
}
