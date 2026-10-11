export const optionalFeatures = ["tracking", "ratings", "marketplace", "contracts"];
export const crossingDocuments = {
  bab: ["invoice", "packing", "origin", "transport", "customs"],
  rai: ["invoice", "packing", "origin", "transport", "customs"],
  kasab: ["invoice", "packing", "origin", "transport", "customs"],
};
export function positive(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100000000) throw new Error(`Invalid ${label}`);
  return n;
}
export function acceptBid(state, shipmentId, bidId, ownerId) {
  const shipment = state.shipments.find((s) => s.id === shipmentId);
  if (!shipment || shipment.ownerId !== ownerId) throw new Error("Shipment unavailable");
  if (shipment.status !== "open") throw new Error("Shipment already assigned");
  const bid = state.bids.find((b) => b.id === bidId && b.shipmentId === shipmentId);
  if (!bid) throw new Error("Bid unavailable");
  shipment.status = "assigned";
  shipment.carrierId = bid.carrierId;
  shipment.bidId = bid.id;
  state.escrows.push({
    id: `escrow-${shipment.id}`,
    shipmentId,
    amount: bid.price,
    commission: Math.round(bid.price * 0.03 * 100) / 100,
    carrierNet: Math.round(bid.price * 0.97 * 100) / 100,
    currency: "USD",
    status: "awaiting_funding",
    simulated: true,
  });
  return shipment;
}
export function reserveGroup(group, volume) {
  volume = positive(volume, "volume");
  if (volume > group.capacity - group.booked) throw new Error("Insufficient capacity");
  group.booked = Math.round((group.booked + volume) * 100) / 100;
  return { volume, price: Math.round(volume * group.pricePerM3 * 100) / 100 };
}
export function transitionShipment(state, shipment, action, actor) {
  const escrow = state.escrows.find((e) => e.shipmentId === shipment.id);
  if (action === "cancel" && actor.id === shipment.ownerId && shipment.status === "open") {
    shipment.status = "cancelled";
    shipment.cancelledAt = new Date().toISOString();
  } else if (
    action === "cancel" &&
    actor.id === shipment.ownerId &&
    shipment.status === "assigned" &&
    escrow?.status === "awaiting_funding" &&
    !(state.payments || []).some((p) => p.shipmentId === shipment.id && p.status === "pending")
  ) {
    // Nothing was paid yet, so the owner can still withdraw the request.
    shipment.status = "cancelled";
    shipment.cancelledAt = new Date().toISOString();
    escrow.status = "cancelled";
  } else if (action === "fund" && actor.id === shipment.ownerId && escrow?.status === "awaiting_funding")
    escrow.status = "held";
  else if (
    action === "dispatch" &&
    actor.id === shipment.carrierId &&
    shipment.status === "assigned" &&
    escrow?.status === "held"
  )
    shipment.status = "transit";
  else if (action === "arrive" && actor.id === shipment.carrierId && shipment.status === "transit")
    shipment.status = "arrived";
  else if (
    action === "confirm" &&
    actor.id === shipment.ownerId &&
    shipment.status === "arrived" &&
    escrow?.status === "held"
  ) {
    shipment.status = "delivered";
    escrow.status = escrow.simulated === false ? "payout_pending" : "released";
  } else if (
    action === "dispute" &&
    actor.id === shipment.ownerId &&
    ["assigned", "transit", "arrived"].includes(shipment.status) &&
    escrow?.status === "held"
  ) {
    shipment.status = "disputed";
    escrow.status = "disputed";
  } else if (action === "refund" && actor.role === "admin" && shipment.status === "disputed") {
    if (actor.demo && escrow.simulated === false) throw Error("Registered administrator required");
    shipment.status = "cancelled";
    escrow.status = escrow.simulated === false ? "refund_pending" : "refunded";
  } else throw new Error("Invalid transition or actor");
}
