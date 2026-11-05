import React, { useState } from "react";
import "./landing.css";

const KEY = "lb_corridor_open";

// Explains the three stages of a Türkiye ⇄ Syria shipment. Users can hide it and show it again.
export default function CorridorCard({ t }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== "0";
    } catch {
      return true;
    }
  });
  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  }
  return (
    <section className="corridor panel">
      <div className="section-heading">
        <h3>{t("corridorTitle")}</h3>
        <button className="text-button" aria-expanded={open} onClick={toggle}>
          {t(open ? "hide" : "show")}
        </button>
      </div>
      {open && (
        <>
          <div className="corridor-steps">
            {[
              ["🚚", "leg_origin_leg", "corridorLeg1"],
              ["⚖", "leg_clearance", "corridorLeg2"],
              ["🚚", "leg_destination_leg", "corridorLeg3"],
            ].map(([icon, title, text], i) => (
              <div key={title} className="corridor-step">
                <span className="corridor-icon">{icon}</span>
                <b>
                  {i + 1}. {t(title)}
                </b>
                <small>{t(text)}</small>
              </div>
            ))}
          </div>
          <p className="muted">
            {t("corridorNote")} <a href="/border">{t("borderRulesTitle")} ↗</a>
          </p>
        </>
      )}
    </section>
  );
}
