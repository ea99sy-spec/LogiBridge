import React, { useEffect, useState } from "react";
import "./team.css";

// Team accounts: the company owner invites employees with their own sign-in and a role.

const ROLES = ["manager", "operations", "viewer"];

function InviteLink({ link, t }) {
  const url = window.location.origin + link;
  const [copied, setCopied] = useState(false);
  return (
    <div className="team-link">
      <p>{t("teamLinkNote")}</p>
      <code dir="ltr">{url}</code>
      <div className="team-link-actions">
        <button
          className="button small-button"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
          }}
        >
          {copied ? "✓ " + t("copied") : t("copyLink")}
        </button>
        <a
          className="button ghost small-button"
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(t("teamInviteShare") + " " + url)}`}
        >
          {t("shareWhatsapp")}
        </a>
      </div>
    </div>
  );
}

export function TeamPage({ t, lang, run, busy }) {
  const [members, setMembers] = useState(null);
  const [link, setLink] = useState(null);
  const load = () =>
    fetch("/api/team")
      .then((r) => r.json())
      .then((r) => setMembers(r.members || []))
      .catch(() => setMembers([]));
  useEffect(() => {
    load();
  }, []);
  const call = async (path, body, method, success) => {
    const r = await run(path, body, method, { success });
    load();
    return r;
  };
  const date = (d) => (d ? new Date(d).toLocaleDateString(lang) : "—");
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("team")}</h1>
          <p>{t("teamIntro")}</p>
        </div>
      </div>
      <div className="team-roles panel">
        {ROLES.map((r) => (
          <div key={r}>
            <b>{t("teamRole_" + r)}</b>
            <small>{t("teamRoleDesc_" + r)}</small>
          </div>
        ))}
      </div>
      <form
        className="panel form-stack team-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const r = await call("/team", Object.fromEntries(new FormData(form)), "POST", "teamInvited");
          if (r?.link) {
            setLink(r.link);
            form.reset();
          }
        }}
      >
        <h3>＋ {t("inviteMember")}</h3>
        <div className="team-form-grid">
          <label className="field">
            <span>{t("memberName")}</span>
            <input name="name" required maxLength={120} />
          </label>
          <label className="field">
            <span>{t("email")}</span>
            <input name="email" type="email" required maxLength={254} dir="ltr" />
          </label>
          <label className="field">
            <span>{t("teamRoleLabel")}</span>
            <select name="teamRole" defaultValue="operations">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t("teamRole_" + r)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button" disabled={busy}>
          {t("createInvite")}
        </button>
        {link && <InviteLink link={link} t={t} />}
      </form>
      {members === null ? (
        <p className="muted">{t("loading")}</p>
      ) : members.length ? (
        <div className="panel table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>{t("memberName")}</th>
                <th>{t("teamRoleLabel")}</th>
                <th>{t("status")}</th>
                <th>{t("lastLogin")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={m.disabled ? "muted" : ""}>
                  <td>
                    <b>{m.name}</b>
                    <br />
                    <small dir="ltr">{m.email}</small>
                  </td>
                  <td>
                    <select
                      aria-label={t("teamRoleLabel")}
                      value={m.teamRole}
                      disabled={busy}
                      onChange={(e) => call(`/team/${m.id}`, { teamRole: e.target.value }, "PUT", "saved")}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t("teamRole_" + r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${m.disabled ? "cancelled" : m.invited ? "open" : "delivered"}`}>
                      {t(m.disabled ? "memberDisabled" : m.invited ? "memberInvited" : "memberActive")}
                    </span>
                  </td>
                  <td>{date(m.lastLoginAt)}</td>
                  <td>
                    <div className="team-actions">
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={async () => {
                          const r = await call(`/team/${m.id}/link`, {}, "POST", "teamLinkCreated");
                          if (r?.link) setLink(r.link);
                        }}
                      >
                        {t("newSignInLink")}
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => call(`/team/${m.id}`, { disabled: !m.disabled }, "PUT", "saved")}
                      >
                        {t(m.disabled ? "enableMember" : "disableMember")}
                      </button>
                      <button
                        className="text-button danger-text"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(t("removeMemberConfirm")) &&
                          call(`/team/${m.id}`, {}, "DELETE", "saved")
                        }
                      >
                        {t("removeMember")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{t("noTeamYet")}</p>
      )}
    </>
  );
}

export function TeamInvite({ t, langSelect, run, busy }) {
  const [secret] = useState(window.location.hash.slice(1));
  const [error, setError] = useState("");
  useEffect(() => {
    if (secret) history.replaceState(null, "", "/team-invite");
  }, []);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const b = Object.fromEntries(new FormData(e.currentTarget));
    if (b.password !== b.confirmPassword) return setError(t("passwordMismatch"));
    const r = await run("/team/accept", { token: secret, password: b.password }, "POST", { silent: true });
    if (r) window.location.assign("/workspace/dashboard");
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
          <span className="access-form-icon">👥</span>
          <h2>{t("teamInviteTitle")}</h2>
          {!secret ? (
            <p className="notice">{t("err_Invite link expired or already used")}</p>
          ) : (
            <form className="form-stack" onSubmit={submit}>
              <p className="muted">{t("teamInviteIntro")}</p>
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
                <input name="confirmPassword" type="password" required autoComplete="new-password" />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="button access-submit" disabled={busy}>
                {t("teamInviteAccept")}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
