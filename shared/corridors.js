import { crossings } from "./crossings.js";

// Main Türkiye ⇄ Syria city pairs, used for the public route pages and the sitemap.
// Names in Arabic / English / Turkish plus common spellings people type in the shipment form.
export const cities = {
  istanbul: {
    c: "TR",
    n: ["إسطنبول", "Istanbul", "İstanbul"],
    lat: 41.01,
    lng: 28.98,
    a: ["istanbul", "İstanbul", "اسطنبول"],
  },
  ankara: { c: "TR", n: ["أنقرة", "Ankara", "Ankara"], lat: 39.93, lng: 32.86, a: ["انقرة"] },
  izmir: { c: "TR", n: ["إزمير", "Izmir", "İzmir"], lat: 38.42, lng: 27.14, a: ["izmir", "İzmir", "ازمير"] },
  bursa: { c: "TR", n: ["بورصة", "Bursa", "Bursa"], lat: 40.19, lng: 29.06, a: ["بورصا"] },
  konya: { c: "TR", n: ["قونية", "Konya", "Konya"], lat: 37.87, lng: 32.48, a: ["قونيا"] },
  adana: { c: "TR", n: ["أضنة", "Adana", "Adana"], lat: 37.0, lng: 35.32, a: ["اضنة"] },
  mersin: { c: "TR", n: ["مرسين", "Mersin", "Mersin"], lat: 36.8, lng: 34.63, a: [] },
  gaziantep: {
    c: "TR",
    n: ["غازي عنتاب", "Gaziantep", "Gaziantep"],
    lat: 37.07,
    lng: 37.38,
    a: ["antep", "عنتاب", "غازي عينتاب"],
  },
  hatay: {
    c: "TR",
    n: ["هاتاي (أنطاكيا)", "Hatay (Antakya)", "Hatay (Antakya)"],
    lat: 36.2,
    lng: 36.16,
    a: ["antakya", "انطاكيا", "أنطاكيا", "هاتاي", "reyhanli", "reyhanlı", "الريحانية"],
  },
  sanliurfa: {
    c: "TR",
    n: ["أورفا", "Şanlıurfa", "Şanlıurfa"],
    lat: 37.16,
    lng: 38.79,
    a: ["urfa", "sanliurfa", "şanlıurfa", "اورفا"],
  },
  aleppo: { c: "SY", n: ["حلب", "Aleppo", "Halep"], lat: 36.2, lng: 37.13, a: ["halep", "halab"] },
  idlib: { c: "SY", n: ["إدلب", "Idlib", "İdlib"], lat: 35.93, lng: 36.63, a: ["idlib", "İdlib", "ادلب"] },
  damascus: {
    c: "SY",
    n: ["دمشق", "Damascus", "Şam"],
    lat: 33.51,
    lng: 36.29,
    a: ["şam", "sam", "dimashq", "الشام"],
  },
  homs: { c: "SY", n: ["حمص", "Homs", "Humus"], lat: 34.73, lng: 36.71, a: ["humus"] },
  hama: { c: "SY", n: ["حماة", "Hama", "Hama"], lat: 35.13, lng: 36.75, a: ["حماه"] },
  latakia: {
    c: "SY",
    n: ["اللاذقية", "Latakia", "Lazkiye"],
    lat: 35.52,
    lng: 35.78,
    a: ["lazkiye", "lattakia", "اللادقية"],
  },
};

const norm = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ");
// The city key a free-text city name refers to, or null.
export function cityKey(name) {
  const v = norm(name);
  if (!v) return null;
  for (const [k, c] of Object.entries(cities))
    if (
      [k, ...c.n, ...c.a].some(
        (x) => norm(x) === v || v.startsWith(norm(x) + " ") || v.startsWith(norm(x) + ","),
      )
    )
      return k;
  return null;
}

export const corridorSlug = (from, to) => `${from}-${to}`;
export function corridors() {
  const tr = Object.keys(cities).filter((k) => cities[k].c === "TR");
  const sy = Object.keys(cities).filter((k) => cities[k].c === "SY");
  const out = [];
  for (const a of tr) for (const b of sy) out.push({ from: a, to: b }, { from: b, to: a });
  return out.map((x) => ({ ...x, slug: corridorSlug(x.from, x.to) }));
}
export function corridorBySlug(slug) {
  const [from, to] = String(slug || "").split("-");
  if (!cities[from] || !cities[to] || cities[from].c === cities[to].c) return null;
  return { from, to, slug: corridorSlug(from, to) };
}

const km = (a, b) => {
  const R = 6371,
    rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad,
    dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
// Open crossings ranked by how little they bend the straight line between the two cities.
export function nearestCrossings(from, to, n = 2) {
  const a = cities[from],
    b = cities[to];
  return Object.entries(crossings)
    .filter(([, c]) => c.status === "open")
    .map(([k, c]) => ({ key: k, detour: km(a, c) + km(c, b) }))
    .sort((x, y) => x.detour - y.detour)
    .slice(0, n)
    .map((x) => x.key);
}
