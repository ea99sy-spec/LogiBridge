import React, { useState } from "react";
import { QuickPrice } from "./Prices";

// Volume factor for road freight (1 m³ = 333 kg), the same one the price estimate uses.
const KG_PER_M3 = 333;
const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

// Cubic metre and chargeable weight for one or more identical pieces. Nothing is sent to the server.
export function CbmCalculator({ t }) {
  const [v, setV] = useState({ pieces: "1", length: "", width: "", height: "", weight: "" });
  const cbm = (num(v.pieces) * num(v.length) * num(v.width) * num(v.height)) / 1000000;
  const chargeable = Math.max(num(v.weight), cbm * KG_PER_M3);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const fields = [
    ["pieces", "cbmPieces"],
    ["length", "lenLabel"],
    ["width", "widthLabel"],
    ["height", "heightLabel"],
    ["weight", "cbmWeight"],
  ];
  return (
    <section className="cbm-calc">
      <h2>{t("cbmTitle")}</h2>
      <p className="muted small">{t("cbmIntro")}</p>
      <div className="cost-grid">
        {fields.map(([k, label]) => (
          <label key={k}>
            <small>{t(label)}</small>
            <input type="number" min="0" step="any" value={v[k]} onChange={set(k)} />
          </label>
        ))}
      </div>
      <div className="cost-result">
        <span>
          {t("cbmVolume")}: <b dir="ltr">{cbm.toFixed(3)} m³</b>
        </span>
        <span>
          {t("chargeTitle")}: <b dir="ltr">{Math.round(chargeable).toLocaleString("en")} kg</b>
        </span>
      </div>
      <small className="muted">{t("cbmNote")}</small>
    </section>
  );
}

export default function ToolsPage({ t, langSelect }) {
  return (
    <div className="legal-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <main className="legal-content tools-page">
        <h1>{t("toolsTitle")}</h1>
        <p className="muted">{t("toolsIntro")}</p>
        <CbmCalculator t={t} />
        <QuickPrice t={t} />
        <p>
          <a className="button" href="/register">
            {t("getRealOffers")} ↗
          </a>
        </p>
      </main>
    </div>
  );
}
