import test from "node:test";
import assert from "node:assert/strict";
import {
  countryCodes,
  validCountry,
  countryOptions,
  countryName,
  officialRegistries,
} from "../shared/countries.js";
test("international countries are unique ISO codes with translated labels", () => {
  assert.equal(countryCodes.length, 249);
  assert.equal(new Set(countryCodes).size, 249);
  for (const lang of ["ar", "en", "tr"]) {
    const options = countryOptions(lang);
    assert.equal(options.length, 249);
    assert.deepEqual(
      options.slice(0, 2).map((x) => x.code),
      ["TR", "SY"],
    );
    assert.ok(options.every((x) => x.label && x.code.length === 2));
  }
  assert.notEqual(countryName("DE", "ar"), countryName("DE", "en"));
  for (const c of ["TR", "SY", "DE", "US", "AE", "BR", "JP"]) assert.equal(validCountry(c), true);
  for (const c of ["other", "XX", "Turkey", "", null]) assert.equal(validCountry(c), false);
});
test("country authority links never send international companies to the wrong registry", () => {
  assert.ok(officialRegistries.TR.url.includes("ticaret.gov.tr"));
  assert.ok(officialRegistries.SY.url.includes("mei.gov.sy"));
  assert.equal(officialRegistries.DE, undefined);
  assert.equal(officialRegistries.US, undefined);
});
