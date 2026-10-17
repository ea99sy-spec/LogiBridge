import { watermarkDocument, watermarkText, arabicPart } from "./watermark.js";
import { readState, mutate, id } from "./store.js";
import { validateDocument, encryptDocument, decryptDocument } from "./identity.js";
import { notice } from "./advanced.js";
import { checklist, missingFor, requestableKinds } from "../shared/documents.js";

// Documents are kept per operation ("file"): a shipment, a stage of a 3-stage order, or an
// equipment order. Everyone working on that operation can upload, see and download them.
export const documentKinds = [
  "invoice",
  "packing",
  "origin",
  "transport",
  "customs",
  "insurance",
  "delivery",
  "warranty",
  "other",
];
const text = (v, max = 160) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

// People working on a shipment: its owner and assigned carrier/broker. For a 3-stage order the
// carriers and brokers of every stage take part too, so they all see the order's documents.
export function shipmentParties(s, sh) {
  if (!sh) return [];
  const root = sh.parentId ? s.shipments.find((x) => x.id === sh.parentId) || sh : sh;
  const legs = s.shipments.filter((x) => x.parentId === root.id);
  return [root.ownerId, root.carrierId, ...legs.map((l) => l.carrierId)].filter(Boolean);
}
export function orderParties(s, order) {
  if (!order) return [];
  const product = (s.products || []).find((p) => p.id === order.productId);
  return [order.userId, product?.supplierId].filter(Boolean);
}
function partiesOf(s, doc) {
  if (doc.orderId)
    return orderParties(
      s,
      (s.orders || []).find((o) => o.id === doc.orderId),
    );
  return shipmentParties(
    s,
    s.shipments.find((x) => x.id === doc.shipmentId),
  );
}
const rootOf = (s, sh) => (sh?.parentId ? s.shipments.find((x) => x.id === sh.parentId) || sh : sh);
// Everything about one operation: who works on it, its documents and its document requests.
export function fileOf(s, { shipmentId, orderId }) {
  if (orderId) {
    const order = (s.orders || []).find((o) => o.id === orderId);
    if (!order) return null;
    const supplierId = (s.products || []).find((p) => p.id === order.productId)?.supplierId;
    return {
      type: "order",
      key: { orderId: order.id },
      ownerId: order.userId,
      supplierId,
      parties: orderParties(s, order),
      docs: s.shipmentDocuments.filter((d) => d.orderId === order.id),
      requests: (s.documentRequests || []).filter((r) => r.orderId === order.id),
    };
  }
  const root = rootOf(
    s,
    s.shipments.find((x) => x.id === shipmentId),
  );
  if (!root) return null;
  const ids = new Set([root.id, ...s.shipments.filter((x) => x.parentId === root.id).map((x) => x.id)]);
  return {
    type: "shipment",
    key: { shipmentId: root.id },
    root,
    ownerId: root.ownerId,
    parties: shipmentParties(s, root),
    docs: s.shipmentDocuments.filter((d) => ids.has(d.shipmentId)),
    requests: (s.documentRequests || []).filter((r) => r.shipmentId === root.id),
  };
}
// What the owner still has to upload before the request can be sent.
export const ownerMissing = (s, root) => {
  const file = fileOf(s, { shipmentId: root.id });
  return file ? missingFor(checklist(file), file.ownerId) : [];
};
export function requestVisible(s, user, r) {
  const requester = s.users.find((u) => u.id === r.requestedBy);
  if (!requester || !!user.demo !== !!requester.demo) return false;
  if (user.role === "admin") return true;
  return (fileOf(s, r)?.parties || []).includes(user.id);
}

// The administration may open every shipment document, to check that the goods are allowed.
// Can this account see a document? Administrators see every document of their own world.
export function documentVisible(s, user, doc) {
  const uploader = s.users.find((u) => u.id === doc.userId);
  if (!uploader || !!user.demo !== !!uploader.demo) return false;
  if (user.role === "admin") return true;
  return partiesOf(s, doc).includes(user.id);
}

export function documentRoutes(app) {
  app.post("/api/shipment-documents", async (req, res) => {
    const b = req.body;
    validateDocument(b);
    if (!documentKinds.includes(b.kind)) throw new Error("Invalid document kind");
    let created;
    await mutate((s) => {
      let target;
      if (b.orderId) {
        const order = (s.orders || []).find((o) => o.id === b.orderId);
        if (!order || !orderParties(s, order).includes(req.user.id)) throw new Error("Order unavailable");
        target = { orderId: order.id };
      } else {
        const sh = s.shipments.find((x) => x.id === b.shipmentId);
        if (!sh || !shipmentParties(s, sh).includes(req.user.id)) throw new Error("Shipment unavailable");
        target = { shipmentId: sh.id };
      }
      let request;
      if (b.requestId) {
        request = (s.documentRequests || []).find((r) => r.id === b.requestId && r.status === "open");
        const same =
          request &&
          (request.orderId
            ? request.orderId === target.orderId
            : fileOf(s, target)?.key.shipmentId === request.shipmentId);
        if (!same) throw new Error("Document request unavailable");
      }
      created = {
        id: id(),
        ...target,
        ...(request ? { requestId: request.id } : {}),
        userId: req.user.id,
        kind: b.kind,
        note: text(b.note, 160),
        filename: text(b.filename),
        mime: b.mime,
        encryptedContent: encryptDocument(b.content),
        createdAt: new Date().toISOString(),
      };
      s.shipmentDocuments.push(created);
      if (request) {
        request.status = "done";
        request.doneAt = created.createdAt;
        notice(s, request.requestedBy, "document_uploaded", target.shipmentId, request.title || "");
      }
    });
    const { encryptedContent, ...doc } = created;
    res.status(201).json({ ok: true, document: doc });
  });
  app.get("/api/shipment-documents/:id", async (req, res) => {
    const s = readState(),
      doc = s.shipmentDocuments.find((x) => x.id === req.params.id);
    if (!doc) return res.sendStatus(404);
    if (!documentVisible(s, req.user, doc)) return res.sendStatus(403);
    // Someone else's document (not delivery photos): a watermarked PDF copy with the viewer's
    // name, email and time, and the opening is recorded for the uploader and the administration.
    const viewer = req.member
      ? { name: `${req.member.name} (${req.user.name})`, email: req.member.email }
      : { name: req.user.name, email: req.user.email };
    if (doc.userId !== req.user.id && !String(doc.kind || "").startsWith("photo_")) {
      const marked = await watermarkDocument(
        decryptDocument(doc.encryptedContent),
        doc.mime,
        watermarkText(viewer),
        arabicPart(viewer.name),
      );
      if (marked) {
        if (!req.user.demo)
          await mutate((st) => {
            const d = st.shipmentDocuments.find((x) => x.id === doc.id);
            if (!d) return;
            d.views = [
              ...(d.views || []),
              { userId: req.user.id, memberId: req.member?.id, at: new Date().toISOString() },
            ].slice(-50);
          }).catch(() => {});
        const base =
          String(doc.filename || "document")
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[^\w.\- ]+/g, "_")
            .slice(0, 70) || "document";
        return res
          .set("Content-Type", "application/pdf")
          .set("Cache-Control", "private, no-store")
          .set(
            "Content-Disposition",
            `${req.query.view ? "inline" : "attachment"}; filename="${base}-LogiBridge.pdf"`,
          )
          .send(marked);
      }
    }
    const ext = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" }[doc.mime] || "bin";
    const name =
      String(doc.filename || "document")
        .replace(/[^\w.\- ]+/g, "_")
        .slice(0, 80) || "document";
    res
      .set("Content-Type", doc.mime)
      .set(
        "Content-Disposition",
        `${req.query.view ? "inline" : "attachment"}; filename="${name.endsWith("." + ext) ? name : name + "." + ext}"`,
      );
    res.send(decryptDocument(doc.encryptedContent));
  });
  // The person who uploaded a document can remove it (for example a wrong file).
  app.delete("/api/shipment-documents/:id", async (req, res) => {
    await mutate((s) => {
      const doc = s.shipmentDocuments.find((x) => x.id === req.params.id);
      if (!doc || doc.kind?.startsWith("photo_")) throw new Error("Document unavailable");
      if (doc.userId !== req.user.id) throw new Error("Only the uploader can delete this document");
      s.shipmentDocuments = s.shipmentDocuments.filter((x) => x.id !== doc.id);
      // Deleting the file that answered a request opens the request again.
      const request = doc.requestId && (s.documentRequests || []).find((r) => r.id === doc.requestId);
      if (request && !s.shipmentDocuments.some((d) => d.requestId === request.id)) {
        request.status = "open";
        delete request.doneAt;
      }
    });
    res.json({ ok: true });
  });
  // Ask another party of the operation for a document (the administrator can ask anyone on it).
  app.post("/api/document-requests", async (req, res) => {
    const b = req.body;
    // One or several document types chosen from the list (plus a named "other" document).
    const kinds = [...new Set(Array.isArray(b.kinds) ? b.kinds : [b.kind])].filter(Boolean);
    if (!kinds.length || kinds.length > 9 || kinds.some((k) => !requestableKinds.includes(k)))
      throw new Error("Invalid document kind");
    const title = text(b.title, 120);
    if (kinds.includes("other") && !title) throw new Error("Write the document name");
    await mutate((s) => {
      const file = fileOf(s, b.orderId ? { orderId: b.orderId } : { shipmentId: b.shipmentId });
      const admin = req.user.role === "admin";
      if (!file || (!admin && !file.parties.includes(req.user.id))) throw new Error("Shipment unavailable");
      if (admin && !!s.users.find((u) => u.id === file.ownerId)?.demo !== !!req.user.demo)
        throw new Error("Shipment unavailable");
      const from = b.from || (req.user.id === file.ownerId ? "" : file.ownerId);
      if (!from || from === req.user.id || !file.parties.includes(from))
        throw new Error("Choose who should upload it");
      if (file.requests.filter((r) => r.status === "open").length + kinds.length > 50)
        throw new Error("Too many requests");
      const now = new Date().toISOString();
      for (const kind of kinds)
        (s.documentRequests ||= []).push({
          id: id(),
          ...file.key,
          kind,
          title: kind === "other" ? title : "",
          note: text(b.note, 300),
          from,
          requestedBy: req.user.id,
          status: "open",
          createdAt: now,
        });
      notice(s, from, "document_requested", file.key.shipmentId, String(kinds.length));
    });
    res.status(201).json({ ok: true });
  });
  app.post("/api/document-requests/:id/cancel", async (req, res) => {
    await mutate((s) => {
      const r = (s.documentRequests || []).find((x) => x.id === req.params.id);
      if (!r || r.status !== "open") throw new Error("Document request unavailable");
      if (r.requestedBy !== req.user.id) throw new Error("Only the requester can cancel this request");
      r.status = "cancelled";
    });
    res.json({ ok: true });
  });
}
