import React, { useState, useEffect } from "react";
import { waLink } from "../shared/wa";
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
      {data.user.accountType !== "individual" && !data.user.profile?.contactEmail && (
        <p className="notice">{t("completeProfileFirst")}</p>
      )}
      <div className="actions">
        {data.user.accountType !== "individual" && !data.user.profile?.contactEmail ? (
          <button className="button" onClick={() => navigate("profile")}>
            1 · {t("profile")}
          </button>
        ) : (
          <button className="button" onClick={() => navigate("kyb")}>
            {t("completeApplication")}
          </button>
        )}
        <button className="button ghost" onClick={() => navigate("profile")}>
          {t("profile")}
        </button>
      </div>
    </section>
  );
}
// Shrinks a chosen logo to at most 256×256 so profiles stay light.
async function resizeLogo(file) {
  if (!file || !["image/png", "image/jpeg"].includes(file.type) || file.size > 5000000) throw new Error();
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 256 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function Logo({ src, name, size = 56 }) {
  return src ? (
    <img className="company-logo" src={src} alt="" width={size} height={size} />
  ) : (
    <span className="company-logo placeholder" style={{ width: size, height: size }}>
      {(name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}
export function Profile({ data, t, run, busy, navigate }) {
  const p = data.user.profile || {};
  const company = data.user.accountType !== "individual";
  const [logo, setLogo] = useState(p.logo || null),
    [logoError, setLogoError] = useState("");
  return (
    <>
      <h1>{t("profile")}</h1>
      <p>{t("profileIntro")}</p>
      <form
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          f.delete("logoFile");
          run(
            "/profile",
            {
              ...Object.fromEntries(f),
              companyEmails: f.has("companyEmails"),
              borderEmails: f.has("borderEmails"),
              whatsappNotify: f.has("whatsappNotify"),
              logo: logo || null,
            },
            "PUT",
          );
        }}
      >
        <div className="profile-head">
          <Logo src={logo} name={data.user.name} size={72} />
          <div>
            <h3>{data.user.name}</h3>
            <p dir="ltr" className="muted small">
              {data.user.email}
            </p>
            {!data.user.demo && !data.approvalRequired && navigate && (
              <button type="button" className="text-button" onClick={() => navigate("company", data.user.id)}>
                {t("viewMyPage")} ↗
              </button>
            )}
          </div>
        </div>
        {company && (
          <label className="field">
            <span>{t("companyLogo")}</span>
            <input
              type="file"
              name="logoFile"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                setLogoError("");
                try {
                  if (e.target.files[0]) setLogo(await resizeLogo(e.target.files[0]));
                } catch {
                  setLogoError(t("logoInvalid"));
                }
              }}
            />
            {logo && (
              <button type="button" className="text-button" onClick={() => setLogo(null)}>
                {t("removeLogo")}
              </button>
            )}
            {logoError && <small className="form-error">{logoError}</small>}
          </label>
        )}
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
        <div className="form-grid">
          <label className="field">
            <span>{t(company ? "contactEmailRequired" : "contactEmailOptional")}</span>
            <input
              name="contactEmail"
              type="email"
              required={company}
              maxLength="254"
              dir="ltr"
              defaultValue={p.contactEmail || ""}
              placeholder="info@company.com"
            />
          </label>
          <label className="field">
            <span>{t("contactPhoneOptional")}</span>
            <input
              name="contactPhone"
              type="tel"
              maxLength="30"
              pattern="^(\+|00)[1-9][0-9 ()\-]{7,24}$"
              title={t("phoneIntlHint")}
              placeholder="+90 5xx xxx xx xx"
              dir="ltr"
              defaultValue={p.contactPhone || ""}
            />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="companyEmails" defaultChecked={p.companyEmails !== false} />
          <span>{t("companyEmailPreference")}</span>
        </label>
        <label className="consent">
          <input type="checkbox" name="borderEmails" defaultChecked={p.borderEmails !== false} />
          <span>{t("borderEmailPreference")}</span>
        </label>
        <label className="consent">
          <input
            type="checkbox"
            name="whatsappNotify"
            defaultChecked={p.whatsappNotify === true}
            disabled={!waLink(data.user.details?.phone)}
          />
          <span>
            <b>{t("whatsappNotify")}</b>
            <br />
            <small>
              {waLink(data.user.details?.phone)
                ? `${t("whatsappNotifyNote")} ${data.user.details.phone}`
                : t("whatsappPhoneMissing")}
              {!data.whatsappConfigured && <> · {t("whatsappNotActive")}</>}
            </small>
          </span>
        </label>
        <p className="muted">{t("profilePrivacyNote")}</p>
        <button className="button" disabled={busy}>
          {t("save")}
        </button>
      </form>
    </>
  );
}
export function Directory({ t, data, navigate }) {
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
            `${u.name} ${u.profile.services} ${u.profile.location} ${u.routes || ""}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((u) => (
            <article className="panel public-profile" key={u.id}>
              <div className="profile-head">
                <Logo src={u.logo} name={u.name} />
                <div>
                  <span className="tag">{t(u.accountType)}</span>
                  <h2>
                    {u.name} {u.verified ? <span className="verified">✓</span> : ""}
                  </h2>
                </div>
              </div>
              <p>{u.profile.location}</p>
              <p className="reputation">
                {u.rating ? (
                  <>
                    <span className="stars" aria-label={`${u.rating} / 5`}>
                      {"★".repeat(Math.round(u.rating))}
                      {"☆".repeat(5 - Math.round(u.rating))}
                    </span>{" "}
                    <b>{u.rating}</b> ({u.reviews} {t("reviewsCount")})
                  </>
                ) : (
                  <span className="muted">{t("noReviewsYet")}</span>
                )}{" "}
                · {u.completed} {t("completedOperations")}
              </p>
              {u.routes && (
                <p className="small">
                  <b>{t("serviceRoutes")}:</b> {u.routes}
                  {u.fleetSize ? ` · ${u.fleetSize} ${t("trucks")}` : ""}
                </p>
              )}
              <h3>{t("aboutUs")}</h3>
              <p className="profile-text">{u.profile.about}</p>
              <h3>{t("ourServices")}</h3>
              <p className="profile-text">{u.profile.services}</p>
              {u.recent?.map((r, i) => (
                <blockquote className="review-quote" key={i}>
                  {"★".repeat(r.score)} {r.comment}
                </blockquote>
              ))}
              <button className="button" onClick={() => navigate?.("company", u.id)}>
                {t("viewProfile")} ↗
              </button>{" "}
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
      <TwoFactorSettings data={data} t={t} run={run} busy={busy} />
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
          checked={settings.requireEmailVerification}
          disabled={busy || (!settings.emailConfigured && !settings.requireEmailVerification)}
          onChange={(e) => save({ requireEmailVerification: e.target.checked })}
        />
        <span>
          <b>{t("requireEmailVerification")}</b>
          <br />
          <small>
            {t(settings.emailConfigured ? "requireEmailVerificationNote" : "requireEmailVerificationOff")}
          </small>
        </span>
      </label>
      <PricingSettings settings={settings} save={save} t={t} busy={busy} />
      <div className="backup-tool">
        <b>{t("backupTitle")}</b>
        <small className="muted">{t("backupNote")}</small>
        <a className="button ghost" href="/api/admin/backup" download>
          ⬇ {t("downloadBackup")}
        </a>
      </div>
      <label className="consent">
        <input
          type="checkbox"
          checked={settings.enforceSubscription}
          disabled={busy}
          onChange={(e) => save({ enforceSubscription: e.target.checked })}
        />
        <span>
          <b>{t("enforceSubscription")}</b>
          <br />
          <small>{t("enforceSubscriptionNote")}</small>
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
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          save({ adminWhatsapp: new FormData(e.currentTarget).get("adminWhatsapp") });
        }}
      >
        <label className="field">
          <span>{t("adminWhatsapp")}</span>
          <input
            type="tel"
            name="adminWhatsapp"
            maxLength="30"
            dir="ltr"
            placeholder="+90 5xx xxx xx xx"
            defaultValue={settings.adminWhatsapp}
            key={settings.adminWhatsapp}
          />
        </label>
        <button className="button" disabled={busy}>
          {t("save")}
        </button>
      </form>
      <p className="muted small">
        {t(settings.whatsappConfigured ? "whatsappActive" : "whatsappNotActive")}
        {waLink(settings.adminWhatsapp) && (
          <>
            {" · "}
            <a
              href={waLink(settings.adminWhatsapp, "LogiBridge ✓")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("testWhatsappLink")}
            </a>
          </>
        )}
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
    ["brokerCrossings", d.crossings?.map((c) => t(c)).join("، ")],
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
// Two-factor sign-in with an authenticator app (recommended for the administrator).
export function TwoFactorSettings({ data, t, run, busy }) {
  const user = data.user;
  const [setup, setSetup] = useState(null),
    [codes, setCodes] = useState(null);
  if (user.demo) return null;
  const passwordField = (
    <label className="field">
      <span>{t("currentPassword")}</span>
      <input name="password" type="password" required maxLength="128" autoComplete="current-password" />
    </label>
  );
  return (
    <div className="panel form-stack security-panel">
      <h3>{t("twoFactorTitle")}</h3>
      <p className="muted small">{t("twoFactorIntro")}</p>
      {codes ? (
        <>
          <p className="notice">{t("backupCodesNote")}</p>
          <pre className="backup-codes" dir="ltr">
            {codes.join("\n")}
          </pre>
          <button className="button" onClick={() => setCodes(null)}>
            {t("backupCodesSaved")}
          </button>
        </>
      ) : user.twoFactor ? (
        <>
          <p>
            <span className="badge approved">✓ {t("twoFactorOn")}</span>{" "}
            <small>
              {t("backupCodesLeft")}: {user.backupCodesLeft}
            </small>
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const b = Object.fromEntries(new FormData(e.currentTarget));
              await run("/account/2fa/disable", b, "POST", { success: "twoFactorDisabled" });
            }}
          >
            {passwordField}
            <label className="field">
              <span>{t("twoFactorCode")}</span>
              <input name="code" required inputMode="numeric" maxLength="11" dir="ltr" />
            </label>
            <button className="button ghost danger" disabled={busy}>
              {t("twoFactorDisable")}
            </button>
          </form>
        </>
      ) : setup ? (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(
              "/account/2fa/enable",
              { code: new FormData(e.currentTarget).get("code") },
              "POST",
              { success: "twoFactorEnabled" },
            );
            if (r) {
              setSetup(null);
              setCodes(r.backupCodes);
            }
          }}
        >
          <p>{t("twoFactorScan")}</p>
          <img src={setup.qr} alt="QR" width="200" height="200" className="qr" />
          <p className="small">
            {t("twoFactorManual")}: <code dir="ltr">{setup.secret}</code>
          </p>
          <label className="field">
            <span>{t("twoFactorCode")}</span>
            <input
              name="code"
              required
              inputMode="numeric"
              maxLength="6"
              dir="ltr"
              autoComplete="one-time-code"
            />
          </label>
          <button className="button" disabled={busy}>
            {t("twoFactorConfirm")}
          </button>
        </form>
      ) : (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(
              "/account/2fa/setup",
              { password: new FormData(e.currentTarget).get("password") },
              "POST",
              { silent: true },
            );
            if (r) setSetup(r);
          }}
        >
          {passwordField}
          <button className="button" disabled={busy}>
            {t("twoFactorStart")}
          </button>
        </form>
      )}
    </div>
  );
}

// Full profile page of a company or person (members only).
export function CompanyProfile({ id, t, data, navigate, money }) {
  const [c, setC] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setC(null);
    setError("");
    fetch("/api/companies/" + encodeURIComponent(id || ""))
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw Error(v.error);
        return v;
      })
      .then((v) => active && setC(v))
      .catch(() => active && setError(t("profileUnavailable")));
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <section className="panel">
        <p className="notice">{error}</p>
        <button className="button ghost" onClick={() => navigate("directory")}>
          ← {t("directory")}
        </button>
      </section>
    );
  if (!c) return <p className="muted">{t("loading")}</p>;
  const d = c.details;
  const facts = [
    ["countryLabel", [d.city, d.country].filter(Boolean).join(", ")],
    ["tradeActivity", d.activity && t("activity_" + d.activity)],
    ["mainProducts", d.products],
    ["serviceRoutes", d.routes],
    ["fleetSize", d.fleetSize],
    ["equipmentTypes", d.equipment],
    ["warehouseLocation", d.warehouse],
    [
      "memberSince",
      c.memberSince && new Date(c.memberSince).toLocaleDateString(document.documentElement.lang),
    ],
  ].filter(([, v]) => v);
  const own = c.id === data.user.id;
  return (
    <div className="company-page">
      <button className="text-button" onClick={() => navigate("directory")}>
        ← {t("directory")}
      </button>
      <header className="panel company-hero">
        <Logo src={c.logo} name={c.name} size={96} />
        <div>
          <span className="tag">{t(c.accountType)}</span>
          <h1>
            {c.name} {c.verified && <span className="verified">✓ {t("verifiedAccount")}</span>}
          </h1>
          {c.profile.location && <p className="muted">{c.profile.location}</p>}
          <p className="reputation">
            {c.rating ? (
              <>
                <span className="stars">
                  {"★".repeat(Math.round(c.rating))}
                  {"☆".repeat(5 - Math.round(c.rating))}
                </span>{" "}
                <b>{c.rating}</b> ({c.reviewCount} {t("reviewsCount")})
              </>
            ) : (
              <span className="muted">{t("noReviewsYet")}</span>
            )}{" "}
            · {c.completed} {t("completedOperations")}
          </p>
        </div>
        {!own && (
          <div className="company-actions">
            <button
              className="button"
              onClick={() => {
                try {
                  localStorage.setItem("lb_chat_to", c.id);
                } catch {}
                navigate("hub");
              }}
            >
              ✉ {t("sendMessage")}
            </button>
            {c.accountType === "carrier" && data.user.role === "merchant" && (
              <button className="button ghost" onClick={() => navigate("newShipment")}>
                ＋ {t("requestQuote")}
              </button>
            )}
          </div>
        )}
      </header>
      <div className="two-cols">
        <section className="panel">
          <h2>{t("aboutUs")}</h2>
          <p className="profile-text">{c.profile.about || "—"}</p>
          <h2>{t("ourServices")}</h2>
          <p className="profile-text">{c.profile.services || "—"}</p>
          {facts.length > 0 && (
            <dl className="account-details-list">
              {facts.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </section>
        <section className="panel">
          <h2>{t("companyContact")}</h2>
          {c.profile.contactEmail && (
            <p>
              ✉{" "}
              <a href={`mailto:${c.profile.contactEmail}`} dir="ltr">
                {c.profile.contactEmail}
              </a>
            </p>
          )}
          {c.profile.contactPhone && (
            <p>
              ☎{" "}
              <a href={`tel:${c.profile.contactPhone.replace(/[^+0-9]/g, "")}`} dir="ltr">
                {c.profile.contactPhone}
              </a>
            </p>
          )}
          {waLink(c.profile.contactPhone) && (
            <p>
              <a
                className="button ghost small-button whatsapp"
                href={waLink(c.profile.contactPhone, `${t("waHello")} ${c.name} — LogiBridge`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("chatWhatsapp")}
              </a>
            </p>
          )}
          {c.profile.website && (
            <p>
              ↗{" "}
              <a href={c.profile.website} target="_blank" rel="noopener noreferrer" dir="ltr">
                {c.profile.website}
              </a>
            </p>
          )}
          {!c.profile.contactEmail && !c.profile.contactPhone && <p className="muted">{t("noContactYet")}</p>}
          {c.groups.length > 0 && (
            <>
              <h2>{t("upcomingTrips")}</h2>
              {c.groups.map((g) => (
                <p key={g.id} className="small">
                  {g.origin} → {g.destination} · {g.date} · {g.capacity - g.booked} m³ ·{" "}
                  {money ? money(g.pricePerM3) : g.pricePerM3 + " USD"} {t("perM3")}
                </p>
              ))}
            </>
          )}
          {c.products.length > 0 && (
            <>
              <h2>{t("marketplace")}</h2>
              {c.products.map((p) => (
                <p key={p.id} className="small">
                  {p.title} · {t(p.type)} · {money ? money(p.price) : p.price + " USD"}
                </p>
              ))}
            </>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>
          {t("customerReviews")} ({c.reviewCount})
        </h2>
        {c.reviews.length ? (
          c.reviews.map((r, i) => (
            <blockquote className="review-quote" key={i}>
              <span className="stars">{"★".repeat(r.score)}</span> {r.comment || ""}
              <small className="muted">
                {" "}
                — {r.by}
                {r.at ? " · " + new Date(r.at).toLocaleDateString(document.documentElement.lang) : ""}
              </small>
            </blockquote>
          ))
        ) : (
          <p className="muted">{t("noReviewsYet")}</p>
        )}
      </section>
    </div>
  );
}

// Subscription prices shown on the home page: edit them or hide them.
function PricingSettings({ settings, save, t, busy }) {
  const pricing = settings.pricing;
  if (!pricing) return null;
  const kinds = ["merchant", "carrier", "broker", "supplier", "individual"];
  return (
    <form
      className="form-stack pricing-settings"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          pricing: {
            visible: f.has("visible"),
            prices: Object.fromEntries(kinds.map((k) => [k, Number(f.get(k) || 0)])),
          },
        });
      }}
    >
      <h3>{t("pricingSettings")}</h3>
      <label className="consent">
        <input
          type="checkbox"
          name="visible"
          defaultChecked={pricing.visible}
          key={String(pricing.visible)}
        />
        <span>
          <b>{t("showPrices")}</b>
          <br />
          <small>{t("showPricesNote")}</small>
        </span>
      </label>
      <div className="price-inputs">
        {kinds.map((k) => (
          <label className="field" key={k}>
            <span>
              {t(k)} ($ / {t("perMonth")})
            </span>
            <input
              name={k}
              type="number"
              min="0"
              max="10000"
              step="1"
              dir="ltr"
              defaultValue={pricing.prices[k]}
              key={k + pricing.prices[k]}
            />
          </label>
        ))}
      </div>
      <button className="button" disabled={busy}>
        {t("save")}
      </button>
    </form>
  );
}
