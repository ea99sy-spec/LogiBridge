import React, { useState } from "react";

// Read-only view of one account's dashboard numbers, for administrators. Opening it is logged on the server.
export function AccountBoard({ accountId, t, lang }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    setOpen(true);
    setError(false);
    try {
      const r = await fetch(`/api/admin/accounts/${encodeURIComponent(accountId)}/overview`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError(true);
    }
  }
  const stat = (label, value) => (
    <div className="board-stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
  return (
    <div className="account-board">
      {!open ? (
        <button type="button" className="button ghost small-button" onClick={load}>
          {t("boardViewButton")} ↗
        </button>
      ) : (
        <>
          <p className="muted small">{t("boardViewNote")}</p>
          {error && <p className="notice">{t("boardLoadError")}</p>}
          {!data && !error && <p className="muted">{t("loading")}</p>}
          {data && (
            <>
              <h4>{t("boardSummary")}</h4>
              <div className="board-stats">
                {stat(t("boardPosted"), data.counts.shipmentsPosted)}
                {stat(t("boardCarried"), data.counts.shipmentsCarried)}
                {stat(t("boardOpen"), data.counts.openShipments)}
                {stat(t("boardActive"), data.counts.activeShipments)}
                {stat(t("boardCompleted"), data.counts.completedShipments)}
                {stat(t("boardOffers"), data.counts.offersMade)}
              </div>
              <p className="small">
                {t("boardSubscription")}: <b>{t("sub_" + (data.subscription?.status || "none"))}</b>
              </p>
              <h4>{t("boardRecent")}</h4>
              {!data.recentShipments.length ? (
                <p className="muted">{t("boardNoShipments")}</p>
              ) : (
                <ul className="board-list">
                  {data.recentShipments.map((sh) => (
                    <li key={sh.id}>
                      <span dir="auto">{sh.title || `${sh.origin} → ${sh.destination}`}</span>{" "}
                      <small className="muted">
                        {t(sh.status)} · {new Date(sh.createdAt).toLocaleDateString(lang)}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
