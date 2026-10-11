import { ContactEmail } from "./Profiles";
import React, { useState, useEffect } from "react";
import CountrySelect from "./CountrySelect";
const accounts = ["merchant", "carrier", "supplier", "individual", "admin"];
const symbols = { merchant: "▤", carrier: "⇄", supplier: "▧", individual: "◉", admin: "◇" };
export default function AccountAccess({ t, langSelect, run, busy, toast, onEntered, user }) {
  const segment = window.location.pathname.split("/").filter(Boolean),
    type = accounts.includes(segment[1]) ? segment[1] : null;
  const requestedNext =
    new URLSearchParams(window.location.search).get("next") ||
    (window.location.pathname.startsWith("/workspace/") ? window.location.pathname : "");
  const next = /^\/workspace\/[a-zA-Z]+$/.test(requestedNext) ? requestedNext : "";
  const accountUrl = (path) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);
  const register = segment[0] === "register" && type !== "admin";
  const [demo, setDemo] = useState(false),
    [error, setError] = useState(""),
    [forgot, setForgot] = useState(false),
    [forgotResult, setForgotResult] = useState(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) => setDemo(r.demo))
      .catch(() => {});
  }, []);
  const title = (k) => t(k === "admin" ? "administrator" : k === "individual" ? "individual" : k);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (register && b.password !== b.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (forgot) {
      const result = await run("/auth/forgot", { email: b.email }, "POST", { silent: true });
      if (result) setForgotResult(result);
      return;
    }
    const { confirmPassword, ...fields } = b;
    const result = await run(
      register ? "/auth/register" : "/auth/login",
      register ? { ...fields, accountType: type } : { email: b.email, password: b.password },
    );
    if (result) onEntered?.(register, result.user);
  }
  return (
    <div className={`access-page ${type ? "account-" + type : ""}`}>
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <div className="access-layout">
        <section className="access-story">
          <span className="access-chip">
            TÜRKİYE · SYRIA · GLOBAL <i />
          </span>
          <h1>{type ? title(type) : t("accessWelcome")}</h1>
          <p>{t(type ? `access_${type}` : "accessIntro")}</p>
          <div className="bridge-illustration">
            <div className="bridge-city">
              <span>TR</span>
              <b>Gaziantep</b>
            </div>
            <div className="bridge-track">
              <span>⇄</span>
              <i />
              <i />
              <i />
            </div>
            <div className="bridge-city">
              <span>SY</span>
              <b>Aleppo</b>
            </div>
            <span className="bridge-orbit orbit-one" />
            <span className="bridge-orbit orbit-two" />
          </div>
          <div className="access-benefits">
            <span>✓ {t("secureAccess")}</span>
            <span>✓ {t("identityReview")}</span>
            <span>✓ AR / EN / TR</span>
          </div>
          <p className="access-footnote">{t("manualVerificationNote")}</p>
        </section>
        <section className="access-card">
          {!type ? (
            <>
              <span className="eyebrow">YOUR LOGISTICS WORKSPACE</span>
              <h2>{t("chooseAccount")}</h2>
              <p className="muted">{t("separateAccess")}</p>
              <div className="access-options">
                {accounts.map((k) => (
                  <a href={accountUrl(`/login/${k}`)} className="access-option" key={k}>
                    <span className="access-symbol">{symbols[k]}</span>
                    <span>
                      <b>{title(k)}</b>
                      <small>{t(`short_${k}`)}</small>
                    </span>
                    <span className="option-arrow">↗</span>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <>
              <a className="access-back" href={accountUrl("/accounts")}>
                ← {t("chooseAccount")}
              </a>
              <span className="access-form-icon">{symbols[type]}</span>
              <h2>
                {t(register ? "createAccount" : "signIn")} · {title(type)}
              </h2>
              <p className="muted">
                {t(forgot ? "forgotIntro" : register ? "registrationNext" : "accountLoginNote")}
              </p>
              {user && (
                <p className="notice">
                  {t("alreadySignedIn")} <b>{user.name}</b> ·{" "}
                  <a href="/workspace/dashboard">{t("openWorkspace")} ↗</a>
                </p>
              )}
              {forgotResult ? (
                <div className="form-stack">
                  {forgotResult.emailConfigured ? (
                    <p className="notice">{t("resetSent")}</p>
                  ) : (
                    <p className="notice">
                      {t("resetNoEmail")}{" "}
                      {forgotResult.supportEmail && (
                        <a href={`mailto:${forgotResult.supportEmail}`} dir="ltr">
                          {forgotResult.supportEmail}
                        </a>
                      )}
                    </p>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setForgot(false);
                      setForgotResult(null);
                    }}
                  >
                    ← {t("backToSignIn")}
                  </button>
                </div>
              ) : (
                <form className="form-stack" onSubmit={submit}>
                  {register && !forgot && (
                    <label className="field">
                      <span>{t(type === "individual" ? "fullName" : "company")}</span>
                      <input
                        name="name"
                        required
                        maxLength="120"
                        autoComplete={type === "individual" ? "name" : "organization"}
                      />
                    </label>
                  )}
                  {register && !forgot && (
                    <>
                      <CountrySelect
                        t={t}
                        label={type === "individual" ? "residenceCountry" : "registrationCountry"}
                      />
                      <div className="form-grid">
                        <label className="field">
                          <span>{t("city")}</span>
                          <input name="city" required maxLength="80" autoComplete="address-level2" />
                        </label>
                        <label className="field">
                          <span>{t("phone")}</span>
                          <input
                            name="phone"
                            type="tel"
                            required
                            maxLength="30"
                            dir="ltr"
                            placeholder="+90 5xx xxx xx xx"
                            autoComplete="tel"
                          />
                        </label>
                      </div>
                    </>
                  )}
                  {register && type !== "individual" && (
                    <label className="field">
                      <span>{t("taxId")}</span>
                      <input
                        name="taxId"
                        required
                        minLength="3"
                        maxLength="40"
                        dir="ltr"
                        autoComplete="off"
                      />
                      <small>{t("taxIdHint")}</small>
                    </label>
                  )}
                  {register && type === "merchant" && (
                    <>
                      <label className="field">
                        <span>{t("tradeActivity")}</span>
                        <select name="activity" required defaultValue="">
                          <option value="" disabled>
                            {t("choose")}
                          </option>
                          {["import", "export", "both"].map((k) => (
                            <option key={k} value={k}>
                              {t("activity_" + k)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>{t("mainProducts")}</span>
                        <input name="products" required maxLength="300" placeholder={t("mainProductsHint")} />
                      </label>
                    </>
                  )}
                  {register && type === "carrier" && (
                    <>
                      <div className="form-grid">
                        <label className="field">
                          <span>{t("transportLicense")}</span>
                          <input name="license" required maxLength="60" dir="ltr" />
                        </label>
                        <label className="field">
                          <span>{t("fleetSize")}</span>
                          <input name="fleetSize" type="number" required min="1" max="10000" step="1" />
                        </label>
                      </div>
                      <label className="field">
                        <span>{t("serviceRoutes")}</span>
                        <input name="routes" required maxLength="300" placeholder={t("serviceRoutesHint")} />
                      </label>
                    </>
                  )}
                  {register && type === "supplier" && (
                    <>
                      <label className="field">
                        <span>{t("equipmentTypes")}</span>
                        <input
                          name="equipment"
                          required
                          maxLength="300"
                          placeholder={t("equipmentTypesHint")}
                        />
                      </label>
                      <label className="field">
                        <span>{t("warehouseLocation")}</span>
                        <input name="warehouse" maxLength="120" />
                      </label>
                    </>
                  )}
                  <label className="field">
                    <span>{t("email")}</span>
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength="254"
                      autoComplete="username"
                      dir="ltr"
                    />
                  </label>
                  {!forgot && (
                    <label className="field">
                      <span>{t("password")}</span>
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={register ? 12 : 1}
                        maxLength="128"
                        autoComplete={register ? "new-password" : "current-password"}
                      />
                      {register && <small>{t("passwordRule")}</small>}
                    </label>
                  )}
                  {register && (
                    <>
                      <label className="field">
                        <span>{t("confirmPassword")}</span>
                        <input
                          name="confirmPassword"
                          type="password"
                          required
                          minLength="12"
                          maxLength="128"
                          autoComplete="new-password"
                        />
                      </label>
                      <label className="consent">
                        <input type="checkbox" required />
                        <span>{t("registrationConsent")}</span>
                      </label>
                    </>
                  )}
                  {error && (
                    <p role="alert" className="form-error">
                      {error}
                    </p>
                  )}
                  <button className="button access-submit" disabled={busy}>
                    {t(forgot ? "sendResetLink" : register ? "createAccount" : "signIn")} ↗
                  </button>
                  {!register && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setForgot(!forgot);
                        setError("");
                      }}
                    >
                      {forgot ? "← " + t("backToSignIn") : t("forgotPassword")}
                    </button>
                  )}
                </form>
              )}
              {type !== "admin" && !forgot && (
                <p className="access-register-link">
                  {t(register ? "alreadyAccount" : "noAccount")}{" "}
                  <a href={accountUrl(`/${register ? "login" : "register"}/${type}`)}>
                    {t(register ? "signIn" : "createAccount")}
                  </a>
                </p>
              )}
              {demo && !forgot && !register && (
                <div className="demo-access">
                  <span>{t("demoOnly")}</span>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      const result = await run("/login", { userId: type });
                      if (result) onEntered?.(false, result.user);
                    }}
                  >
                    {t("tryDemo")} ↗
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <ContactEmail t={t} />
      <footer className="access-footer">
        <span>© 2026 LogiBridge</span>
        <span>{t("tagline")}</span>
      </footer>
      {toast && (
        <div role="alert" className={`toast ${toast.ok ? "ok" : "bad"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
// Page opened from the "reset password" email: /reset-password#<token>
export function ResetPassword({ t, langSelect, run, busy, toast }) {
  const token = window.location.hash.slice(1);
  const [error, setError] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    // Remove the secret from the address bar and browser history.
    if (token) history.replaceState(null, "", "/reset-password");
  }, []);
  const [secret] = useState(token);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (b.password !== b.confirmPassword) return setError(t("passwordMismatch"));
    const result = await run("/auth/reset", { token: secret, password: b.password }, "POST", {
      silent: true,
    });
    if (result) setDone(true);
  }
  return (
    <div className="access-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <div className="access-layout single">
        <section className="access-card">
          <span className="access-form-icon">◇</span>
          <h2>{t("resetTitle")}</h2>
          {done ? (
            <>
              <p className="notice">{t("resetDone")}</p>
              <a className="button access-submit" href="/accounts">
                {t("signIn")} ↗
              </a>
            </>
          ) : !secret ? (
            <>
              <p className="notice">{t("err_Reset link invalid or expired")}</p>
              <a className="text-button" href="/accounts">
                ← {t("backToSignIn")}
              </a>
            </>
          ) : (
            <form className="form-stack" onSubmit={submit}>
              <label className="field">
                <span>{t("newPassword")}</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                />
                <small>{t("passwordRule")}</small>
              </label>
              <label className="field">
                <span>{t("confirmPassword")}</span>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                />
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="button access-submit" disabled={busy}>
                {t("save")} ↗
              </button>
            </form>
          )}
        </section>
      </div>
      {toast && (
        <div role="alert" className={`toast ${toast.ok ? "ok" : "bad"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
