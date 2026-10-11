import React, { useState, useEffect } from "react";
export function PendingAccount({ data, t, navigate }) {
  const status = data.user.verificationStatus;
  return (
    <section className="panel pending-account">
      <span className="identity-seal">◇</span>
      <h1>{t("accountAwaitingApproval")}</h1>
      <p>{t("approvalRestrictionNote")}</p>
      <span className={`badge ${status}`}>{t(status || "not_submitted")}</span>
      {status === "rejected" && data.user.review?.reason && (
        <p className="form-error">
          {t("rejectionReason")}: {data.user.review.reason}
        </p>
      )}
      <p>{t(status === "rejected" ? "rejectedAccountNext" : "reviewEmailNote")}</p>
      <div className="actions">
        <button className="button" onClick={() => navigate("kyb")}>
          {t("completeApplication")}
        </button>
        <button className="button ghost" onClick={() => navigate("profile")}>
          {t("profile")}
        </button>
      </div>
    </section>
  );
}
export function Profile({ data, t, run, busy }) {
  const p = data.user.profile || {};
  return (
    <>
      <h1>{t("profile")}</h1>
      <p>{t("profileIntro")}</p>
      <form
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run("/profile", { ...Object.fromEntries(f), companyEmails: f.has("companyEmails") }, "PUT");
        }}
      >
        <h3>{data.user.name}</h3>
        <p dir="ltr">{data.user.email}</p>
        <AccountDetails account={data.user} t={t} />
        <label className="field">
          <span>{t("aboutUs")}</span>
          <textarea name="about" rows="5" required maxLength="2000" defaultValue={p.about || ""} />
        </label>
        <label className="field">
          <span>{t("ourServices")}</span>
          <textarea name="services" rows="5" required maxLength="2000" defaultValue={p.services || ""} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>{t("profileLocation")}</span>
            <input name="location" maxLength="120" defaultValue={p.location || ""} />
          </label>
          <label className="field">
            <span>{t("website")}</span>
            <input
              name="website"
              type="url"
              maxLength="300"
              dir="ltr"
              defaultValue={p.website || ""}
              placeholder="https://"
            />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="companyEmails" defaultChecked={p.companyEmails !== false} />
          <span>{t("companyEmailPreference")}</span>
        </label>
        <p className="muted">{t("profilePrivacyNote")}</p>
        <button className="button" disabled={busy}>
          {t("save")}
        </button>
      </form>
    </>
  );
}
export function Directory({ t, data }) {
  const [items, setItems] = useState([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/directory")
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((v) => {
        if (active) setItems(v);
      })
      .catch(() => {
        if (active) setError(t("error"));
      });
    return () => {
      active = false;
    };
  }, [data.user.id]);
  return (
    <>
      <h1>{t("directory")}</h1>
      <p>{t("directoryIntro")}</p>
      <div className="filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchServices")} />
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="cards">
        {items
          .filter((u) =>
            `${u.name} ${u.profile.services} ${u.profile.location}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((u) => (
            <article className="panel public-profile" key={u.id}>
              <span className="tag">{t(u.accountType)}</span>
              <h2>
                {u.name} {u.verified ? "✓" : ""}
              </h2>
              <p>{u.profile.location}</p>
              <h3>{t("aboutUs")}</h3>
              <p className="profile-text">{u.profile.about}</p>
              <h3>{t("ourServices")}</h3>
              <p className="profile-text">{u.profile.services}</p>
              {u.profile.website && (
                <a
                  className="button ghost"
                  href={u.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("website")} ↗
                </a>
              )}
            </article>
          ))}
      </div>
      {!items.length && <p className="panel">{t("empty")}</p>}
    </>
  );
}
export function ContactEmail({ t }) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((v) => setEmail(v.supportEmail || ""))
      .catch(() => {});
  }, []);
  return (
    <p className="access-contact">
      {t("contactEmail")}:{" "}
      {email ? (
        <a href={`mailto:${email}`} dir="ltr">
          {email}
        </a>
      ) : (
        <span>{t("contactNotConfigured")}</span>
      )}
    </p>
  );
}
export function AdminEmailSettings({ data, t, run, busy }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (data.user.demo) return;
    fetch("/api/admin/email-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, [data]);
  if (data.user.demo) return null;
  return (
    <section className="panel">
      <h2>{t("emailSettings")}</h2>
      <p className="notice">{t(status?.configured ? "emailServiceReady" : "emailServiceMissing")}</p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          run("/admin/contact", Object.fromEntries(new FormData(e.currentTarget)), "PUT");
        }}
      >
        <label className="field">
          <span>{t("contactEmail")}</span>
          <input
            type="email"
            name="email"
            required
            maxLength="254"
            defaultValue={status?.supportEmail || ""}
            key={status?.supportEmail}
            dir="ltr"
          />
        </label>
        <button className="button" disabled={busy}>
          {t("save")}
        </button>
      </form>
      {status && (
        <>
          <p>
            {t("emailQueue")}: {status.counts.pending + status.counts.sending} · {t("emailSent")}:{" "}
            {status.counts.sent} · {t("emailFailed")}: {status.counts.failed}
          </p>
          <button
            className="button ghost"
            disabled={busy || !status.configured}
            onClick={() => run("/admin/emails/retry", {})}
          >
            {t("retryEmail")}
          </button>
        </>
      )}
    </section>
  );
}
// Change password; every other device is signed out by the server.
export function AccountSecurity({ data, t, run, busy }) {
  const [error, setError] = useState("");
  const user = data.user;
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t("accountSecurity")}</h2>
          <p>{t("accountSecurityIntro")}</p>
        </div>
      </div>
      <div className="panel form-stack security-panel">
        <p className="muted small" dir="ltr">
          {user.email}
        </p>
        {user.demo ? (
          <p className="notice">{t("demoNoPassword")}</p>
        ) : (
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const form = e.currentTarget,
                b = Object.fromEntries(new FormData(form));
              if (b.newPassword !== b.confirmPassword) return setError(t("passwordMismatch"));
              const ok = await run(
                "/account/password",
                { currentPassword: b.currentPassword, newPassword: b.newPassword },
                "POST",
                { success: "passwordChanged" },
              );
              if (ok) form.reset();
            }}
          >
            <label className="field">
              <span>{t("currentPassword")}</span>
              <input
                name="currentPassword"
                type="password"
                required
                maxLength="128"
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <span>{t("newPassword")}</span>
              <input
                name="newPassword"
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
            <button className="button" disabled={busy}>
              {t("changePassword")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
// Owner switches: demo sign-in buttons and the activity emails about the site.
export function AdminSiteSettings({ data, t, run, busy }) {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    if (data.user.demo) return;
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSettings)
      .catch(() => {});
  }, [data]);
  if (data.user.demo || !settings) return null;
  const save = (body) => {
    setSettings({ ...settings, ...body });
    return run("/admin/settings", body, "PUT");
  };
  return (
    <section className="panel form-stack">
      <h2>{t("siteSettings")}</h2>
      <label className="consent">
        <input
          type="checkbox"
          checked={settings.demoLogin}
          disabled={busy}
          onChange={(e) => save({ demoLogin: e.target.checked })}
        />
        <span>
          <b>{t("showDemoAccounts")}</b>
          <br />
          <small>{t("showDemoAccountsNote")}</small>
        </span>
      </label>
      <label className="consent">
        <input
          type="checkbox"
          checked={settings.activityEmails}
          disabled={busy}
          onChange={(e) => save({ activityEmails: e.target.checked })}
        />
        <span>
          <b>{t("activityEmails")}</b>
          <br />
          <small>{t("activityEmailsNote")}</small>
        </span>
      </label>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          save({ notifyEmail: new FormData(e.currentTarget).get("notifyEmail") });
        }}
      >
        <label className="field">
          <span>{t("notifyEmail")}</span>
          <input
            type="email"
            name="notifyEmail"
            maxLength="254"
            dir="ltr"
            defaultValue={settings.notifyEmail}
            key={settings.notifyEmail}
            placeholder={settings.recipient}
          />
        </label>
        <button className="button" disabled={busy}>
          {t("save")}
        </button>
      </form>
      <p className="muted small">
        {t("activityRecipient")}: <b dir="ltr">{settings.recipient || "—"}</b>
        {!settings.emailConfigured && <> · {t("emailServiceMissing")}</>}
      </p>
    </section>
  );
}
// Information each account type gave at registration.
export function AccountDetails({ account, t }) {
  const d = account.details || {};
  const tc = account.taxCheck;
  const rows = [
    ["phone", d.phone],
    ["countryLabel", d.country],
    ["city", d.city],
    ["tradeActivity", d.activity && t("activity_" + d.activity)],
    ["mainProducts", d.products],
    ["transportLicense", d.license],
    ["fleetSize", d.fleetSize],
    ["serviceRoutes", d.routes],
    ["equipmentTypes", d.equipment],
    ["warehouseLocation", d.warehouse],
    ["taxId", account.taxId],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!rows.length && !tc) return null;
  return (
    <div className="account-details">
      <dl>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{t(k)}</dt>
            <dd dir={["phone", "taxId", "transportLicense"].includes(k) ? "ltr" : undefined}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      {tc && <TaxBadge check={tc} t={t} />}
    </div>
  );
}
export function TaxBadge({ check, t }) {
  const kind = check.status === "valid" ? "approved" : check.status === "invalid" ? "rejected" : "pending";
  return (
    <p className="small">
      <span className={`badge ${kind}`}>{t("tax_" + check.status)}</span> {t("taxMethod_" + check.method)}
      {check.registeredName ? ` · ${check.registeredName}` : ""}
    </p>
  );
}
