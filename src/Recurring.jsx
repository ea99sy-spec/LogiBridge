import React from "react";
import "./recurring.css";

// Recurring shipments: publish the same shipment every week / two weeks / month automatically.

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export function RecurringPage({ data, user, t, lang, run, busy, navigate }) {
  const mine = (data.recurring || []).filter((r) => r.ownerId === user.id);
  const templates = data.shipments
    .filter((s) => s.ownerId === user.id && !s.parentId && s.hsCode)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  // Carriers this trader already worked with come first.
  const worked = new Set(data.shipments.filter((s) => s.carrierId).map((s) => s.carrierId));
  const carriers = data.users
    .filter((u) => u.role === "carrier")
    .sort((a, b) => worked.has(b.id) - worked.has(a.id) || a.name.localeCompare(b.name));
  const name = (id) => data.users.find((u) => u.id === id)?.name || "—";
  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString(lang, { day: "numeric", month: "short" });
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("recurring")}</h1>
          <p>{t("recurringIntro")}</p>
        </div>
      </div>
      {templates.length ? (
        <form
          className="panel form-stack recurring-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const ok = await run("/recurring", Object.fromEntries(new FormData(form)), "POST", {
              success: "recurringSaved",
            });
            if (ok) form.reset();
          }}
        >
          <h3>＋ {t("newRecurring")}</h3>
          <div className="recurring-grid">
            <label className="field wide">
              <span>{t("recurringFrom")}</span>
              <select name="shipmentId" required>
                {templates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {s.origin} → {s.destination}
                  </option>
                ))}
              </select>
              <small>{t("recurringFromNote")}</small>
            </label>
            <label className="field">
              <span>{t("recurringEvery")}</span>
              <select name="every" defaultValue="weekly">
                {["weekly", "biweekly", "monthly"].map((k) => (
                  <option key={k} value={k}>
                    {t("every_" + k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("recurringFirstDate")}</span>
              <input name="firstDate" type="date" required min={tomorrow()} />
            </label>
            <label className="field">
              <span>{t("recurringLead")}</span>
              <select name="leadDays" defaultValue="3">
                {[1, 2, 3, 5, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("daysBefore")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("recurringEnd")}</span>
              <input name="endDate" type="date" min={tomorrow()} />
            </label>
            <label className="field">
              <span>{t("preferredCarrier")}</span>
              <select name="preferredCarrierId" defaultValue="">
                <option value="">— {t("anyCarrier")} —</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {worked.has(c.id) ? "★ " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("agreedPrice")}</span>
              <input name="agreedPrice" type="number" min="1" step="1" placeholder="$" />
            </label>
          </div>
          <p className="muted small">{t("recurringHow")}</p>
          <button className="button" disabled={busy}>
            {t("saveRecurring")}
          </button>
        </form>
      ) : (
        <div className="panel">
          <p>{t("recurringNeedsShipment")}</p>
          <button className="button" onClick={() => navigate("newShipment")}>
            {t("newShipment")}
          </button>
        </div>
      )}
      <h3>{t("mySchedules")}</h3>
      {mine.length ? (
        <div className="recurring-list">
          {mine.map((r) => (
            <article key={r.id} className={`panel recurring-card ${r.active ? "" : "paused"}`}>
              <header>
                <b dir="auto">{r.template.title}</b>
                <span className={`badge ${r.active ? "delivered" : "cancelled"}`}>
                  {t(r.active ? "recurringActive" : r.endedAt ? "recurringEnded" : "recurringPaused")}
                </span>
              </header>
              <p dir="auto" className="muted">
                {r.template.origin} → {r.template.destination}
              </p>
              <ul className="recurring-facts">
                <li>🔁 {t("every_" + r.every)}</li>
                {r.active && (
                  <li>
                    📅 {t("nextShipment")}: <b>{fmt(r.nextDate)}</b>
                  </li>
                )}
                <li>
                  📣 {r.leadDays} {t("daysBefore")}
                </li>
                {r.preferredCarrierId && (
                  <li>
                    🚚 {name(r.preferredCarrierId)}
                    {r.agreedPrice ? ` · $${r.agreedPrice}` : ""}
                  </li>
                )}
                {r.endDate && (
                  <li>
                    ⏹ {t("recurringEnd")}: {fmt(r.endDate)}
                  </li>
                )}
                <li>
                  ✅ {t("publishedCount")}: {r.runs?.length || 0}
                </li>
              </ul>
              {r.pausedReason && <p className="notice">{t("recurringPausedNote")}</p>}
              <div className="recurring-actions">
                <button
                  className="button ghost small-button"
                  disabled={busy}
                  onClick={() =>
                    run(`/recurring/${r.id}`, { active: !r.active }, "POST", { success: "saved" })
                  }
                >
                  {t(r.active ? "pause" : "resume")}
                </button>
                <button
                  className="text-button danger-text"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(t("deleteRecurringConfirm")) &&
                    run(`/recurring/${r.id}`, {}, "DELETE", { success: "saved" })
                  }
                >
                  {t("delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">{t("noSchedules")}</p>
      )}
    </>
  );
}
