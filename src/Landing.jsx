import React, { useEffect, useState } from "react";
import { LegalLinks } from "./Legal";

const types = ["merchant", "carrier", "broker", "supplier", "individual"];
const symbols = { merchant: "▤", carrier: "⇄", broker: "⚖", supplier: "▧", individual: "◉", admin: "◇" };

// Public facts the page needs: whether demo accounts are on, and the support email.
function useHealth() {
  const [health, setHealth] = useState({ demo: false, supportEmail: "", pricing: null });
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) =>
        setHealth({ demo: !!r.demo, supportEmail: r.supportEmail || "", pricing: r.pricing || null }),
      )
      .catch(() => {});
  }, []);
  return health;
}

export default function Landing({ t, langSelect, user }) {
  const health = useHealth();
  const [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  // Opens a demo account without registering (only when the administrator turned demos on).
  async function tryAs(kind) {
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
  const links = [
    ["#why", "navWhy"],
    ["#how", "navHow"],
    ["#features", "navFeatures"],
    ["#accounts", "navAccounts"],
    ["#faq", "navFaq"],
    ["/border", "borderNav"],
  ];
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="brand" href="/">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menu}
          aria-controls="landing-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "✕" : "☰"} <span>{t("menu")}</span>
        </button>
        <nav id="landing-nav" className={menu ? "open" : ""} aria-label={t("mainNavigation")}>
          {links.map(([href, key]) => (
            <a key={key} href={href} onClick={() => setMenu(false)}>
              {t(key)}
            </a>
          ))}
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
        {/* 1. What the site does, in one look */}
        <section className="landing-hero">
          <div>
            <span className="access-chip">
              {t("heroChip")} <i />
            </span>
            <h1>
              {t("globalHero")}
              <span>{t("globalHeroAccent")}</span>
            </h1>
            <p className="hero-value">{t("heroValue")}</p>
            <div className="landing-cta">
              <a
                className="button yellow-button"
                href={user ? "/workspace/newShipment" : "/register/merchant"}
              >
                {t("heroPostShipment")} ↗
              </a>
              <a className="button ghost" href={health.demo ? "#accounts" : "#how"}>
                {t(health.demo ? "heroTry" : "navHow")}
              </a>
            </div>
            <div className="access-benefits">
              <span>✓ {t("benefitVerified")}</span>
              <span>✓ {t("benefitProtected")}</span>
              <span>✓ {t("benefitTracking")}</span>
              <span>✓ {t("benefitNoCommission")}</span>
              <span>✓ AR / EN / TR</span>
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

        {/* 2. Why use the platform */}
        <section id="why" className="landing-section">
          <h2>{t("whyTitle")}</h2>
          <p className="section-lead">{t("whyLead")}</p>
          <div className="compare">
            <div className="compare-head">
              <span />
              <b>{t("compareUsual")}</b>
              <b className="ours">{t("compareOurs")}</b>
            </div>
            {["Offers", "Price", "Visibility", "Rules", "Payment"].map((k) => (
              <div className="compare-row" key={k}>
                <span className="compare-topic">{t("compareTopic" + k)}</span>
                <span className="compare-usual">{t("compareUsual" + k)}</span>
                <span className="compare-ours">✓ {t("compareOurs" + k)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. How a shipment to Syria runs */}
        <section id="how" className="landing-section">
          <h2>{t("howTitle")}</h2>
          <p className="section-lead">{t("howLead")}</p>
          <ol className="about-steps">
            {["howStep1", "howStep2", "howStep3", "howStep4"].map((k, i) => (
              <li key={k}>
                <span>{i + 1}</span>
                <b>{t(k)}</b>
                <small>{t(k + "Text")}</small>
              </li>
            ))}
          </ol>
          <div className="corridor">
            <h3>{t("corridorTitle")}</h3>
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
          </div>
        </section>

        {/* 4. What you get */}
        <section id="features" className="landing-section">
          <h2>{t("featuresTitle")}</h2>
          <div className="feature-grid">
            {[
              ["📍", "featTracking"],
              ["⏳", "featCrossing"],
              ["🔒", "featPayment"],
              ["📄", "featDocs"],
              ["💬", "featAlerts"],
              ["📱", "featDriverApp"],
            ].map(([icon, k]) => (
              <article key={k}>
                <span className="feature-icon">{icon}</span>
                <h3>{t(k)}</h3>
                <p>{t(k + "Text")}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 5. Who it is for: register, or try a demo account */}
        <section id="accounts" className="landing-section">
          <h2>{t("accountsTitle")}</h2>
          <p className="section-lead">{t(health.demo ? "accountsLeadDemo" : "accountsLead")}</p>
          <div className="landing-account-cards">
            {types.map((type) => (
              <article key={type}>
                <span className="access-symbol">{symbols[type]}</span>
                <h3>{t(type)}</h3>
                <p>{t(`short_${type}`)}</p>
                <a className="button" href={`/register/${type}`}>
                  {t("createAccount")} ↗
                </a>
                {health.demo && (
                  <button className="button ghost" disabled={!!busy} onClick={() => tryAs(type)}>
                    {busy === type ? t("loading") : t("tryDemo")}
                  </button>
                )}
              </article>
            ))}
          </div>
          {health.demo && (
            <p className="muted small">
              {t("tryPlatformNote")}{" "}
              <button className="text-button" disabled={!!busy} onClick={() => tryAs("admin")}>
                {t("tryAdminDemo")}
              </button>
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <p className="muted small">
            {t("haveAccount")} <a href="/login">{t("signIn")}</a>
          </p>
        </section>

        {/* 6. Trust */}
        <section id="verification" className="landing-verification">
          <div>
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
          </div>
        </section>

        {/* 7. Cost and questions */}
        <section id="faq" className="landing-section">
          <div className="pricing-card">
            <h2>{t("pricingTitle")}</h2>
            <ul>
              <li>✓ {t("pricingFree")}</li>
              <li>✓ {t("pricingProtected")}</li>
              <li>✓ {t("pricingDirect")}</li>
            </ul>
            {health.pricing && (
              <>
                <div className="price-grid">
                  {types.map((type) => (
                    <div key={type} className="price-item">
                      <span>{t(type)}</span>
                      <b>
                        {health.pricing.prices[type] > 0 ? (
                          <>
                            <bdi dir="ltr">${health.pricing.prices[type]}</bdi>{" "}
                            <small>/ {t("perMonth")}</small>
                          </>
                        ) : (
                          t("freePrice")
                        )}
                      </b>
                    </div>
                  ))}
                </div>
                <p className="price-note">{t("yearlyNote")}</p>
              </>
            )}
          </div>
          <h2>{t("faqTitle")}</h2>
          <div className="faq">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <details key={n}>
                <summary>{t("faqQ" + n)}</summary>
                <p>{t("faqA" + n)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 8. Who we are */}
        <About t={t} />
      </main>

      <footer className="landing-footer">
        <div className="footer-brand">
          <a className="brand" href="/">
            LogiBridge
          </a>
          <span>{t("tagline")}</span>
        </div>
        <div className="footer-contact">
          <b>{t("contactUs")}</b>
          {health.supportEmail ? (
            <a href={`mailto:${health.supportEmail}`} dir="ltr">
              {health.supportEmail}
            </a>
          ) : (
            <span>{t("contactViaAccount")}</span>
          )}
        </div>
        <LegalLinks t={t} />
        <span>© 2026 · AR / EN / TR</span>
      </footer>
    </div>
  );
}

// Who we are, vision, mission and values.
function About({ t }) {
  return (
    <section id="about" className="landing-section landing-about">
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
    </section>
  );
}
