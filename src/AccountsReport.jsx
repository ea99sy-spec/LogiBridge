import React, { useEffect, useMemo, useState } from "react";
import "./accounts-report.css";

// Administrator: spreadsheet-style report of every registered account, with Excel download.
const NUMERIC = new Set([
  "logins",
  "activeDays",
  "shipmentsPosted",
  "jobsTaken",
  "bids",
  "completed",
  "active",
  "rating",
  "reviews",
  "notes",
]);
const KINDS = ["merchant", "carrier", "broker", "supplier", "individual"];
const STATUSES = ["approved", "pending", "not_submitted", "rejected", "disabled"];

export function AccountsReport({ t, lang }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ key: "joined", dir: -1 });
  useEffect(() => {
    setData(null);
    fetch("/api/admin/accounts-report?lang=" + lang)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(t("accountAccessRestricted")));
  }, [lang]);
  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => !kind || r.kind === kind)
      .filter((r) => !status || r.statusKey === status)
      .filter(
        (r) =>
          !q ||
          [r.name, r.email, r.phone, r.taxId, r.city, r.country, r.offers]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => {
        const x = a[sort.key],
          y = b[sort.key];
        const c = NUMERIC.has(sort.key)
          ? (Number(x) || 0) - (Number(y) || 0)
          : String(x || "").localeCompare(String(y || ""), lang);
        return c * sort.dir;
      });
  }, [data, query, kind, status, sort, lang]);
  const totals = useMemo(() => {
    const all = data?.rows || [];
    const sum = (k) => all.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return [
      ["reportAccounts", all.length],
      ["reportApproved", all.filter((r) => r.statusKey === "approved").length],
      ["reportPending", all.filter((r) => r.statusKey === "pending").length],
      [
        "reportActive30",
        all.filter((r) => r.lastSeen && Date.now() - Date.parse(r.lastSeen) < 30 * 86400000).length,
      ],
      ["reportShipments", sum("shipmentsPosted")],
      ["reportCompleted", all.length ? sum("completed") : 0],
    ];
  }, [data]);
  return (
    <section className="accounts-report">
      <div className="section-heading">
        <div>
          <h2>{t("accountsReport")}</h2>
          <p>{t("accountsReportIntro")}</p>
        </div>
        <a
          className="button"
          href={`/api/admin/accounts-report?format=xlsx&lang=${lang}`}
          download
          aria-disabled={!data?.rows.length}
        >
          ⬇ {t("downloadExcel")}
        </a>
      </div>
      {error && <p className="notice error">{error}</p>}
      {data && (
        <>
          <div className="report-totals">
            {totals.map(([k, v]) => (
              <div key={k}>
                <b>{v}</b>
                <small>{t(k)}</small>
              </div>
            ))}
          </div>
          <div className="report-filters">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("reportSearch")}
              aria-label={t("reportSearch")}
            />
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("accountType")}>
              <option value="">{t("allAccountTypes")}</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("reportStatus")}>
              <option value="">{t("allStatuses")}</option>
              {STATUSES.map((k) => (
                <option key={k} value={k}>
                  {t("reportStatus_" + k)}
                </option>
              ))}
            </select>
            <small className="muted">
              {rows.length} / {data.rows.length}
            </small>
          </div>
          {data.rows.length === 0 ? (
            <p className="muted">{t("reportEmpty")}</p>
          ) : (
            <div className="report-scroll" tabIndex={0} aria-label={t("accountsReport")}>
              <table className="report-table">
                <thead>
                  <tr>
                    {data.columns.map(([k, label]) => (
                      <th
                        key={k}
                        aria-sort={sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : NUMERIC.has(k) ? -1 : 1 }))
                          }
                        >
                          {label}
                          {sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={`st-${r.statusKey}`}>
                      {data.columns.map(([k]) => (
                        <td
                          key={k}
                          className={`${NUMERIC.has(k) ? "num" : ""} ${["offers", "about"].includes(k) ? "long" : ""}`}
                          dir={["email", "phone", "taxId"].includes(k) ? "ltr" : undefined}
                          title={["offers", "about"].includes(k) ? r[k] : undefined}
                        >
                          {r[k] === "" || r[k] === null || r[k] === undefined ? "—" : r[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">{t("reportUsageNote")}</p>
        </>
      )}
      {!data && !error && <p className="muted">{t("loading")}</p>}
    </section>
  );
}
