// Official holidays in Türkiye and Syria that can slow or stop customs and crossing traffic.
// Sources: Syria — Presidential Decree No. 188 of 2025 (SANA, 5 Oct 2025) with lunar dates from
// published calendars; Türkiye — official holiday list (Diyanet dates for religious holidays).
// Lunar (religious) dates depend on the moon sighting and may move by a day.
// "half" = afternoon off only (Türkiye: eve of religious holidays and Republic Day).
// The weekly rules review updates this list; add next year's dates before December.
const H = (country, date, days, key, name, extra = {}) => ({ country, date, days, key, name, ...extra });
const names = {
  newYear: ["رأس السنة الميلادية", "New Year's Day", "Yılbaşı"],
  fitr: ["عيد الفطر", "Eid al-Fitr", "Ramazan Bayramı"],
  fitrEve: [
    "وقفة عيد الفطر (نصف يوم)",
    "Eve of Eid al-Fitr (half day)",
    "Ramazan Bayramı arifesi (yarım gün)",
  ],
  adha: ["عيد الأضحى", "Eid al-Adha", "Kurban Bayramı"],
  adhaEve: [
    "وقفة عيد الأضحى (نصف يوم)",
    "Eve of Eid al-Adha (half day)",
    "Kurban Bayramı arifesi (yarım gün)",
  ],
  sovereignty: [
    "عيد السيادة الوطنية والطفل",
    "National Sovereignty and Children's Day",
    "Ulusal Egemenlik ve Çocuk Bayramı",
  ],
  labour: ["عيد العمال", "Labour Day", "Emek ve Dayanışma Günü"],
  youth: [
    "ذكرى أتاتورك وعيد الشباب والرياضة",
    "Atatürk, Youth and Sports Day",
    "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  ],
  democracy: [
    "يوم الديمقراطية والوحدة الوطنية",
    "Democracy and National Unity Day",
    "Demokrasi ve Millî Birlik Günü",
  ],
  victory: ["عيد النصر", "Victory Day", "Zafer Bayramı"],
  republicEve: [
    "عشية عيد الجمهورية (نصف يوم)",
    "Republic Day eve (half day)",
    "Cumhuriyet Bayramı arifesi (yarım gün)",
  ],
  republic: ["عيد الجمهورية", "Republic Day", "Cumhuriyet Bayramı"],
  revolution: ["يوم الثورة السورية", "Syrian Revolution Day", "Suriye Devrim Günü"],
  mothers: ["عيد الأم", "Mother's Day", "Anneler Günü"],
  easterWest: ["عيد الفصح (الغربي)", "Easter (Western)", "Paskalya (Batı)"],
  easterEast: ["عيد الفصح (الشرقي)", "Easter (Eastern)", "Paskalya (Doğu)"],
  independence: ["عيد الجلاء", "Independence Day", "Bağımsızlık Günü"],
  hijri: ["رأس السنة الهجرية", "Hijri New Year", "Hicri Yılbaşı"],
  mawlid: ["المولد النبوي", "Prophet's Birthday", "Mevlid Kandili"],
  liberation: ["يوم التحرير", "Liberation Day", "Kurtuluş Günü"],
  christmas: ["عيد الميلاد", "Christmas", "Noel"],
};
const lunar = { lunar: true };
const half = { half: true };

export const holidays = [
  // ---- Türkiye 2026 ----
  H("TR", "2026-01-01", 1, "newYear", names.newYear),
  H("TR", "2026-03-19", 1, "fitrEve", names.fitrEve, { ...half, ...lunar }),
  H("TR", "2026-03-20", 3, "fitr", names.fitr, lunar),
  H("TR", "2026-04-23", 1, "sovereignty", names.sovereignty),
  H("TR", "2026-05-01", 1, "labour", names.labour),
  H("TR", "2026-05-19", 1, "youth", names.youth),
  H("TR", "2026-05-26", 1, "adhaEve", names.adhaEve, { ...half, ...lunar }),
  H("TR", "2026-05-27", 4, "adha", names.adha, lunar),
  H("TR", "2026-07-15", 1, "democracy", names.democracy),
  H("TR", "2026-08-30", 1, "victory", names.victory),
  H("TR", "2026-10-28", 1, "republicEve", names.republicEve, half),
  H("TR", "2026-10-29", 1, "republic", names.republic),
  // ---- Türkiye 2027 ----
  H("TR", "2027-01-01", 1, "newYear", names.newYear),
  H("TR", "2027-03-08", 1, "fitrEve", names.fitrEve, { ...half, ...lunar }),
  H("TR", "2027-03-09", 3, "fitr", names.fitr, lunar),
  H("TR", "2027-04-23", 1, "sovereignty", names.sovereignty),
  H("TR", "2027-05-01", 1, "labour", names.labour),
  H("TR", "2027-05-15", 1, "adhaEve", names.adhaEve, { ...half, ...lunar }),
  H("TR", "2027-05-16", 4, "adha", names.adha, lunar),
  H("TR", "2027-07-15", 1, "democracy", names.democracy),
  H("TR", "2027-08-30", 1, "victory", names.victory),
  H("TR", "2027-10-28", 1, "republicEve", names.republicEve, half),
  H("TR", "2027-10-29", 1, "republic", names.republic),
  // ---- Syria 2026 (Decree 188 of 2025) ----
  H("SY", "2026-01-01", 1, "newYear", names.newYear),
  H("SY", "2026-03-18", 2, "revolution", names.revolution),
  H("SY", "2026-03-20", 4, "fitr", names.fitr, lunar),
  H("SY", "2026-03-21", 1, "mothers", names.mothers),
  H("SY", "2026-04-05", 1, "easterWest", names.easterWest),
  H("SY", "2026-04-12", 1, "easterEast", names.easterEast),
  H("SY", "2026-04-17", 1, "independence", names.independence),
  H("SY", "2026-05-01", 1, "labour", names.labour),
  H("SY", "2026-05-27", 3, "adha", names.adha, lunar),
  H("SY", "2026-06-16", 1, "hijri", names.hijri, lunar),
  H("SY", "2026-08-25", 1, "mawlid", names.mawlid, lunar),
  H("SY", "2026-12-08", 1, "liberation", names.liberation),
  H("SY", "2026-12-25", 1, "christmas", names.christmas),
  // ---- Syria 2027 ----
  H("SY", "2027-01-01", 1, "newYear", names.newYear),
  H("SY", "2027-03-09", 3, "fitr", names.fitr, lunar),
  H("SY", "2027-03-18", 1, "revolution", names.revolution),
  H("SY", "2027-03-21", 1, "mothers", names.mothers),
  H("SY", "2027-03-28", 1, "easterWest", names.easterWest),
  H("SY", "2027-04-17", 1, "independence", names.independence),
  H("SY", "2027-05-01", 1, "labour", names.labour),
  H("SY", "2027-05-02", 1, "easterEast", names.easterEast),
  H("SY", "2027-05-16", 4, "adha", names.adha, lunar),
  H("SY", "2027-06-06", 1, "hijri", names.hijri, lunar),
  H("SY", "2027-08-14", 1, "mawlid", names.mawlid, lunar),
  H("SY", "2027-12-08", 1, "liberation", names.liberation),
  H("SY", "2027-12-25", 1, "christmas", names.christmas),
];

const day = 86400000;
// Holidays are counted in local time at the border (UTC+3 in both countries).
const startOf = (h) => Date.parse(h.date + "T00:00:00+03:00") + (h.half ? 13 * 3600000 : 0);
const endOf = (h) => Date.parse(h.date + "T00:00:00+03:00") + h.days * day;

// Holidays happening now or later, soonest first.
export function upcomingHolidays(now = Date.now(), countries = ["TR", "SY"]) {
  return holidays
    .filter((h) => countries.includes(h.country) && endOf(h) > now)
    .map((h) => ({ ...h, start: startOf(h), end: endOf(h), active: startOf(h) <= now }))
    .sort((a, b) => a.start - b.start);
}

// Holidays that touch a shipping date (the day itself, or one day either side).
export function holidaysNear(date, countries = ["TR", "SY"]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return [];
  const t = Date.parse(date + "T12:00:00+03:00");
  return holidays
    .filter((h) => countries.includes(h.country))
    .filter((h) => t >= startOf(h) - day && t < endOf(h) + day);
}

// Last date in the list, so the site can warn when next year's dates are missing.
export const holidaysCoverUntil = holidays
  .map((h) => h.date)
  .sort()
  .at(-1);
