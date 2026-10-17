import React, { useEffect, useState } from "react";

// "Your month on LogiBridge": a short summary of last month (or an earlier one).

const months = () => {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
};

export function MonthlyReportCard({ t, lang, kind }) {
  const list = months();
  const [month, setMonth] = useState(list[1]);
  const [r, setR] = useState(undefined);
  useEffect(() => {
    setR(undefined);
    fetch("/api/reports/monthly?month=" + month)
      .then((x) => (x.ok ? x.json() : null))
      .then(setR)
      .catch(() => setR(null));
  }, [month]);
  const label = (m) =>
    new Date(m + "-15T12:00:00Z").toLocaleDateString(lang, { month: "long", year: "numeric" });
  const provider = ["carrier", "broker"].includes(kind);
  const tiles = !r
    ? []
    : provider
      ? [
          ["mrOffersSent", r.offersSent],
          ["mrWon", r.won],
          ["mrJobsDone", r.jobsDone],
          ["mrEarned", "$" + r.earned.toLocaleString("en")],
          ["mrOnTime", r.onTimePct === null ? "—" : r.onTimePct + "%"],
        ]
      : kind === "supplier"
        ? [["mrOrders", r.orders]]
        : [
            ["mrPosted", r.posted],
            ["mrAccepted", r.accepted],
            ["mrCompleted", r.completed],
            ["mrSpent", "$" + r.spent.toLocaleString("en")],
          ];
  return (
    <section className="panel monthly-report">
      <header>
        <h3>📊 {t("monthlyReport")}</h3>
        <select aria-label={t("month")} value={month} onChange={(e) => setMonth(e.target.value)}>
          {list.map((m) => (
            <option key={m} value={m}>
              {label(m)}
            </option>
          ))}
        </select>
      </header>
      {r === undefined ? (
        <p className="muted">{t("loading")}</p>
      ) : !r ? (
        <p className="muted">{t("noDataYet")}</p>
      ) : (
        <>
          <div className="mr-tiles">
            {tiles.map(([k, v]) => (
              <div key={k}>
                <strong dir="ltr">{v}</strong>
                <small>{t(k)}</small>
              </div>
            ))}
          </div>
          {r.topRoute && (
            <p className="muted small">
              {t("mrTopRoute")}: <b dir="auto">{r.topRoute}</b>
            </p>
          )}
          <p className="muted small">{t("monthlyReportNote")}</p>
        </>
      )}
    </section>
  );
}
