import React, { useEffect, useState } from "react";
import { LegalLinks } from "./Legal";
// "Try it" area: opens a demo account of each type without registering.
function TryPlatform({ t }) {
  const [demo, setDemo] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) => setDemo(!!r.demo))
      .catch(() => {});
  }, []);
  if (!demo) return null;
  const kinds = [
    ["merchant", "▤"],
    ["carrier", "⇄"],
    ["broker", "⚖"],
    ["supplier", "▧"],
    ["individual", "◉"],
    ["admin", "◇"],
  ];
  async function open(kind) {
    setBusy(kind);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: kind }),
      });
      if (!r.ok) throw new Error();
      window.location.href = "/workspace/dashboard";
    } catch {
      setError(t("error"));
      setBusy("");
    }
  }
  return (
    <section id="try" className="landing-section try-platform">
      <span className="eyebrow">TRY IT · NO SIGN-UP</span>
      <h2>{t("tryPlatformTitle")}</h2>
      <p>{t("tryPlatformIntro")}</p>
      <div className="landing-account-cards">
        {kinds.map(([kind, symbol]) => (
          <article key={kind}>
            <span className="access-symbol">{symbol}</span>
            <h3>{t(kind === "admin" ? "administrator" : kind)}</h3>
            <p>{t("tryAs_" + kind)}</p>
            <button className="button yellow-button" disabled={!!busy} onClick={() => open(kind)}>
              {busy === kind ? t("loading") : t("tryDemo")} ↗
            </button>
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="muted small">{t("tryPlatformNote")}</p>
    </section>
  );
}
export default function Landing({ t, langSelect, user }) {
  const types = ["merchant", "carrier", "broker", "supplier", "individual"];
  const symbols = { merchant: "▤", carrier: "⇄", broker: "⚖", supplier: "▧", individual: "◉" };
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="brand" href="/">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <nav aria-label={t("mainNavigation")}>
          <a href="#about">{t("aboutNav")}</a>
          <a href="#try">{t("tryNav")}</a>
          <a href="#services">{t("ourServices")}</a>
          <a href="#verification">{t("identityReview")}</a>
          <a href="/border">{t("borderNav")}</a>
          <a href="/accounts">{t("createAccount")}</a>
        </nav>
        <div className="landing-header-actions">
          {langSelect}
          {user ? (
            <a className="button" href="/workspace/dashboard">
              {t("myWorkspace")} ↗
            </a>
          ) : (
            <a className="button" href="/login">
              {t("signIn")} ↗
            </a>
          )}
        </div>
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <div>
            <span className="access-chip">
              TÜRKİYE · SYRIA · GLOBAL <i />
            </span>
            <h1>
              {t("globalHero")}
              <span>{t("globalHeroAccent")}</span>
            </h1>
            <p>{t("globalIntro")}</p>
            <div className="landing-cta">
              <a className="button yellow-button" href="/accounts">
                {t("startAccount")} ↗
              </a>
              <a className="button ghost" href="#services">
                {t("exploreServices")}
              </a>
            </div>
            <div className="landing-direct-actions">
              <a href="/workspace/newShipment">＋ {t("enterShipment")}</a>
              <a href="/workspace/documents">⇧ {t("uploadDocuments")}</a>
              <a href="/workspace/tracking">◎ {t("tracking")}</a>
            </div>
            <div className="access-benefits">
              <span>✓ {t("identityReview")}</span>
              <span>✓ AR / EN / TR</span>
              <span>✓ {t("internationalAccounts")}</span>
            </div>
          </div>
          <div className="global-art" aria-hidden="true">
            <div className="globe">
              <i />
              <i />
              <i />
              <span>⇄</span>
            </div>
            <span className="global-pin pin-tr">
              TR <b>Türkiye</b>
            </span>
            <span className="global-pin pin-sy">
              SY <b>Syria</b>
            </span>
            <span className="global-pin pin-world">
              ◎ <b>Global</b>
            </span>
            <div className="global-art-caption">LOGIBRIDGE NETWORK</div>
          </div>
        </section>
        <About t={t} />
        <TryPlatform t={t} />
        <section id="services" className="landing-section">
          <span className="eyebrow">ONE PLATFORM. YOUR WORKSPACE.</span>
          <h2>{t("accountForEveryone")}</h2>
          <p>{t("accountForEveryoneDesc")}</p>
          <div className="landing-account-cards">
            {types.map((type) => (
              <article key={type}>
                <span className="access-symbol">{symbols[type]}</span>
                <h3>{t(type)}</h3>
                <p>{t(`short_${type}`)}</p>
                <a className="button" href={`/register/${type}`}>
                  {t("createAccount")} ↗
                </a>
                <a className="text-button" href="/login">
                  {t("signIn")}
                </a>
              </article>
            ))}
          </div>
        </section>
        <section id="verification" className="landing-verification">
          <div>
            <span className="eyebrow">TRUST STARTS WITH A REVIEW.</span>
            <h2>{t("globalVerification")}</h2>
            <p>{t("globalVerificationDesc")}</p>
            <a className="button yellow-button" href={user ? "/workspace/kyb" : "/accounts"}>
              {t("openVerification")} ↗
            </a>
          </div>
          <div className="landing-verification-steps">
            {["verificationInfo", "verificationUpload", "verificationReview"].map((key, i) => (
              <div key={key}>
                <span>{i + 1}</span>
                <b>{t(key)}</b>
              </div>
            ))}
            <p>{t("manualVerificationNote")}</p>
          </div>
        </section>
        <section className="landing-admin">
          <span>◇ {t("administrator")}</span>
          <a href="/login">{t("administratorLogin")} ↗</a>
        </section>
      </main>
      <footer className="landing-footer">
        <LegalLinks t={t} />
        <a className="brand" href="/">
          LogiBridge
        </a>
        <span>{t("tagline")} · AR / EN / TR</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}

// Who we are, vision, mission, values and how the platform works.
function About({ t }) {
  return (
    <section id="about" className="landing-section landing-about">
      <span className="eyebrow">ABOUT LOGIBRIDGE</span>
      <h2>{t("aboutTitle")}</h2>
      <p className="about-lead">{t("aboutText")}</p>
      <div className="about-grid">
        {[
          ["◎", "visionTitle", "visionText"],
          ["➜", "missionTitle", "missionText"],
        ].map(([icon, title, text]) => (
          <article key={title}>
            <span className="access-symbol">{icon}</span>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
          </article>
        ))}
      </div>
      <h3 className="about-subtitle">{t("valuesTitle")}</h3>
      <div className="about-values">
        {["valueTransparency", "valueTrust", "valueCompliance", "valueSpeed"].map((k) => (
          <div key={k}>
            <b>{t(k)}</b>
            <small>{t(k + "Text")}</small>
          </div>
        ))}
      </div>
      <h3 className="about-subtitle">{t("howItWorks")}</h3>
      <ol className="about-steps">
        {["howStep1", "howStep2", "howStep3", "howStep4"].map((k, i) => (
          <li key={k}>
            <span>{i + 1}</span>
            <b>{t(k)}</b>
            <small>{t(k + "Text")}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
