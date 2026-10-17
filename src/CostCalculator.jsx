import React, { useState } from "react";

// Carrier's trip cost calculator: real cost of a trip and the lowest price without a loss.
// Values are remembered in this browser for next time.
const KEY = "lb_cost_calc";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const FIELDS = [
  ["distance", "ccDistance", 1],
  ["consumption", "ccConsumption", 0.1],
  ["fuelPrice", "ccFuelPrice", 0.01],
  ["fees", "ccFees", 1],
  ["tolls", "ccTolls", 1],
  ["wage", "ccWage", 1],
  ["days", "ccDays", 1],
  ["other", "ccOther", 1],
  ["margin", "ccMargin", 1],
];
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function tripCost(v) {
  const km = n(v.distance) * (v.emptyReturn ? 2 : 1);
  const fuel = ((km * n(v.consumption)) / 100) * n(v.fuelPrice);
  const total = fuel + n(v.fees) + n(v.tolls) + n(v.wage) * n(v.days) + n(v.other);
  return {
    fuel: Math.round(fuel),
    total: Math.round(total),
    suggested: Math.round(total * (1 + n(v.margin) / 100)),
  };
}

export function CostCalculator({ t, onUse }) {
  const [v, setV] = useState(() => ({ consumption: 33, days: 1, margin: 15, ...load() }));
  const set = (k, val) =>
    setV((old) => {
      const next = { ...old, [k]: val };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  const r = tripCost(v);
  return (
    <details className="cost-calc">
      <summary>🧮 {t("costCalcTitle")}</summary>
      <p className="muted small">{t("costCalcIntro")}</p>
      <div className="cost-grid">
        {FIELDS.map(([k, label, step]) => (
          <label key={k}>
            <small>{t(label)}</small>
            <input
              type="number"
              min="0"
              step={step}
              value={v[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
        <label className="cost-check">
          <input
            type="checkbox"
            checked={!!v.emptyReturn}
            onChange={(e) => set("emptyReturn", e.target.checked)}
          />{" "}
          {t("ccEmptyReturn")}
        </label>
      </div>
      <div className="cost-result">
        <span>
          {t("ccFuelCost")}: <b>${r.fuel.toLocaleString("en")}</b>
        </span>
        <span>
          {t("ccBreakEven")}: <b>${r.total.toLocaleString("en")}</b>
        </span>
        <span className="cost-suggested">
          {t("ccSuggested")}: <b>${r.suggested.toLocaleString("en")}</b>
        </span>
        {onUse && r.suggested > 0 && (
          <button type="button" className="button small-button" onClick={() => onUse(r.suggested)}>
            {t("ccUsePrice")}
          </button>
        )}
      </div>
    </details>
  );
}
