import React, { useEffect, useState } from "react";
import { cities, corridorBySlug } from "../shared/corridors";
import { crossings } from "../shared/crossings";
import { SLOTS } from "../shared/crossingTimes";
import { ReputationChips } from "./Reputation";
import "./public-pages.css";

// Public pages (no account): a company's page, the route index and one page per route.

const L = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));
const cityName = (k, lang) => cities[k]?.n[L(lang)] || k;
const arrow = (lang) => (lang === "ar" ? "←" : "→");
const usd = (n) => "$" + Number(n).toLocaleString("en");

function setMeta(title, description) {
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (!m) {
    m = document.createElement("meta");
    m.name = "description";
    document.head.appendChild(m);
  }
  m.content = description;
}

function Shell({ langSelect, t, children }) {
  return (
    <div className="legal-page public-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <nav className="public-nav">
          <a href="/routes">{t("routesTitle")}</a>
          <a href="/border">{t("borderRules")}</a>
          {langSelect}
        </nav>
      </header>
      <main className="legal-content">{children}</main>
      <footer className="public-footer">
        <a href="/">LogiBridge</a> · <a href="/terms">{t("termsLink")}</a> ·{" "}
        <a href="/privacy">{t("privacyLink")}</a>
      </footer>
    </div>
  );
}

function useJson(url) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    fetch(url)
      .then(async (r) => setState(r.ok ? { data: await r.json() } : { error: true }))
      .catch(() => setState({ error: true }));
  }, [url]);
  return state;
}

function Cta({ t, text }) {
  return (
    <section className="public-cta">
      <p>{text || t("publicCtaText")}</p>
      <a className="button" href="/accounts">
        {t("publicCtaButton")}
      </a>
    </section>
  );
}

export function CompanyPublic({ t, lang, langSelect }) {
  const slug = decodeURIComponent(window.location.pathname.split("/")[2] || "");
  const { data: c, error, loading } = useJson("/api/public/company/" + encodeURIComponent(slug));
  useEffect(() => {
    if (c) setMeta(`${c.name} — LogiBridge`, (c.about || "").slice(0, 160));
  }, [c]);
  return (
    <Shell t={t} langSelect={langSelect}>
      {loading ? (
        <p className="muted">{t("loading")}</p>
      ) : error ? (
        <>
          <h1>{t("companyPageMissing")}</h1>
          <p>{t("companyPageMissingNote")}</p>
          <a href="/">← LogiBridge</a>
        </>
      ) : (
        <>
          <section className="company-hero">
            {c.logo ? (
              <img src={c.logo} alt="" className="company-logo" />
            ) : (
              <span className="company-logo placeholder">{c.name.slice(0, 2)}</span>
            )}
            <div>
              <h1 dir="auto">{c.name}</h1>
              <p className="muted">
                {t(c.accountType)}
                {c.verified && <span className="verified-chip">✓ {t("verifiedByPlatform")}</span>}
              </p>
              <ReputationChips rep={c} t={t} kind={c.accountType} />
            </div>
          </section>
          <div className="company-stats">
            <div>
              <strong>{c.rating ? `★ ${c.rating}` : "—"}</strong>
              <small>
                {t("ratingLabel")} ({c.reviewCount})
              </small>
            </div>
            <div>
              <strong>{c.completed}</strong>
              <small>{t("completedOps")}</small>
            </div>
            {c.onTimeCount > 0 && (
              <div>
                <strong>{c.onTimePct}%</strong>
                <small>{t("mrOnTime")}</small>
              </div>
            )}
            {c.fleetSize && (
              <div>
                <strong>{c.fleetSize}</strong>
                <small>{t("fleetSizeLabel")}</small>
              </div>
            )}
            {c.memberSince && (
              <div>
                <strong>
                  {new Date(c.memberSince).toLocaleDateString(lang, { month: "short", year: "numeric" })}
                </strong>
                <small>{t("memberSince")}</small>
              </div>
            )}
          </div>
          <section>
            <h2>{t("aboutCompany")}</h2>
            <p dir="auto" className="pre-line">
              {c.about}
            </p>
          </section>
          {c.services && (
            <section>
              <h2>{t("servicesLabel")}</h2>
              <p dir="auto" className="pre-line">
                {c.services}
              </p>
            </section>
          )}
          {(c.routes || c.crossings.length > 0 || c.activity) && (
            <section>
              <h2>{t("workAreas")}</h2>
              {c.routes && <p dir="auto">🛣 {c.routes}</p>}
              {c.crossings.length > 0 && <p>🛂 {c.crossings.map((k) => t(k)).join(" · ")}</p>}
              {c.activity && <p dir="auto">📦 {c.activity}</p>}
            </section>
          )}
          {(c.location || c.city || c.website) && (
            <p className="muted">
              {[c.location || c.city].filter(Boolean).join(" · ")}
              {c.website && (
                <>
                  {" · "}
                  <a href={c.website} target="_blank" rel="noreferrer nofollow" dir="ltr">
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </p>
          )}
          {c.reviews.length > 0 && (
            <section>
              <h2>{t("clientReviews")}</h2>
              <ul className="public-reviews">
                {c.reviews.map((r, i) => (
                  <li key={i}>
                    <b>{"★".repeat(r.score)}</b> <span dir="auto">“{r.comment}”</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Cta t={t} text={t("companyCta").replace("{name}", c.name)} />
        </>
      )}
    </Shell>
  );
}

export function RoutesIndex({ t, lang, langSelect }) {
  const { data } = useJson("/api/public/routes");
  useEffect(() => setMeta(`${t("routesTitle")} — LogiBridge`, t("routesIntro")), [lang]);
  const toSY = (data?.routes || []).filter((r) => cities[r.from].c === "TR");
  const toTR = (data?.routes || []).filter((r) => cities[r.from].c === "SY");
  const block = (title, list) => (
    <section>
      <h2>{title}</h2>
      <div className="route-links">
        {list.map((r) => (
          <a key={r.slug} href={`/routes/${r.slug}`}>
            {cityName(r.from, lang)} {arrow(lang)} {cityName(r.to, lang)}
            {r.deals >= (data.min || 3) && <small> · {t("hasPrices")}</small>}
          </a>
        ))}
      </div>
    </section>
  );
  return (
    <Shell t={t} langSelect={langSelect}>
      <h1>{t("routesTitle")}</h1>
      <p>{t("routesIntro")}</p>
      {!data ? (
        <p className="muted">{t("loading")}</p>
      ) : (
        <>
          {block(t("routesToSyria"), toSY)}
          {block(t("routesToTurkey"), toTR)}
        </>
      )}
      <Cta t={t} />
    </Shell>
  );
}

export function RoutePage({ t, lang, langSelect }) {
  const slug = window.location.pathname.split("/")[2] || "";
  const known = corridorBySlug(slug);
  const { data: r, error } = useJson("/api/public/routes/" + encodeURIComponent(slug));
  const from = known && cityName(known.from, lang),
    to = known && cityName(known.to, lang);
  useEffect(() => {
    if (known)
      setMeta(
        `${t("routeTitle").replace("{from}", from).replace("{to}", to)} — LogiBridge`,
        t("routeIntro").replace("{from}", from).replace("{to}", to),
      );
  }, [lang, slug]);
  const dayName = (d) =>
    new Date(Date.UTC(2026, 0, 4 + d)).toLocaleDateString(lang, { weekday: "long", timeZone: "UTC" });
  if (!known || error)
    return (
      <Shell t={t} langSelect={langSelect}>
        <h1>{t("routeMissing")}</h1>
        <a href="/routes">← {t("routesTitle")}</a>
      </Shell>
    );
  const fromTR = cities[known.from].c === "TR";
  return (
    <Shell t={t} langSelect={langSelect}>
      <p className="crumbs">
        <a href="/routes">{t("routesTitle")}</a> ›
      </p>
      <h1>{t("routeTitle").replace("{from}", from).replace("{to}", to)}</h1>
      <p>{t("routeIntro").replace("{from}", from).replace("{to}", to)}</p>
      <section>
        <h2>{t("routeHowTitle")}</h2>
        <ul className="route-stages">
          <li>
            <b>{t("routeStage1")}</b> —{" "}
            {t(fromTR ? "routeStage1TR" : "routeStage1SY").replace("{from}", from)}
          </li>
          <li>
            <b>{t("routeStage2")}</b> — {t("routeStage2Text")}
          </li>
          <li>
            <b>{t("routeStage3")}</b> — {t(fromTR ? "routeStage3SY" : "routeStage3TR").replace("{to}", to)}
          </li>
        </ul>
        <p className="muted small">{t("routeStagesNote")}</p>
      </section>
      <section>
        <h2>{t("routePrices")}</h2>
        {!r ? (
          <p className="muted">{t("loading")}</p>
        ) : r.price.enough ? (
          <div className="company-stats">
            <div>
              <strong dir="ltr">{usd(r.price.median)}</strong>
              <small>{t("medianPrice")}</small>
            </div>
            <div>
              <strong dir="ltr">
                {usd(r.price.low)} – {usd(r.price.high)}
              </strong>
              <small>{t("usualRange")}</small>
            </div>
            <div>
              <strong>{r.price.days}</strong>
              <small>{t("typicalDays")}</small>
            </div>
            <div>
              <strong>{r.price.deals}</strong>
              <small>{t("realDeals")}</small>
            </div>
          </div>
        ) : (
          <p className="notice">{t("routeNoPrices").replace("{n}", r.price.min)}</p>
        )}
      </section>
      <section>
        <h2>{t("routeCrossings")}</h2>
        <div className="route-crossings">
          {(r?.crossings || []).map((c) => (
            <article key={c.key} className="panel">
              <b>{t(c.key)}</b>
              <small>
                {c.tr} ⇄ {c.sy}
              </small>
              {c.best?.length > 0 ? (
                <small>
                  🕐 {t("bestTimeIs")}: {dayName(c.best[0].day)} · {t("slot_" + SLOTS[c.best[0].slot])}
                </small>
              ) : (
                <small className="muted">{t("bestTimeNotEnough").replace("{n}", c.reports || 0)}</small>
              )}
            </article>
          ))}
        </div>
        <p className="muted small">
          {t("routeCrossingsNote")} <a href="/border">{t("borderRules")} ↗</a>
        </p>
      </section>
      {r?.providers?.length > 0 && (
        <section>
          <h2>{t("routeProviders")}</h2>
          <div className="route-links">
            {r.providers.map((p) => (
              <a key={p.slug} href={`/c/${p.slug}`}>
                <span dir="auto">{p.name}</span>
                <small>
                  {" "}
                  · {t(p.accountType)}
                  {p.rating ? ` · ★ ${p.rating}` : ""}
                </small>
              </a>
            ))}
          </div>
        </section>
      )}
      <Cta t={t} text={t("routeCta").replace("{from}", from).replace("{to}", to)} />
      {r?.related?.length > 0 && (
        <section>
          <h2>{t("relatedRoutes")}</h2>
          <div className="route-links">
            {r.related.map((s) => {
              const x = corridorBySlug(s);
              return (
                <a key={s} href={`/routes/${s}`}>
                  {cityName(x.from, lang)} {arrow(lang)} {cityName(x.to, lang)}
                </a>
              );
            })}
          </div>
        </section>
      )}
    </Shell>
  );
}
