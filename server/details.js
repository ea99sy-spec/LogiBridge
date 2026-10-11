import { validCountry } from "../shared/countries.js";

const text = (v, max, label, optional = false) => {
  const value = typeof v === "string" ? v.trim() : "";
  if (!value) {
    if (optional) return "";
    throw new Error("Required field missing");
  }
  if (value.length > max) throw new Error("Text too long");
  return value;
};

// Registration details that differ by account type.
export function readDetails(accountType, b) {
  const phone = text(b.phone, 30);
  if (!/^\+?[0-9 ()-]{6,30}$/.test(phone)) throw new Error("Invalid phone number");
  if (!validCountry(b.country)) throw new Error("Valid country required");
  const details = { phone, country: b.country, city: text(b.city, 80) };
  if (accountType === "merchant") {
    if (!["import", "export", "both"].includes(b.activity)) throw new Error("Choose the trade activity");
    details.activity = b.activity;
    details.products = text(b.products, 300);
  } else if (accountType === "carrier") {
    details.license = text(b.license, 60);
    const fleet = Number(b.fleetSize);
    if (!Number.isInteger(fleet) || fleet < 1 || fleet > 10000) throw new Error("Invalid fleet size");
    details.fleetSize = fleet;
    details.routes = text(b.routes, 300);
  } else if (accountType === "supplier") {
    details.equipment = text(b.equipment, 300);
    details.warehouse = text(b.warehouse, 120, "warehouse", true);
  }
  return details;
}
