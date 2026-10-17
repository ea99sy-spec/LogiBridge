// Goods the platform does not accept. A shipment whose HS code starts with one of these codes,
// or whose title or description contains one of these words, is refused when it is created.
// The administrator edits both lists in the site settings. This automatic check is a first filter
// only: the administration also reviews shipment documents and can refuse any request by hand.
// The defaults cover goods banned almost everywhere; check them with a licensed customs broker.
export const DEFAULT_PROHIBITED = {
  hs: [
    "93", // arms and ammunition
    "3601", // propellent powders
    "3602", // prepared explosives
    "3603", // detonators, fuses
    "3604", // fireworks, signalling flares
    "2844", // radioactive elements and isotopes
  ],
  words: [
    "سلاح",
    "أسلحة",
    "اسلحة",
    "ذخيرة",
    "ذخائر",
    "متفجرات",
    "مخدرات",
    "كبتاغون",
    "كابتاغون",
    "حشيش",
    "كوكايين",
    "هيروين",
    "مواد مشعة",
    "weapon",
    "firearm",
    "ammunition",
    "explosive",
    "narcotic",
    "captagon",
    "cocaine",
    "heroin",
    "hashish",
    "radioactive",
    "silah",
    "mühimmat",
    "cephane",
    "patlayıcı",
    "uyuşturucu",
    "kokain",
    "eroin",
    "radyoaktif",
  ],
};

export function prohibitedRules(settings) {
  const p = settings?.prohibited;
  return {
    hs: Array.isArray(p?.hs) ? p.hs : DEFAULT_PROHIBITED.hs,
    words: Array.isArray(p?.words) ? p.words : DEFAULT_PROHIBITED.words,
  };
}

const norm = (v) =>
  String(v || "")
    .toLocaleLowerCase("tr")
    .replace(/[ً-ْـ]/g, "") // Arabic diacritics and tatweel
    .replace(/[إأآ]/g, "ا");

// Returns the reasons a shipment is refused (empty when the goods are accepted).
export function checkGoods({ hsCode, title, description }, rules) {
  const reasons = [];
  const code = String(hsCode || "").replace(/\D/g, "");
  for (const prefix of rules.hs) if (prefix && code.startsWith(String(prefix))) reasons.push("HS " + prefix);
  const textBody = ` ${norm(title)} ${norm(description)} `;
  for (const w of rules.words) {
    const word = norm(w).trim();
    if (word.length >= 3 && textBody.includes(word)) reasons.push(w);
  }
  return [...new Set(reasons)];
}
