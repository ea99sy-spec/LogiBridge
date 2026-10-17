import React from "react";

// Measured reputation chips: on-time share for carriers and brokers, payment speed for shipment owners.
export function ReputationChips({ rep, t, kind }) {
  if (!rep) return null;
  const provider = ["carrier", "broker"].includes(kind);
  const owner = ["merchant", "individual"].includes(kind) || !kind;
  const chips = [];
  if ((provider || !kind) && rep.onTimeCount > 0)
    chips.push(
      <span
        key="ontime"
        className={`rep-chip ${rep.onTimePct >= 90 ? "good" : rep.onTimePct >= 70 ? "" : "bad"}`}
        title={t("onTimeHint")}
      >
        ⏱ {t("onTimeValue").replace("{p}", rep.onTimePct).replace("{n}", rep.onTimeCount)}
      </span>,
    );
  if (owner && rep.payCount > 0)
    chips.push(
      <span
        key="pay"
        className={`rep-chip ${rep.payDays <= 2 ? "good" : rep.payDays <= 7 ? "" : "bad"}`}
        title={t("paySpeedHint")}
      >
        💳 {t("paySpeedValue").replace("{d}", rep.payDays).replace("{n}", rep.payCount)}
      </span>,
    );
  if (rep.level)
    chips.unshift(
      <span key="level" className={`trust-badge ${rep.level}`} title={t("trustLevelHint")}>
        {{ gold: "🥇", silver: "🥈", bronze: "🥉" }[rep.level]} {t("trust_" + rep.level)}
      </span>,
    );
  if (!chips.length) return null;
  return <span className="rep-chips">{chips}</span>;
}
