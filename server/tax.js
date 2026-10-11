import { checkTaxFormat, euCountries, normalizeTaxId } from "../shared/tax.js";

const VIES = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

// Full tax check: offline check digits first, then the EU VIES service when it applies.
// Never throws; the result is stored on the account for the administrator to see.
export async function verifyTaxId(country, raw, fetcher = fetch) {
  const id = normalizeTaxId(raw);
  const base = checkTaxFormat(country, id);
  const result = { country, taxId: id, ...base, checkedAt: new Date().toISOString() };
  if (base.status === "invalid" || !euCountries.includes(country)) return result;
  // VIES expects Greece as "EL" and the number without the country prefix.
  const code = country === "GR" ? "EL" : country;
  const number = id.startsWith(code) ? id.slice(code.length) : id;
  try {
    const response = await fetcher(VIES, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ countryCode: code, vatNumber: number }),
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("VIES " + response.status);
    const data = await response.json();
    if (typeof data.valid !== "boolean") throw new Error("VIES answer");
    return {
      ...result,
      status: data.valid ? "valid" : "invalid",
      method: "eu_vies",
      registeredName: typeof data.name === "string" && data.name !== "---" ? data.name.slice(0, 200) : "",
      registeredAddress:
        typeof data.address === "string" && data.address !== "---" ? data.address.slice(0, 300) : "",
    };
  } catch {
    return { ...result, status: "format_ok", method: "eu_vies_unavailable" };
  }
}
