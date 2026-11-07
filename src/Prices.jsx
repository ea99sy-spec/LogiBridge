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
// Standard package sizes in cm (length, width, height). The visitor only chooses the type and the count.
const PACKAGES = {
  envelope: [35, 25, 3],
  small: [40, 30, 30],
  medium: [60, 40, 40],
  large: [80, 60, 60],
  pallet: [120, 80, 120],
};
const dimsOf = (pkg) => {
  const d = PACKAGES[pkg];
  return d ? { length: d[0], width: d[1], height: d[2] } : {};
};

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
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");
  return (
    <section className="landing-section quick-price" id="quick-price">
      <h2>{t("quickPriceTitle")}</h2>
      <form
        className="quick-price-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const weight = Number(f.get("weight"));
          if (!(weight >= 1 && weight <= 24000)) {
            setError(t("weightLimitError"));
            return;
          }
          setError("");
          setBusy(true);
          const q = new URLSearchParams({
            from: f.get("from"),
            to: f.get("to"),
            city: f.get("city") || "",
            weight: String(weight),
            pallets: f.get("pallets") || "",
            ...dimsOf(f.get("pkg")),
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
          <small>{t("weight")} (kg)</small>
          <input name="weight" type="number" min="1" max="24000" required placeholder="500" />
        </label>
        <label>
          <small>{t("pkgType")}</small>
          <select name="pkg" defaultValue="small">
            <option value="envelope">{t("pkgEnvelope")}</option>
            <option value="small">{t("pkgSmall")}</option>
            <option value="medium">{t("pkgMedium")}</option>
            <option value="large">{t("pkgLarge")}</option>
            <option value="pallet">{t("pkgPallet")}</option>
          </select>
        </label>
        <label>
          <small>{t("pkgCount")}</small>
          <input name="pallets" type="number" min="1" max="100" defaultValue="1" />
        </label>
        <button className="button" disabled={busy}>
          {t("estimatePrice")}
        </button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {result &&
        (result.enough ? (
          <div className="quick-price-result" role="status">
            <small>
              {t("chargeTitle")}: <span dir="ltr">{result.chargeableKg.toLocaleString("en")} kg</span>
            </small>
            <small>{t("finalPriceTitle")}</small>
            <strong dir="ltr">
              {currency === "EUR" && result.eurPerUsd
                ? "€ " + Math.round(result.priceUsd * result.eurPerUsd).toLocaleString("en")
                : "$ " + result.priceUsd.toLocaleString("en")}
            </strong>
            {result.eurPerUsd && (
              <div className="currency-toggle">
                <button
                  type="button"
                  className={currency === "USD" ? "active" : ""}
                  onClick={() => setCurrency("USD")}
                >
                  USD
                </button>
                <button
                  type="button"
                  className={currency === "EUR" ? "active" : ""}
                  onClick={() => setCurrency("EUR")}
                >
                  EUR
                </button>
              </div>
            )}
            <small className="muted">{t("finalPriceNote")}</small>
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
