import React, { useEffect, useState } from "react";
import { crossings } from "../shared/crossings";
import { SLOTS } from "../shared/crossingTimes";

// Best time to cross: average queue per weekday and part of the day, from all reports so far.
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function BestCrossingTimes({ t, lang }) {
  const [times, setTimes] = useState(null);
  useEffect(() => {
    fetch("/api/border")
      .then((r) => (r.ok ? r.json() : {}))
      .then((v) => setTimes(v.times || {}))
      .catch(() => setTimes({}));
  }, []);
  if (!times) return null;
  const dayName = (d) =>
    new Date(Date.UTC(2026, 0, 4 + d)).toLocaleDateString(lang, { weekday: "short", timeZone: "UTC" });
  const open = Object.keys(crossings).filter((k) => crossings[k].status === "open");
  return (
    <section className="panel best-times">
      <h2>🕐 {t("bestTimeTitle")}</h2>
      <p className="muted small">{t("bestTimeIntro")}</p>
      <div className="best-times-grid">
        {open.map((k) => {
          const c = times[k] || { cells: null, best: [], reports: 0 };
          return (
            <article key={k} className="best-time-card">
              <h3>{t(k)}</h3>
              {c.best.length ? (
                <p className="best-time-pick">
                  ✓ {t("bestTimeIs")}{" "}
                  <b>
                    {dayName(c.best[0].day)} · {t("slot_" + SLOTS[c.best[0].slot])}
                  </b>{" "}
                  <small>({t("wait_" + Math.round(c.best[0].avg))})</small>
                </p>
              ) : (
                <p className="muted small">{t("bestTimeNotEnough").replace("{n}", c.reports)}</p>
              )}
              {c.cells && c.best.length > 0 && (
                <div className="time-grid-scroll">
                  <table className="time-grid">
                    <thead>
                      <tr>
                        <th />
                        {SLOTS.map((s) => (
                          <th key={s}>{t("slot_" + s)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((d) => (
                        <tr key={d}>
                          <th>{dayName(d)}</th>
                          {SLOTS.map((s, i) => {
                            const cell = c.cells[d][i];
                            return (
                              <td
                                key={s}
                                className={cell.avg === null ? "none" : "lvl-" + Math.round(cell.avg)}
                                title={
                                  cell.avg === null
                                    ? `${cell.count}`
                                    : `${t("wait_" + Math.round(cell.avg))} · ${cell.count}`
                                }
                              />
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <small className="muted">{t("bestTimeReports").replace("{n}", c.reports)}</small>
            </article>
          );
        })}
      </div>
      <p className="time-legend small">
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l}>
            <i className={"lvl-" + l} /> {t("wait_" + l)}
          </span>
        ))}
        <span>
          <i className="none" /> {t("noData")}
        </span>
      </p>
    </section>
  );
}
