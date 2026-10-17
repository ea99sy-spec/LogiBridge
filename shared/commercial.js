// Commercial invoice and packing list built from one set of item lines, so both documents always
// agree. The check compares them with the shipment (weight, HS code) and the prohibited list.
import { checkGoods } from "./prohibited.js";

export const UNITS = ["pcs", "kg", "ton", "box", "carton", "bag", "pallet", "roll", "m", "m2", "m3", "l"];
export const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function totals(doc) {
  const items = doc?.items || [];
  return {
    amount: Math.round(items.reduce((a, i) => a + num(i.qty) * num(i.unitPrice), 0) * 100) / 100,
    net: Math.round(items.reduce((a, i) => a + num(i.netKg), 0) * 100) / 100,
    gross: Math.round(items.reduce((a, i) => a + num(i.grossKg), 0) * 100) / 100,
    packages: items.reduce((a, i) => a + num(i.packages), 0),
  };
}

// Returns { errors, warnings } as translation keys with values.
export function checkCommercial(doc, shipment, rules) {
  const errors = [],
    warnings = [];
  const items = doc?.items || [];
  if (!items.length) errors.push({ key: "ccNoItems" });
  items.forEach((i, n) => {
    const line = n + 1;
    if (!String(i.description || "").trim()) errors.push({ key: "ccItemDescription", line });
    if (!/^\d{6,12}$/.test(String(i.hsCode || ""))) errors.push({ key: "ccItemHs", line });
    if (num(i.qty) <= 0) errors.push({ key: "ccItemQty", line });
    if (num(i.grossKg) > 0 && num(i.netKg) > num(i.grossKg)) errors.push({ key: "ccNetOverGross", line });
    if (rules && checkGoods({ hsCode: i.hsCode, title: i.description, description: "" }, rules).length)
      errors.push({ key: "ccProhibited", line });
    if (
      shipment?.hsCode &&
      /^\d{6,12}$/.test(String(i.hsCode || "")) &&
      String(i.hsCode).slice(0, 4) !== String(shipment.hsCode).slice(0, 4)
    )
      warnings.push({ key: "ccHsDiffers", line });
  });
  if (!String(doc?.seller?.name || "").trim()) errors.push({ key: "ccSeller" });
  if (!String(doc?.buyer?.name || "").trim()) errors.push({ key: "ccBuyer" });
  const t = totals(doc);
  const declared = num(shipment?.weight);
  if (declared > 0 && t.gross > 0 && Math.abs(t.gross - declared) / declared > 0.1)
    warnings.push({ key: "ccWeightDiffers", gross: t.gross, declared });
  if (items.some((i) => num(i.grossKg) <= 0)) warnings.push({ key: "ccMissingWeights" });
  return { errors, warnings };
}
