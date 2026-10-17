import React from "react";
import { crossings } from "../shared/crossings";
import { cities } from "../shared/corridors";
import "./admin-tools.css";

// Carriers save the routes they work on (customs brokers: their crossings) and get a notice,
// and a WhatsApp message when it is turned on, as soon as a matching request is published.

const L = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));

export function RouteAlerts({ data, user, t, lang, run, busy }) {
  const mine = data.routeAlerts || [];
  const broker = user.role === "broker";
  const names = Object.values(cities).map((c) => c.n[L(lang)]);
  return (
    <section className="panel route-alerts">
      <header>
        <div>
          <h3>🔔 {t(broker ? "crossingAlertsTitle" : "routeAlertsTitle")}</h3>
          <p className="muted small">{t(broker ? "crossingAlertsIntro" : "routeAlertsIntro")}</p>
        </div>
      </header>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const ok = await run("/route-alerts", Object.fromEntries(new FormData(form)), "POST", {
            success: "alertSaved",
          });
          if (ok) form.reset();
        }}
      >
        {broker ? (
          <label className="field">
            <span>{t("borderCrossing")}</span>
            <select name="crossing" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {Object.keys(crossings).map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="field">
              <span>{t("tripFrom")}</span>
              <input name="from" list="alert-cities" maxLength={80} placeholder={t("anyPlace")} />
            </label>
            <label className="field">
              <span>{t("tripTo")}</span>
              <input name="to" list="alert-cities" maxLength={80} placeholder={t("anyPlace")} />
            </label>
            <datalist id="alert-cities">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </>
        )}
        <button className="button small-button" disabled={busy}>
          ＋ {t("addAlert")}
        </button>
      </form>
      {mine.length ? (
        <div className="alert-chips">
          {mine.map((a) => (
            <span key={a.id} className="alert-chip">
              <span>
                {a.crossing ? (
                  t(a.crossing)
                ) : (
                  <>
                    <bdi>{a.from || t("anyPlace")}</bdi> {lang === "ar" ? "←" : "→"}{" "}
                    <bdi>{a.to || t("anyPlace")}</bdi>
                  </>
                )}
              </span>
              <button
                type="button"
                aria-label={t("delete")}
                disabled={busy}
                onClick={() => run(`/route-alerts/${a.id}`, {}, "DELETE", { success: "saved" })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="muted small">{t("noAlertsYet")}</p>
      )}
    </section>
  );
}
