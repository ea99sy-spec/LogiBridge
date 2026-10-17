import React, { useEffect, useState } from "react";
import { countryOptions } from "../shared/countries";
import "./prices.css";

// Route price index (members) and the quick price estimate on the home page (visitors).
// Every number comes from accepted offers on the platform; nothing is estimated by hand.

const usd = (n) => "$" + Number(n).toLocaleString("en");
const stageKey = (s) => (s === "full" ? "fullShipment" : "leg_" + s);

export function PriceIndexPage({ t, lang }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    fetch("/api/price-index")
      .then((r) => (r.ok ? r.json() : { routes: [], min: 3 }))
      .then(setData)
      .catch(() => setData({ routes: [], min: 3 }));
  }, []);
  const routes = (data?.routes || []).filter(
    (r) => !query || `${r.from} ${r.to}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("prices")}</h1>
          <p>{t("pricesIntro").replace("{n}", data?.min || 3)}</p>
        </div>
      </div>
      {data === null ? (
        <p className="muted">{t("loading")}</p>
      ) : !data.routes.length ? (
        <section className="panel">
          <p>{t("pricesEmpty").replace("{n}", data.min)}</p>
        </section>
      ) : (
        <>
          <input
            type="search"
            className="price-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchRoute")}
            aria-label={t("searchRoute")}
          />
          <div className="price-grid">
            {routes.map((r) => (
              <article key={r.from + r.to + r.stage} className="panel price-card">
                <header>
                  <b dir="auto">
                    {r.from} → {r.to}
                  </b>
                  <small>
                    {t(stageKey(r.stage))}
                    {r.crossing ? ` · ${t(r.crossing)}` : ""}
                  </small>
                </header>
                <div className="price-main">
                  <strong>{usd(r.median)}</strong>
                  <small>{t("medianPrice")}</small>
                  {r.trend !== null && (
                    <span className={`price-trend ${r.trend > 0 ? "up" : r.trend < 0 ? "down" : ""}`}>
                      {r.trend > 0 ? "▲" : r.trend < 0 ? "▼" : "■"} {Math.abs(r.trend)}% {t("vsLastMonth")}
                    </span>
                  )}
                </div>
                <div className="price-range" aria-label={t("usualRange")} dir="ltr">
                  <span>{usd(r.low)}</span>
                  <i />
                  <span>{usd(r.high)}</span>
                </div>
                <ul className="price-facts">
                  <li>
                    {t("usualRange")}:{" "}
                    <span dir="ltr">
                      {usd(r.low)} – {usd(r.high)}
                    </span>
                  </li>
                  {r.perTon !== null && (
                    <li>
                      {t("perTon")}: {usd(r.perTon)}
                    </li>
                  )}
                  <li>
                    {t("typicalDays")}: {r.days}
                  </li>
                  <li>
                    {t("dealsCount")}: {r.deals} · {t("lastDeal")}{" "}
                    {new Date(r.last).toLocaleDateString(lang, { dateStyle: "medium" })}
                  </li>
                </ul>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// Home page: "How much will my shipment cost?" from real deals.
export function QuickPrice({ t }) {
  const lang = document.documentElement.lang || "ar";
  const countries = countryOptions(lang);
  const first = ["TR", "SY"];
  const ordered = [
    ...first.map((c) => countries.find((o) => o.code === c)).filter(Boolean),
    ...countries.filter((o) => !first.includes(o.code)),
  ];
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="landing-section quick-price" id="quick-price">
      <h2>{t("quickPriceTitle")}</h2>
      <p>{t("quickPriceIntro")}</p>
      <form
        className="quick-price-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          const q = new URLSearchParams({
            from: f.get("from"),
            to: f.get("to"),
            city: f.get("city") || "",
            weight: f.get("weight") || "",
          });
          try {
            setResult(await (await fetch("/api/public/price-estimate?" + q)).json());
          } catch {
            setResult({ enough: false, deals: 0 });
          }
          setBusy(false);
        }}
      >
        <label>
          <small>{t("fromCountry")}</small>
          <select name="from" defaultValue="TR">
            {ordered.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <small>{t("toCountry")}</small>
          <select name="to" defaultValue="SY">
            {ordered.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <small>{t("cityOptional")}</small>
          <input name="city" maxLength={80} placeholder={t("cityExample")} />
        </label>
        <label>
          <small>{t("weight")}</small>
          <input name="weight" type="number" min="1" max="100000" placeholder="5000" />
        </label>
        <button className="button" disabled={busy}>
          {t("estimatePrice")}
        </button>
      </form>
      {result &&
        (result.enough ? (
          <div className="quick-price-result" role="status">
            <small>{t("estimateRange")}</small>
            <strong dir="ltr">
              {usd(result.low)} – {usd(result.high)}
            </strong>
            <span>
              {t("estimateMiddle")}: <b>{usd(result.mid)}</b>
            </span>
            <small className="muted">
              {t(result.basis === "weight" ? "estimateBasisWeight" : "estimateBasisRoute").replace(
                "{n}",
                result.deals,
              )}
            </small>
            <a className="button" href="/register">
              {t("getRealOffers")} ↗
            </a>
          </div>
        ) : (
          <div className="quick-price-result empty" role="status">
            <span>{t("estimateNotEnough")}</span>
            <a className="button" href="/register">
              {t("getRealOffers")} ↗
            </a>
          </div>
        ))}
    </section>
  );
}
