import { crossingKeys } from "../shared/crossings.js";
import { randomUUID } from "node:crypto";
export const optionalFeatures = ["tracking", "ratings", "marketplace", "contracts"];
export const crossingDocuments = Object.fromEntries(
  crossingKeys.map((k) => [k, ["invoice", "packing", "origin", "transport", "customs"]]),
);
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
  shipment.acceptedAt = new Date().toISOString();
  state.escrows.push({
    id: `escrow-${shipment.id}`,
    shipmentId,
    amount: bid.price,
    // No commission: the platform earns from the monthly subscription, the carrier gets the full price.
    commission: 0,
    carrierNet: bid.price,
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
// A cross-border stage can only start after the previous stage has finished
// (goods must reach the crossing before clearance, and be cleared before the last leg).
function previousStageDone(state, shipment) {
  if (!shipment.parentId || !shipment.legIndex) return true;
  const previous = state.shipments.find(
    (x) => x.parentId === shipment.parentId && x.legIndex === shipment.legIndex - 1,
  );
  return !previous || ["arrived", "delivered"].includes(previous.status);
}
export function transitionShipment(state, shipment, action, actor) {
  if (shipment.isOrder) throw new Error("Invalid transition or actor");
  if (action === "dispatch" && !previousStageDone(state, shipment))
    throw new Error("Previous stage not finished");
  const escrow = state.escrows.find((e) => e.shipmentId === shipment.id);
  if (action === "cancel" && actor.id === shipment.ownerId && shipment.status === "open") {
    shipment.status = "cancelled";
    shipment.cancelledAt = new Date().toISOString();
  } else if (
    action === "cancel" &&
    actor.id === shipment.ownerId &&
    shipment.status === "assigned" &&
    ["awaiting_funding", "direct_pending"].includes(escrow?.status) &&
    !(state.payments || []).some((p) => p.shipmentId === shipment.id && p.status === "pending")
  ) {
    // Nothing was paid yet, so the owner can still withdraw the request.
    shipment.status = "cancelled";
    shipment.cancelledAt = new Date().toISOString();
    escrow.status = "cancelled";
  } else if (
    action === "pay_direct" &&
    actor.id === shipment.ownerId &&
    shipment.status === "assigned" &&
    escrow?.status === "awaiting_funding" &&
    !(state.payments || []).some((p) => p.shipmentId === shipment.id && p.status === "pending")
  ) {
    // The owner pays the carrier directly (cash or transfer); the carrier must confirm receipt.
    escrow.paymentMethod = "direct";
    escrow.status = "direct_pending";
    escrow.commission = 0;
    escrow.carrierNet = escrow.amount;
  } else if (
    action === "confirm_payment" &&
    actor.id === shipment.carrierId &&
    shipment.status === "assigned" &&
    escrow?.status === "direct_pending"
  ) {
    escrow.status = "direct_paid";
    escrow.paidAt = new Date().toISOString();
  } else if (action === "fund" && actor.id === shipment.ownerId && escrow?.status === "awaiting_funding") {
    escrow.status = "held";
    escrow.fundedAt = new Date().toISOString();
  } else if (
    action === "dispatch" &&
    actor.id === shipment.carrierId &&
    shipment.status === "assigned" &&
    ["held", "direct_paid"].includes(escrow?.status)
  )
    shipment.status = "transit";
  else if (action === "arrive" && actor.id === shipment.carrierId && shipment.status === "transit") {
    shipment.status = "arrived";
    shipment.arrivedAt = new Date().toISOString();
  } else if (
    action === "confirm" &&
    actor.id === shipment.ownerId &&
    shipment.status === "arrived" &&
    ["held", "direct_paid"].includes(escrow?.status)
  ) {
    // Receipt confirmed: the operation is closed.
    shipment.status = "delivered";
    shipment.completedAt = new Date().toISOString();
    applyDelayGuarantee(state, shipment);
    askForRating(state, shipment);
    if (escrow.status === "held") escrow.status = escrow.simulated === false ? "payout_pending" : "released";
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

// Keeps a cross-border order's overall status in line with its three stages.
// Returns true when this call closed the whole order.
export function syncOrder(state, parentId) {
  const order = state.shipments.find((x) => x.id === parentId && x.isOrder);
  if (!order) return false;
  const legs = state.shipments.filter((x) => x.parentId === order.id);
  const before = order.status;
  if (legs.every((l) => l.status === "cancelled")) order.status = "cancelled";
  else if (legs.every((l) => l.status === "delivered")) {
    order.status = "delivered";
    order.completedAt ||= new Date().toISOString();
  } else if (legs.some((l) => l.status === "disputed")) order.status = "disputed";
  else if (legs.some((l) => ["transit", "arrived", "delivered"].includes(l.status))) order.status = "transit";
  else if (legs.every((l) => l.status !== "open")) order.status = "assigned";
  else order.status = "coordinating";
  return before !== "delivered" && order.status === "delivered";
}

// Cancels a whole order while nothing has been paid or started.
export function cancelOrder(state, order, actor) {
  if (!order.isOrder || actor.id !== order.ownerId) throw new Error("Invalid transition or actor");
  const legs = state.shipments.filter((x) => x.parentId === order.id);
  for (const leg of legs) {
    const escrow = state.escrows.find((e) => e.shipmentId === leg.id);
    const pending = (state.payments || []).some((p) => p.shipmentId === leg.id && p.status === "pending");
    const cancellable =
      leg.status === "open" ||
      leg.status === "cancelled" ||
      (leg.status === "assigned" &&
        ["awaiting_funding", "direct_pending"].includes(escrow?.status) &&
        !pending);
    if (!cancellable) throw new Error("Some stages already started");
  }
  for (const leg of legs) {
    if (leg.status === "cancelled") continue;
    leg.status = "cancelled";
    leg.cancelledAt = new Date().toISOString();
    const escrow = state.escrows.find((e) => e.shipmentId === leg.id);
    if (escrow) escrow.status = "cancelled";
  }
  order.status = "cancelled";
  order.cancelledAt = new Date().toISOString();
  return legs;
}

// Closes an operation that reached its delivery place, without waiting for the owner's click:
// right away when the receiver's delivery code was entered, or after the waiting time once
// arrival was proven by GPS or a delivery proof. Same effect as the owner's confirmation.
export const AUTO_CLOSE_HOURS = 24;
export function closeDelivered(state, shipment, reason) {
  const escrow = state.escrows.find((e) => e.shipmentId === shipment.id);
  if (shipment.status !== "arrived" || !["held", "direct_paid"].includes(escrow?.status)) return false;
  shipment.status = "delivered";
  shipment.completedAt = new Date().toISOString();
  shipment.closedBy = reason;
  delete shipment.autoCloseAt;
  applyDelayGuarantee(state, shipment);
  askForRating(state, shipment);
  if (escrow.status === "held") escrow.status = escrow.simulated === false ? "payout_pending" : "released";
  return true;
}

// After an operation closes, both sides are asked to rate each other (one tap from the notice).
export function askForRating(state, shipment) {
  if (!state.flags?.ratings || !shipment.carrierId) return;
  for (const userId of [shipment.ownerId, shipment.carrierId])
    if (!(state.ratings || []).some((r) => r.shipmentId === shipment.id && r.userId === userId))
      (state.notifications ||= []).push({
        id: randomUUID(),
        userId,
        event: "rate_prompt",
        shipmentId: shipment.id,
        createdAt: new Date().toISOString(),
        status: "in_app",
        read: false,
      });
}

// Delay guarantee: when the accepted offer promised a discount per late day, the discount is
// worked out from the real arrival when the operation closes (at most MAX_DELAY_DISCOUNT %).
export const MAX_DELAY_DISCOUNT = 30;
export function applyDelayGuarantee(state, shipment) {
  const bid = (state.bids || []).find((b) => b.id === shipment.bidId);
  if (!bid?.delayPct || shipment.delayDiscount) return;
  const arrived = Date.parse(shipment.arrivedAt || shipment.pod?.at || shipment.completedAt || "");
  const start = Math.max(Date.parse(shipment.date || 0) || 0, Date.parse(shipment.acceptedAt || 0) || 0);
  if (!arrived || !start) return;
  const due = new Date(start + (Number(bid.days) || 0) * 86400000);
  due.setUTCHours(23, 59, 59, 999);
  const lateDays = Math.max(0, Math.ceil((arrived - due.getTime()) / 86400000));
  if (!lateDays) return;
  const pct = Math.min(MAX_DELAY_DISCOUNT, lateDays * bid.delayPct);
  const amount = Math.round(bid.price * pct) / 100;
  shipment.delayDiscount = { lateDays, pct, amount, perDay: bid.delayPct };
  const escrow = (state.escrows || []).find((e) => e.shipmentId === shipment.id);
  if (escrow) {
    escrow.delayDiscount = amount;
    escrow.carrierNet = Math.round(((escrow.carrierNet ?? escrow.amount) - amount) * 100) / 100;
  }
}
