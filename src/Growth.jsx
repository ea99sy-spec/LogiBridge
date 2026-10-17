import React, { useEffect, useState } from "react";
import "./growth.css";

// Administration growth page: stat tiles, weekly bars (one measure per chart, one axis each),
// monthly revenue, busiest routes and crossings. Each chart has hover values and a table view.

function Bars({ title, rows, label, value, format = (v) => v, t }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map(value));
  return (
    <figure className="panel g-chart">
      <figcaption>
        <b>{title}</b>
        <button type="button" className="text-button" onClick={() => setTable(!table)}>
          {t(table ? "showChart" : "showTable")}
        </button>
      </figcaption>
      {table ? (
        <table className="g-table">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <th>{label(r)}</th>
                <td>{format(value(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="g-bars" role="img" aria-label={title} dir="ltr">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`g-col ${hover === i ? "on" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
            >
              {hover === i && (
                <span className="g-tip">
                  {label(r)}: <b>{format(value(r))}</b>
                </span>
              )}
              <i style={{ height: `${(value(r) / max) * 100}%` }} className={value(r) ? "" : "zero"} />
              <small>{rows.length <= 8 || i % 3 === 0 ? label(r) : ""}</small>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

function List({ title, rows, t, name }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="panel g-list">
      <b>{title}</b>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.name}>
              <span dir="auto">{name ? name(r.name) : r.name}</span>
              <i style={{ width: `${(r.n / max) * 100}%` }} />
              <b>{r.n}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{t("noDataYet")}</p>
      )}
    </section>
  );
}

export function GrowthPage({ t, lang }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    fetch("/api/admin/growth")
      .then((r) => (r.ok ? r.json() : null))
      .then(setD)
      .catch(() => setD(null));
  }, []);
  if (!d) return <p className="muted">{t("loading")}</p>;
  const wk = (r) =>
    new Date(r.start + "T12:00:00Z").toLocaleDateString(lang, { day: "numeric", month: "short" });
  const mo = (r) =>
    new Date(r.month + "-15T12:00:00Z").toLocaleDateString(lang, { month: "short", year: "2-digit" });
  const sum = (k) => d.weeks.reduce((a, w) => a + w[k], 0);
  const f = d.funnel;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("growth")}</h1>
          <p>{t("growthIntro")}</p>
        </div>
      </div>
      <div className="g-tiles">
        <div>
          <b>{f.registered}</b>
          <small>{t("gRegistered")}</small>
        </div>
        <div>
          <b>{f.approved}</b>
          <small>
            {t("gApproved")} · {pct(f.approved, f.registered)}
          </small>
        </div>
        <div>
          <b>{f.active}</b>
          <small>
            {t("gActive")} · {pct(f.active, f.approved)}
          </small>
        </div>
        <div>
          <b>{sum("signups")}</b>
          <small>{t("gSignups12")}</small>
        </div>
        <div>
          <b>{sum("shipments")}</b>
          <small>{t("gShipments12")}</small>
        </div>
        <div>
          <b>${d.months.reduce((a, m) => a + m.revenue, 0).toLocaleString("en")}</b>
          <small>{t("gRevenue6")}</small>
        </div>
      </div>
      <div className="g-grid">
        <Bars t={t} title={t("gChartSignups")} rows={d.weeks} label={wk} value={(r) => r.signups} />
        <Bars t={t} title={t("gChartShipments")} rows={d.weeks} label={wk} value={(r) => r.shipments} />
        <Bars t={t} title={t("gChartCompleted")} rows={d.weeks} label={wk} value={(r) => r.completed} />
        <Bars
          t={t}
          title={t("gChartRevenue")}
          rows={d.months}
          label={mo}
          value={(r) => r.revenue}
          format={(v) => "$" + v.toLocaleString("en")}
        />
      </div>
      <div className="g-grid">
        <List title={t("gTopRoutes")} rows={d.routes} t={t} />
        <List title={t("gTopCrossings")} rows={d.crossings} t={t} name={(k) => t(k)} />
        <List
          title={t("gAccountTypes")}
          rows={Object.entries(d.kinds)
            .map(([name, n]) => ({ name, n }))
            .sort((a, b) => b.n - a.n)}
          t={t}
          name={(k) => t(k)}
        />
      </div>
    </>
  );
}
