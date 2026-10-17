// Required documents of an operation ("file"): the documents the companies working on it
// requested from each other. Used by the server (to block sending an incomplete
// request) and by the documents page (checklist and progress).

// No document is imposed by the platform: the required list is exactly what the companies on the
// operation asked for. (Kept as an empty map so a default can be added later if ever needed.)
export const DEFAULT_REQUIRED = { shipment: [], order: [] };
export const requestableKinds = [
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

// file: { type: "shipment" | "order", ownerId, supplierId?, docs: [...], requests: [...] }
export function checklist(file) {
  const docs = (file.docs || []).filter((d) => !String(d.kind || "").startsWith("photo_"));
  const from = file.type === "order" ? file.supplierId : file.ownerId;
  const items = (DEFAULT_REQUIRED[file.type] || []).map((kind) => {
    const matching = docs.filter((d) => d.kind === kind);
    return { key: "default:" + kind, kind, from, required: true, docs: matching, done: matching.length > 0 };
  });
  for (const r of file.requests || []) {
    if (r.status === "cancelled") continue;
    const matching = docs.filter((d) => d.requestId === r.id);
    items.push({
      key: "request:" + r.id,
      kind: r.kind,
      title: r.title || "",
      note: r.note || "",
      from: r.from,
      requestedBy: r.requestedBy,
      requestId: r.id,
      createdAt: r.createdAt,
      required: true,
      docs: matching,
      done: r.status === "done" || matching.length > 0,
    });
  }
  return items;
}

// Items a given account still has to upload.
export const missingFor = (items, userId) => items.filter((i) => !i.done && i.from === userId);
