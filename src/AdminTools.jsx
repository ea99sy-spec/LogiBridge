import React, { useEffect, useState } from "react";
import { waLink } from "../shared/wa";
import "./admin-tools.css";

// Administration helpers: requests nobody answered yet, and the error log.

const ago = (iso, t) => {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
  return h < 48 ? `${h} ${t("hoursShort")}` : `${Math.round(h / 24)} ${t("daysShort")}`;
};

export function UnansweredRequests({ t, lang }) {
  const [hours, setHours] = useState(6);
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState({});
  const [msg, setMsg] = useState("");
  const load = () =>
    fetch("/api/admin/unanswered?hours=" + hours)
      .then((r) => (r.ok ? r.json() : { list: [] }))
      .then(setData)
      .catch(() => setData({ list: [] }));
  useEffect(() => {
    setData(null);
    load();
  }, [hours]);
  const site = window.location.origin;
  const nudge = async (sh) => {
    const ids = sh.providers.filter((p) => picked[sh.id + p.id] !== false && !p.notified).map((p) => p.id);
    const r = await fetch(`/api/admin/unanswered/${sh.id}/nudge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers: ids }),
    });
    const v = await r.json().catch(() => ({}));
    setMsg(r.ok ? t("nudgeSent").replace("{n}", v.count || 0) : t("err_" + (v.error || "")));
    load();
  };
  return (
    <section className="panel unanswered">
      <header>
        <div>
          <h3>⏳ {t("unansweredTitle")}</h3>
          <p className="muted small">{t("unansweredIntro")}</p>
        </div>
        <label>
          {t("olderThan")}{" "}
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[2, 6, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h} {t("hoursShort")}
              </option>
            ))}
          </select>
        </label>
      </header>
      {msg && <p className="notice">{msg}</p>}
      {!data ? (
        <p className="muted">{t("loading")}</p>
      ) : !data.list.length ? (
        <p className="muted">✓ {t("unansweredNone")}</p>
      ) : (
        <ul className="unanswered-list">
          {data.list.map((sh) => (
            <li key={sh.id}>
              <div className="ua-head">
                <b dir="auto">{sh.title}</b>
                <span className="muted small" dir="auto">
                  {sh.origin} → {sh.destination} · {sh.legType ? t("leg_" + sh.legType) : t("fullShipment")} ·
                  📅 {sh.date} · {t("waiting")} {ago(sh.createdAt, t)}
                </span>
                <span className="small">
                  {t("owner")}: {sh.owner.name}
                  {waLink(sh.owner.phone) && (
                    <>
                      {" "}
                      <a
                        href={waLink(sh.owner.phone, t("waOwnerNoOffers").replace("{title}", sh.title))}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        💬
                      </a>
                    </>
                  )}
                </span>
              </div>
              {sh.providers.length ? (
                <>
                  <div className="ua-providers">
                    {sh.providers.map((p) => (
                      <label key={p.id} className="ua-provider">
                        <input
                          type="checkbox"
                          disabled={p.notified}
                          checked={!p.notified && picked[sh.id + p.id] !== false}
                          onChange={(e) => setPicked({ ...picked, [sh.id + p.id]: e.target.checked })}
                        />
                        <span>
                          {p.name}
                          <small className="muted"> · {p.why.map((w) => t("why_" + w)).join("، ")}</small>
                          {p.notified && <small className="ok"> · ✓ {t("alreadyNotified")}</small>}
                        </span>
                        {waLink(p.phone) && (
                          <a
                            className="ua-wa"
                            href={waLink(
                              p.phone,
                              t("waProviderNudge")
                                .replace("{route}", `${sh.origin} → ${sh.destination}`)
                                .replace("{date}", sh.date) + ` ${site}/workspace/jobs`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                          >
                            💬
                          </a>
                        )}
                      </label>
                    ))}
                  </div>
                  <button className="button small-button" onClick={() => nudge(sh)}>
                    🔔 {t("notifySelected")}
                  </button>
                </>
              ) : (
                <p className="muted small">{t("noSuggestedProviders")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ErrorLog({ t, lang, demo }) {
  const [errors, setErrors] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () =>
    fetch("/api/admin/errors")
      .then((r) => (r.ok ? r.json() : { errors: [] }))
      .then((v) => setErrors(v.errors))
      .catch(() => setErrors([]));
  useEffect(() => {
    load();
  }, []);
  if (demo) return null;
  return (
    <section className="panel error-log">
      <header>
        <h3>
          🐞 {t("errorLog")}{" "}
          {errors?.length ? <span className="badge cancelled">{errors.length}</span> : null}
        </h3>
        <div>
          <button className="text-button" onClick={() => setOpen(!open)}>
            {t(open ? "hide" : "show")}
          </button>
          {errors?.length > 0 && (
            <button
              className="text-button danger-text"
              onClick={async () => {
                if (!window.confirm(t("clearErrorsConfirm"))) return;
                await fetch("/api/admin/errors", { method: "DELETE" });
                load();
              }}
            >
              {t("clearAll")}
            </button>
          )}
        </div>
      </header>
      <p className="muted small">{t("errorLogIntro")}</p>
      {open &&
        (!errors ? (
          <p className="muted">{t("loading")}</p>
        ) : !errors.length ? (
          <p className="muted">✓ {t("noErrors")}</p>
        ) : (
          <ul className="error-list">
            {errors.map((e) => (
              <li key={e.id}>
                <span className={`badge ${e.source === "server" ? "cancelled" : "open"}`}>
                  {t("src_" + e.source)}
                </span>{" "}
                <code dir="ltr">{e.message}</code>
                <small className="muted" dir="ltr">
                  {e.path} · ×{e.count} · {new Date(e.lastAt).toLocaleString(lang)}
                </small>
                {e.stack && (
                  <details>
                    <summary>{t("details")}</summary>
                    <pre dir="ltr">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
