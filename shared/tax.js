// Tax number checks that can be done without an external service.
// Türkiye: 10-digit VKN (companies) and 11-digit TCKN (sole traders) both carry
// check digits, so typing mistakes and invented numbers are caught immediately.
// EU countries can additionally be checked online through VIES (server side).

export const euCountries = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "GR",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

export function validTurkishVkn(value) {
  if (!/^\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i] + 9 - i) % 10;
    let p = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && p === 0) p = 9;
    sum += p;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

export function validTurkishTckn(value) {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8],
    even = d[1] + d[3] + d[5] + d[7];
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

export function normalizeTaxId(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[\s.\-/]/g, "");
}

// Returns { status: "valid" | "invalid" | "format_ok", method, note }
export function checkTaxFormat(country, raw) {
  const id = normalizeTaxId(raw);
  if (!/^[A-Z0-9]{3,40}$/.test(id)) return { status: "invalid", method: "format" };
  if (country === "TR") {
    if (/^\d{10}$/.test(id))
      return { status: validTurkishVkn(id) ? "valid" : "invalid", method: "tr_vkn_checksum" };
    if (/^\d{11}$/.test(id))
      return { status: validTurkishTckn(id) ? "valid" : "invalid", method: "tr_tckn_checksum" };
    return { status: "invalid", method: "tr_length" };
  }
  if (euCountries.includes(country)) return { status: "format_ok", method: "eu_vies_pending" };
  return { status: "format_ok", method: "manual" };
}
