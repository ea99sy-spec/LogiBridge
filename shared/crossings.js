// Türkiye–Syria border crossings used on the platform.
// Status notes are summaries of public reports; the border page shows dates and sources.
// lat/lng: approximate gate position, used to detect when a truck reaches or leaves the crossing.
export const crossings = {
  bab: { tr: "Cilvegözü (Reyhanlı)", sy: "Bab al-Hawa", status: "open", lat: 36.222, lng: 36.665 },
  salameh: { tr: "Öncüpınar (Kilis)", sy: "Bab al-Salama (Azaz)", status: "open", lat: 36.641, lng: 37.083 },
  rai: { tr: "Çobanbey", sy: "Al-Rai", status: "open", lat: 36.664, lng: 37.476 },
  jarablus: { tr: "Karkamış", sy: "Jarablus", status: "upgrading", lat: 36.828, lng: 38.006 },
  tal_abyad: { tr: "Akçakale", sy: "Tal Abyad", status: "upgrading", lat: 36.704, lng: 38.951 },
  kasab: { tr: "Yayladağı", sy: "Kasab", status: "check", lat: 35.913, lng: 35.978 },
};
export const crossingKeys = Object.keys(crossings);

// Since 6 February 2026, non-Syrian trucks may not enter Syria through land crossings
// (escorted transit excepted). Goods are moved between trucks in the crossing's customs
// yard, so a Türkiye⇄Syria shipment runs as three stages with separate providers.
export const legTypes = ["origin_leg", "clearance", "destination_leg"];

export function splitCrossBorder(route) {
  const c = crossings[route.crossing];
  const fromTR = route.originCountry === "TR";
  const originSide = fromTR ? c.tr : c.sy,
    destinationSide = fromTR ? c.sy : c.tr;
  return [
    {
      legType: "origin_leg",
      legIndex: 0,
      originCountry: route.originCountry,
      destinationCountry: route.originCountry,
      transportType: fromTR ? "domesticTR" : "domesticSY",
      to: originSide,
    },
    {
      legType: "clearance",
      legIndex: 1,
      originCountry: route.originCountry,
      destinationCountry: route.destinationCountry,
      transportType: "clearance",
      from: originSide,
      to: destinationSide,
    },
    {
      legType: "destination_leg",
      legIndex: 2,
      originCountry: route.destinationCountry,
      destinationCountry: route.destinationCountry,
      transportType: fromTR ? "domesticSY" : "domesticTR",
      from: destinationSide,
    },
  ];
}
