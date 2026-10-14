import React, { useState } from "react";
import { guide, guideTips } from "./guideContent";

const index = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));

// "How to use LogiBridge" page: the steps for this account type, each with a button to the right page.
export function GuidePage({ kind, t, lang, navigate, modules }) {
  const steps = guide[kind] || guide.merchant;
  const i = index(lang);
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("guide")}</h1>
          <p>{t("guideIntro_" + kind) || t("guideIntro")}</p>
        </div>
      </div>
      <ol className="guide-steps">
        {steps.map((s, n) => (
          <li key={n} className="panel guide-step">
            <span className="guide-number">{n + 1}</span>
            <div>
              <h3>{s.title[i]}</h3>
              <p>{s.text[i]}</p>
              {modules.includes(s.tab) ? (
                <button className="button ghost small-button" onClick={() => navigate(s.tab)}>
                  {t("openPage")}: {t(s.tab)} ↗
                </button>
              ) : (
                <small className="muted">{t("availableAfterApproval")}</small>
              )}
            </div>
          </li>
        ))}
      </ol>
      <section className="panel guide-tips">
        <h3>💡 {t("guideTips")}</h3>
        <ul>
          {guideTips.map((tip, n) => (
            <li key={n}>{tip[i]}</li>
          ))}
        </ul>
        <p className="muted small">{t("guideHelp")}</p>
      </section>
    </>
  );
}

// Small "start here" card on the dashboard until the user hides it.
export function StartHereCard({ kind, t, lang, navigate, userId }) {
  const key = "lb_guide_hidden_" + userId;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const steps = (guide[kind] || guide.merchant).slice(0, 3);
  const i = index(lang);
  return (
    <section className="panel start-here">
      <div className="start-here-head">
        <h3>👋 {t("startHere")}</h3>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {}
            setHidden(true);
          }}
        >
          {t("hideGuideCard")}
        </button>
      </div>
      <ol>
        {steps.map((s, n) => (
          <li key={n}>
            <b>{s.title[i]}</b>
          </li>
        ))}
      </ol>
      <button className="button yellow-button" onClick={() => navigate("guide")}>
        {t("openGuide")} ↗
      </button>
    </section>
  );
}
