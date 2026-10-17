import { readState, mutate } from "./store.js";
import { checkCommercial, totals, UNITS, INCOTERMS } from "../shared/commercial.js";
import { prohibitedRules } from "../shared/prohibited.js";
import { shipmentParties } from "./documents.js";

const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const n = (v, max = 1e9) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x * 1000) / 1000 : 0;
};
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

function clean(b) {
  return {
    number: text(b.number, 40),
    date: /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ? b.date : new Date().toISOString().slice(0, 10),
    currency: ["USD", "EUR", "TRY", "SYP"].includes(b.currency) ? b.currency : "USD",
    incoterm: INCOTERMS.includes(b.incoterm) ? b.incoterm : "",
    origin: text(b.origin, 60),
    seller: {
      name: text(b.seller?.name, 160),
      address: text(b.seller?.address, 300),
      taxId: text(b.seller?.taxId, 40),
    },
    buyer: {
      name: text(b.buyer?.name, 160),
      address: text(b.buyer?.address, 300),
      taxId: text(b.buyer?.taxId, 40),
    },
    marks: text(b.marks, 200),
    items: (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((i) => ({
      description: text(i.description, 200),
      hsCode: text(i.hsCode, 12).replace(/\D/g, ""),
      qty: n(i.qty),
      unit: UNITS.includes(i.unit) ? i.unit : "pcs",
      unitPrice: n(i.unitPrice),
      netKg: n(i.netKg),
      grossKg: n(i.grossKg),
      packages: Math.round(n(i.packages, 100000)),
    })),
  };
}

const L = {
  invoice: ["فاتورة تجارية", "COMMERCIAL INVOICE"],
  packing: ["قائمة تعبئة", "PACKING LIST"],
  seller: ["البائع / المصدّر", "Seller / Exporter"],
  buyer: ["المشتري / المستورد", "Buyer / Importer"],
  no: ["رقم", "No."],
  date: ["التاريخ", "Date"],
  incoterm: ["شروط التسليم", "Incoterm"],
  origin: ["بلد المنشأ", "Country of origin"],
  desc: ["الوصف", "Description"],
  hs: ["رمز HS", "HS code"],
  qty: ["الكمية", "Qty"],
  unit: ["الوحدة", "Unit"],
  price: ["سعر الوحدة", "Unit price"],
  amount: ["القيمة", "Amount"],
  pk: ["الطرود", "Packages"],
  net: ["الوزن الصافي (كغ)", "Net kg"],
  gross: ["الوزن القائم (كغ)", "Gross kg"],
  total: ["المجموع", "Total"],
  marks: ["العلامات", "Marks"],
  route: ["الطريق", "Route"],
  sign: ["التوقيع والختم", "Signature & stamp"],
  tax: ["الرقم الضريبي", "Tax no."],
};
const h = (k) => `${L[k][0]} / ${L[k][1]}`;

function page(kind, d, sh) {
  const t = totals(d);
  const party = (p, k) =>
    `<div class="party"><b>${h(k)}</b><p>${esc(p.name)}</p><p>${esc(p.address)}</p>${p.taxId ? `<p>${h("tax")}: ${esc(p.taxId)}</p>` : ""}</div>`;
  const rows = d.items
    .map(
      (i, x) =>
        `<tr><td>${x + 1}</td><td>${esc(i.description)}</td><td>${esc(i.hsCode)}</td>${
          kind === "invoice"
            ? `<td>${i.qty}</td><td>${esc(i.unit)}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.qty * i.unitPrice).toFixed(2)}</td>`
            : `<td>${i.packages}</td><td>${i.qty} ${esc(i.unit)}</td><td>${i.netKg}</td><td>${i.grossKg}</td>`
        }</tr>`,
    )
    .join("");
  const head =
    kind === "invoice"
      ? `<th>#</th><th>${h("desc")}</th><th>${h("hs")}</th><th>${h("qty")}</th><th>${h("unit")}</th><th>${h("price")} (${esc(d.currency)})</th><th>${h("amount")} (${esc(d.currency)})</th>`
      : `<th>#</th><th>${h("desc")}</th><th>${h("hs")}</th><th>${h("pk")}</th><th>${h("qty")}</th><th>${h("net")}</th><th>${h("gross")}</th>`;
  const foot =
    kind === "invoice"
      ? `<tr><th colspan="6">${h("total")}</th><th>${t.amount.toFixed(2)} ${esc(d.currency)}</th></tr>`
      : `<tr><th colspan="3">${h("total")}</th><th>${t.packages}</th><th></th><th>${t.net}</th><th>${t.gross}</th></tr>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(L[kind][1])} ${esc(d.number)}</title>
<style>body{font:13px/1.5 "Segoe UI",Tahoma,Arial,sans-serif;color:#102a56;margin:0;padding:24px;background:#fff}h1{margin:0;font-size:22px}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #facc15;padding-bottom:10px;margin-bottom:14px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.party{border:1px solid #d5dde9;border-radius:8px;padding:8px 10px}.party p{margin:2px 0}.meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cfd8e6;padding:6px;text-align:start;vertical-align:top}thead th,tfoot th{background:#fff8db}.sign{margin-top:40px;display:flex;justify-content:space-between}.sign div{border-top:1px solid #102a56;padding-top:4px;min-width:220px}.bar{margin-bottom:14px}.bar button{font:inherit;padding:8px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;cursor:pointer}.note{color:#6b7f9e;font-size:11px}@media print{.bar{display:none}body{padding:0}}</style></head><body>
<div class="bar"><button onclick="window.print()">🖨 طباعة / حفظ PDF — Print / Save as PDF</button></div>
<div class="top"><div><h1>${h(kind)}</h1><div>${h("no")}: <b>${esc(d.number || "—")}</b> · ${h("date")}: <b>${esc(d.date)}</b></div></div><div style="text-align:left"><b>LogiBridge</b><div class="note">${esc(sh.title)}</div></div></div>
<div class="parties">${party(d.seller, "seller")}${party(d.buyer, "buyer")}</div>
<div class="meta">${d.incoterm ? `<span>${h("incoterm")}: <b>${esc(d.incoterm)}</b></span>` : ""}${d.origin ? `<span>${h("origin")}: <b>${esc(d.origin)}</b></span>` : ""}<span>${h("route")}: <b>${esc(sh.origin)} → ${esc(sh.destination)}</b></span>${d.marks ? `<span>${h("marks")}: <b>${esc(d.marks)}</b></span>` : ""}</div>
<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody><tfoot>${foot}</tfoot></table>
<div class="sign"><div>${h("sign")}</div><div class="note">LogiBridge · ${esc(new Date().toISOString().slice(0, 10))}</div></div>
</body></html>`;
}

export function commercialRoutes(app) {
  app.post("/api/shipments/:id/commercial-docs", async (req, res) => {
    const doc = clean(req.body || {});
    let result;
    await mutate((s) => {
      const sh = s.shipments.find((x) => x.id === req.params.id && !x.parentId);
      if (!sh || sh.ownerId !== req.user.id) throw new Error("Shipment unavailable");
      result = checkCommercial(doc, sh, prohibitedRules(s.settings));
      if (result.errors.some((e) => e.key === "ccProhibited"))
        throw new Error("Prohibited goods: this request cannot be accepted");
      sh.commercialDocs = { ...doc, updatedAt: new Date().toISOString() };
    });
    res.json({ ok: true, ...result });
  });
  app.get("/api/shipments/:id/commercial-docs/:kind", (req, res) => {
    if (!["invoice", "packing"].includes(req.params.kind)) return res.sendStatus(404);
    const s = readState();
    const sh = s.shipments.find((x) => x.id === req.params.id && !x.parentId);
    if (!sh?.commercialDocs) return res.sendStatus(404);
    const allowed =
      (req.user.role === "admin" && !!s.users.find((u) => u.id === sh.ownerId)?.demo === !!req.user.demo) ||
      shipmentParties(s, sh).includes(req.user.id);
    if (!allowed) return res.sendStatus(403);
    res.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    );
    res.type("html").send(page(req.params.kind, sh.commercialDocs, sh));
  });
}
