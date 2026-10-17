import { readState, mutate, id } from "./store.js";
import { validateDocument, encryptDocument, decryptDocument } from "./identity.js";
import { notice, shipmentNotice } from "./advanced.js";
import { queueEmail, queueAdminEmail } from "./email.js";
const text = (v, max = 120) => {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw Error("Invalid payment details");
  return v.trim();
};
const admin = (u) => {
  if (u.role !== "admin" || u.demo) {
    const e = Error("A registered administrator is required");
    e.status = 403;
    throw e;
  }
};
export function paymentState(s, u) {
  return {
    bankAccount: s.bankAccount || null,
    payments: (s.payments || [])
      .filter((p) => (u.role === "admin" && !u.demo) || p.userId === u.id)
      .map(({ encryptedContent, transferContent, ...p }) => p),
  };
}
export function paymentRoutes(app) {
  app.put("/api/payments/bank-account", async (req, res) => {
    admin(req.user);
    const b = req.body;
    if (typeof b.enabled !== "boolean" || b.currency !== "USD") throw Error("USD bank account required");
    const account = {
      enabled: b.enabled,
      beneficiary: text(b.beneficiary),
      bank: text(b.bank),
      accountNumber: text(b.accountNumber, 80),
      swift: text(b.swift, 20),
      instructions: b.instructions ? text(b.instructions, 500) : "",
      currency: "USD",
      updatedAt: new Date().toISOString(),
    };
    await mutate((s) => {
      s.bankAccount = account;
    });
    res.json({ ok: true });
  });
  app.post("/api/payments/receipts", async (req, res) => {
    if (req.user.role !== "merchant" || req.user.demo)
      return res.status(403).json({ error: "Registered shipment owner required" });
    const b = req.body;
    validateDocument(b);
    const reference = text(b.reference, 120),
      filename = text(b.filename, 200);
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === b.shipmentId && x.ownerId === req.user.id),
        escrow = s.escrows.find((x) => x.shipmentId === sh?.id);
      if (!sh || sh.status !== "assigned" || escrow?.status !== "awaiting_funding" || !s.bankAccount?.enabled)
        throw Error("Bank payment unavailable");
      if (s.users.find((u) => u.id === sh.carrierId)?.demo)
        throw Error("Real payments require a registered carrier");
      s.payments ||= [];
      if (s.payments.some((p) => p.shipmentId === sh.id && ["pending", "approved"].includes(p.status)))
        throw Error("Payment already submitted");
      const payment = {
        id: id(),
        shipmentId: sh.id,
        userId: req.user.id,
        amount: escrow.amount,
        currency: escrow.currency,
        reference,
        filename,
        mime: b.mime,
        encryptedContent: encryptDocument(b.content),
        bankAccount: { ...s.bankAccount },
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      s.payments.push(payment);
      for (const a of s.users.filter((u) => u.role === "admin" && !u.demo))
        notice(s, a.id, "payment_pending", sh.id);
      queueAdminEmail(s, "payment_submitted", {
        الشحنة: sh.title,
        الدافع: req.user.name,
        المبلغ: `${escrow.amount} ${escrow.currency}`,
        "مرجع التحويل": reference,
      });
    });
    res.status(201).json({ ok: true });
  });
  app.get("/api/payments/:id/document", (req, res) => {
    const p = (readState().payments || []).find((x) => x.id === req.params.id);
    if (!p) return res.sendStatus(404);
    if (req.user.id !== p.userId && (req.user.role !== "admin" || req.user.demo)) return res.sendStatus(403);
    res
      .type(p.mime)
      .set("Content-Disposition", 'attachment; filename="payment-receipt"')
      .send(decryptDocument(p.encryptedContent));
  });
  app.post("/api/payments/:id/review", async (req, res) => {
    admin(req.user);
    const b = req.body;
    if (!["approved", "rejected"].includes(b.status)) throw Error("Invalid payment review");
    if (b.status === "approved" && b.bankReceived !== true)
      throw Error("Confirm receipt in the bank account");
    const note = text(b.note, 500);
    await mutate((s) => {
      const p = (s.payments || []).find((x) => x.id === req.params.id && x.status === "pending"),
        escrow = s.escrows.find((e) => e.shipmentId === p?.shipmentId),
        sh = s.shipments.find((x) => x.id === p?.shipmentId);
      if (!p || !sh || sh.status !== "assigned" || escrow?.status !== "awaiting_funding")
        throw Error("Payment unavailable");
      p.status = b.status;
      p.review = {
        reviewerId: req.user.id,
        reviewedAt: new Date().toISOString(),
        note,
        bankReceived: b.bankReceived === true,
      };
      if (b.status === "approved") {
        escrow.simulated = false;
        escrow.paymentMethod = "bank_transfer";
        escrow.paymentId = p.id;
        escrow.status = "held";
        escrow.fundedAt = new Date().toISOString();
        shipmentNotice(s, sh, "payment_approved");
        for (const u of [sh.ownerId, sh.carrierId])
          queueEmail(s, u, "payment_approved", { shipment: sh.title }, `payment/${p.id}/${u}`);
      } else {
        notice(s, p.userId, "payment_rejected", sh.id, note);
        queueEmail(s, p.userId, "payment_rejected", { shipment: sh.title, reason: note }, `payment/${p.id}`);
      }
    });
    res.json({ ok: true });
  });
  app.post("/api/payments/:id/transfer", async (req, res) => {
    admin(req.user);
    const b = req.body;
    validateDocument(b);
    const reference = text(b.reference, 120);
    if (b.sent !== true) throw Error("Confirm actual bank transfer");
    await mutate((s) => {
      const p = (s.payments || []).find((x) => x.id === req.params.id && x.status === "approved"),
        escrow = s.escrows.find((e) => e.paymentId === p?.id);
      if (!p || !escrow || !["payout_pending", "refund_pending"].includes(escrow.status) || p.transfer)
        throw Error("Transfer unavailable");
      p.transfer = {
        kind: escrow.status === "refund_pending" ? "refund" : "carrier_payout",
        amount: escrow.status === "refund_pending" ? escrow.amount : escrow.carrierNet,
        currency: escrow.currency,
        reference,
        reviewerId: req.user.id,
        createdAt: new Date().toISOString(),
        filename: text(b.filename, 200),
        mime: b.mime,
      };
      p.transferContent = encryptDocument(b.content);
      escrow.status = escrow.status === "refund_pending" ? "refunded" : "released";
      const sh = s.shipments.find((x) => x.id === p.shipmentId);
      shipmentNotice(s, sh, "bank_transfer_completed");
    });
    res.json({ ok: true });
  });
}
