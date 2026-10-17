import { readState } from "./store.js";
import { requiresApproval } from "../shared/access.js";
import { reputationOf } from "./insights.js";
import { crossings } from "../shared/crossings.js";
import { crossingTimes } from "../shared/crossingTimes.js";
import { cities, cityKey, corridors, corridorBySlug, nearestCrossings } from "../shared/corridors.js";

// Public pages that need no account: a page for each approved company (it can turn it off),
// a page for each main Türkiye ⇄ Syria route, and the sitemap for search engines.
// Prices are only ever shown from at least MIN real deals; nothing is invented.

const MIN = 3;
const site = () =>
  (process.env.URL || process.env.SITE_URL || "https://logibridge-app.netlify.app").replace(/\/$/, "");
const slugify = (v) =>
  String(v || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
export const companySlug = (u) =>
  [slugify(u.name), u.id.replace(/-/g, "").slice(0, 8)].filter(Boolean).join("-");

export function publicCompanies(s) {
  return s.users.filter(
    (u) =>
      !u.demo &&
      u.role !== "admin" &&
      !u.disabled &&
      u.accountType !== "individual" &&
      !requiresApproval(u) &&
      u.profile?.about &&
      u.profile?.publicPage !== false,
  );
}
const findCompany = (s, slug) => {
  const tail = String(slug || "")
    .split("-")
    .at(-1);
  return publicCompanies(s).find((u) => tail.length === 8 && companySlug(u) === slug);
};

const median = (a) => {
  const v = [...a].sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const pct = (a, p) => {
  const v = [...a].sort((x, y) => x - y);
  return v[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * p)))];
};

// Whole-route prices: a Türkiye⇄Syria order counts once all three stages were agreed (sum of
// the three accepted offers); other shipments count with their accepted offer.
export function corridorDeals(s, from, to) {
  const bid = (id) => (s.bids || []).find((b) => b.id === id);
  const out = [];
  for (const sh of s.shipments || []) {
    if (sh.parentId || ["cancelled", "rejected"].includes(sh.status)) continue;
    if (cityKey(sh.origin) !== from || cityKey(sh.destination) !== to) continue;
    const owner = s.users.find((u) => u.id === sh.ownerId);
    if (!owner || owner.demo) continue;
    if (sh.isOrder) {
      const legs = (sh.legs || []).map((id) => s.shipments.find((x) => x.id === id));
      const bids = legs.map((l) => l?.bidId && bid(l.bidId));
      if (!bids.length || bids.some((b) => !b?.price)) continue;
      out.push({
        price: bids.reduce((a, b) => a + b.price, 0),
        days: bids.reduce((a, b) => a + (+b.days || 0), 0),
      });
    } else if (sh.bidId && bid(sh.bidId)?.price)
      out.push({ price: bid(sh.bidId).price, days: +bid(sh.bidId).days || 0 });
  }
  return out;
}

const mentions = (text, key) => {
  const v = String(text || "").toLocaleLowerCase("tr");
  const c = cities[key];
  return [key, ...c.n, ...c.a].some((x) => x && v.includes(String(x).toLocaleLowerCase("tr")));
};

export function corridorData(s, slug) {
  const r = corridorBySlug(slug);
  if (!r) return null;
  const deals = corridorDeals(s, r.from, r.to);
  const prices = deals.map((d) => d.price);
  const near = nearestCrossings(r.from, r.to);
  const providers = publicCompanies(s)
    .filter(
      (u) =>
        (u.accountType === "carrier" &&
          (mentions(u.details?.routes, r.from) || mentions(u.details?.routes, r.to))) ||
        (u.accountType === "broker" && (u.details?.crossings || []).some((c) => near.includes(c))),
    )
    .slice(0, 12)
    .map((u) => ({ name: u.name, slug: companySlug(u), accountType: u.accountType, ...pickRep(s, u) }));
  return {
    ...r,
    crossings: near.map((k) => ({
      key: k,
      tr: crossings[k].tr,
      sy: crossings[k].sy,
      status: crossings[k].status,
      best: crossingTimes(s.crossingStats, k).best,
      reports: crossingTimes(s.crossingStats, k).reports,
    })),
    price:
      prices.length >= MIN
        ? {
            enough: true,
            deals: prices.length,
            median: Math.round(median(prices)),
            low: Math.round(pct(prices, 0.25)),
            high: Math.round(pct(prices, 0.75)),
            days: Math.round(median(deals.map((d) => d.days))),
          }
        : { enough: false, deals: prices.length, min: MIN },
    providers,
    related: corridors()
      .filter((x) => x.slug !== r.slug && (x.from === r.from || x.to === r.to))
      .slice(0, 12)
      .map((x) => x.slug),
  };
}
function pickRep(s, u) {
  const r = reputationOf(s, u.id);
  return { rating: r.rating, reviews: r.reviews, completed: r.completed, level: r.level };
}

export function publicPageRoutes(app) {
  app.get("/api/public/company/:slug", (req, res) => {
    const s = readState();
    const u = findCompany(s, req.params.slug);
    if (!u) return res.status(404).json({ error: "Profile unavailable" });
    const d = u.details || {};
    const rep = reputationOf(s, u.id);
    res.json({
      name: u.name,
      slug: companySlug(u),
      accountType: u.accountType,
      verified: !!u.verified,
      memberSince: u.createdAt || null,
      logo: u.profile?.logo || null,
      about: u.profile.about,
      services: u.profile.services || "",
      location: u.profile.location || "",
      website: u.profile.website || "",
      country: d.country || "",
      city: d.city || "",
      routes: u.accountType === "carrier" ? d.routes || "" : "",
      fleetSize: u.accountType === "carrier" ? d.fleetSize || null : null,
      crossings: u.accountType === "broker" && Array.isArray(d.crossings) ? d.crossings : [],
      activity: u.accountType === "merchant" ? d.activity || "" : "",
      rating: rep.rating,
      reviewCount: rep.reviews,
      completed: rep.completed,
      onTimePct: rep.onTimePct,
      onTimeCount: rep.onTimeCount,
      level: rep.level,
      // Comments only, without the names of the companies that wrote them.
      reviews: (s.ratings || [])
        .filter((r) => r.targetId === u.id && r.comment)
        .slice(-6)
        .reverse()
        .map((r) => ({ score: r.score, comment: r.comment.slice(0, 300), at: r.createdAt || null })),
    });
  });
  app.get("/api/public/routes", (req, res) => {
    const s = readState();
    res.json({
      routes: corridors().map((r) => ({ ...r, deals: corridorDeals(s, r.from, r.to).length })),
      min: MIN,
    });
  });
  app.get("/api/public/routes/:slug", (req, res) => {
    const data = corridorData(readState(), req.params.slug);
    if (!data) return res.status(404).json({ error: "Route unavailable" });
    res.json(data);
  });
}

// Served at /sitemap.xml and /robots.txt (Netlify forwards both to the API function).
export function seoRoutes(app) {
  const sitemap = (req, res) => {
    const base = site();
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      ["/", "weekly", "1.0"],
      ["/border", "daily", "0.8"],
      ["/routes", "weekly", "0.8"],
      ...corridors().map((r) => ["/routes/" + r.slug, "weekly", "0.6"]),
      ...publicCompanies(readState()).map((u) => ["/c/" + companySlug(u), "weekly", "0.5"]),
      ["/terms", "yearly", "0.2"],
      ["/privacy", "yearly", "0.2"],
      ["/sales-terms", "yearly", "0.2"],
    ];
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              ([p, f, pr]) =>
                `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`,
            )
            .join("\n") +
          `\n</urlset>\n`,
      );
  };
  const robots = (req, res) =>
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=86400")
      .send(
        `User-agent: *\nAllow: /\nAllow: /api/public/\nDisallow: /workspace/\nDisallow: /api/\nDisallow: /team-invite\nDisallow: /reset-password\nDisallow: /verify-email\nDisallow: /t/\n\nSitemap: ${site()}/sitemap.xml\n`,
      );
  app.get(["/sitemap.xml", "/api/sitemap.xml", "/api/seo/sitemap.xml"], sitemap);
  app.get(["/robots.txt", "/api/robots.txt", "/api/seo/robots.txt"], robots);
}
