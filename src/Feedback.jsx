import React, { useEffect, useMemo, useState } from "react";
import "./feedback.css";

// Ratings of the platform, complaints and suggestions: every account sends them, the
// administration answers them in its own section.

const TYPES = ["rating", "complaint", "suggestion"];
const STATUSES = ["new", "in_progress", "resolved", "closed"];
const ICON = { rating: "★", complaint: "!", suggestion: "💡" };

function useList(url, deps = []) {
  const [items, setItems] = useState(null);
  const load = () =>
    fetch(url)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  useEffect(() => {
    load();
  }, deps);
  return [items, load];
}

function Stars({ value, onChange, size = 28, label }) {
  return (
    <span className="fb-stars" role={onChange ? "radiogroup" : "img"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}/5`}
            className={n <= value ? "on" : ""}
            style={{ fontSize: size }}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? "on" : ""} style={{ fontSize: size }}>
            ★
          </span>
        ),
      )}
    </span>
  );
}

const when = (iso, lang) => new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });

function Thread({ f, t, lang, adminName }) {
  return (
    <div className="fb-thread">
      <p className="fb-message" dir="auto">
        {f.message || "—"}
      </p>
      {f.replies?.map((r, i) => (
        <div key={i} className="fb-reply">
          <b>{adminName || t("platformAdmin")}</b>
          <p dir="auto">{r.text}</p>
          <small>{when(r.at, lang)}</small>
        </div>
      ))}
    </div>
  );
}

// Every account: send a rating, complaint or suggestion, and follow the answers.
export function FeedbackPage({ data, user, t, lang, run, busy }) {
  const [items, reload] = useList("/api/feedback");
  const [type, setType] = useState("rating");
  const [stars, setStars] = useState(0);
  const shipments = (data.shipments || []).filter(
    (s) => !s.parentId && [s.ownerId, s.carrierId].includes(user.id),
  );
  const partners = useMemo(() => {
    const ids = new Set();
    for (const s of data.shipments || [])
      for (const id of [s.ownerId, s.carrierId]) if (id && id !== user.id) ids.add(id);
    return [...ids].map((id) => data.users.find((u) => u.id === id)).filter((u) => u && u.role !== "admin");
  }, [data, user]);
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("feedback")}</h1>
          <p>{t("feedbackIntro")}</p>
        </div>
      </div>
      <div className="fb-layout">
        <form
          className="panel form-stack fb-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            await run(
              "/feedback",
              {
                type,
                stars: type === "rating" ? stars : undefined,
                subject: f.get("subject") || "",
                message: f.get("message") || "",
                shipmentId: f.get("shipmentId") || "",
                aboutId: f.get("aboutId") || "",
              },
              "POST",
              { success: "feedbackSent" },
            );
            form.reset();
            setStars(0);
            reload();
          }}
        >
          <div className="fb-types" role="radiogroup" aria-label={t("feedbackType")}>
            {TYPES.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={type === k}
                className={`fb-type ${k} ${type === k ? "on" : ""}`}
                onClick={() => setType(k)}
              >
                <span>{ICON[k]}</span>
                <b>{t("fbType_" + k)}</b>
                <small>{t("fbTypeHint_" + k)}</small>
              </button>
            ))}
          </div>
          {type === "rating" && (
            <div className="fb-rate">
              <span>{t("rateThePlatform")}</span>
              <Stars value={stars} onChange={setStars} label={t("rateThePlatform")} size={34} />
            </div>
          )}
          <label className="field">
            <span>{t("fbSubject")}</span>
            <input name="subject" maxLength={140} placeholder={t("fbSubjectExample_" + type)} />
          </label>
          {type === "complaint" && (
            <div className="fb-links">
              {shipments.length > 0 && (
                <label className="field">
                  <span>{t("fbAboutShipment")}</span>
                  <select name="shipmentId" defaultValue="">
                    <option value="">{t("fbNone")}</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {partners.length > 0 && (
                <label className="field">
                  <span>{t("fbAboutCompany")}</span>
                  <select name="aboutId" defaultValue="">
                    <option value="">{t("fbNone")}</option>
                    {partners.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          <label className="field">
            <span>{t(type === "rating" ? "fbMessageOptional" : "fbMessage")}</span>
            <textarea
              name="message"
              rows={5}
              maxLength={3000}
              required={type !== "rating"}
              minLength={type !== "rating" ? 5 : undefined}
              placeholder={t("fbMessageExample_" + type)}
            />
          </label>
          <button className="button" disabled={busy || (type === "rating" && !stars)}>
            {t("fbSend_" + type)}
          </button>
          <small className="muted">{t("fbPrivacy")}</small>
        </form>
        <section className="panel fb-mine">
          <h3>{t("fbMyMessages")}</h3>
          {items === null ? (
            <p className="muted">{t("loading")}</p>
          ) : items.length ? (
            <ul>
              {items.map((f) => (
                <li key={f.id} className={`fb-item ${f.type}`}>
                  <div className="fb-item-head">
                    <span className={`fb-badge ${f.type}`}>
                      {ICON[f.type]} {t("fbType_" + f.type)}
                    </span>
                    <span className={`fb-status ${f.status}`}>{t("fbStatus_" + f.status)}</span>
                  </div>
                  {f.stars ? <Stars value={f.stars} size={16} label={`${f.stars}/5`} /> : null}
                  {f.subject && <b dir="auto">{f.subject}</b>}
                  <Thread f={f} t={t} lang={lang} />
                  <small className="muted">{when(f.createdAt, lang)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("fbNoMessages")}</p>
          )}
        </section>
      </div>
    </>
  );
}

// Administration: everything sent by the accounts, with filters, status and replies.
export function FeedbackAdmin({ t, lang, run, busy }) {
  const [items, reload] = useList("/api/admin/feedback");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("open");
  const [query, setQuery] = useState("");
  const all = items || [];
  const ratings = all.filter((f) => f.type === "rating" && f.stars);
  const avg = ratings.length ? ratings.reduce((a, f) => a + f.stars, 0) / ratings.length : 0;
  const shown = all.filter(
    (f) =>
      (!type || f.type === type) &&
      (status === "all" ||
        (status === "open" ? ["new", "in_progress"].includes(f.status) : f.status === status)) &&
      (!query ||
        `${f.userName} ${f.subject} ${f.message} ${f.aboutName}`.toLowerCase().includes(query.toLowerCase())),
  );
  const act = async (id, body) => {
    await run(`/admin/feedback/${id}`, body, "POST", { success: "saved" });
    reload();
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("feedbackAdmin")}</h1>
          <p>{t("feedbackAdminIntro")}</p>
        </div>
      </div>
      <div className="fb-summary">
        <div>
          <b>{ratings.length ? avg.toFixed(1) : "—"}</b>
          <Stars value={Math.round(avg)} size={16} label={avg.toFixed(1)} />
          <small>
            {t("fbAverage")} ({ratings.length})
          </small>
        </div>
        <div className="complaint">
          <b>
            {all.filter((f) => f.type === "complaint" && ["new", "in_progress"].includes(f.status)).length}
          </b>
          <small>{t("fbOpenComplaints")}</small>
        </div>
        <div>
          <b>{all.filter((f) => f.type === "suggestion").length}</b>
          <small>{t("fbSuggestions")}</small>
        </div>
        <div>
          <b>{all.filter((f) => f.status === "new").length}</b>
          <small>{t("fbNew")}</small>
        </div>
      </div>
      <div className="fb-filters">
        <div className="chip-tabs">
          {["", ...TYPES].map((k) => (
            <button
              key={k || "all"}
              type="button"
              className={type === k ? "active" : ""}
              onClick={() => setType(k)}
            >
              {k ? `${ICON[k]} ${t("fbType_" + k)}` : t("all")}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("fbStatus")}>
          <option value="open">{t("fbStatusOpen")}</option>
          {STATUSES.map((k) => (
            <option key={k} value={k}>
              {t("fbStatus_" + k)}
            </option>
          ))}
          <option value="all">{t("all")}</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("fbSearch")}
          aria-label={t("fbSearch")}
        />
      </div>
      {items === null ? (
        <p className="muted">{t("loading")}</p>
      ) : shown.length ? (
        <ul className="fb-admin-list">
          {shown.map((f) => (
            <li key={f.id} className={`panel fb-item ${f.type} st-${f.status}`}>
              <div className="fb-item-head">
                <span className={`fb-badge ${f.type}`}>
                  {ICON[f.type]} {t("fbType_" + f.type)}
                </span>
                <b dir="auto">{f.userName}</b>
                <small className="muted">{f.userKind ? t(f.userKind) : ""}</small>
                <small className="muted">{when(f.createdAt, lang)}</small>
                <select
                  className={`fb-status-select ${f.status}`}
                  value={f.status}
                  disabled={busy}
                  onChange={(e) => act(f.id, { status: e.target.value })}
                  aria-label={t("fbStatus")}
                >
                  {STATUSES.map((k) => (
                    <option key={k} value={k}>
                      {t("fbStatus_" + k)}
                    </option>
                  ))}
                </select>
              </div>
              {f.stars ? <Stars value={f.stars} size={18} label={`${f.stars}/5`} /> : null}
              {f.subject && <b dir="auto">{f.subject}</b>}
              {(f.aboutName || f.shipmentTitle) && (
                <small className="fb-about">
                  {f.aboutName ? `${t("fbAboutCompany")}: ${f.aboutName}` : ""}
                  {f.aboutName && f.shipmentTitle ? " · " : ""}
                  {f.shipmentTitle ? `${t("fbAboutShipment")}: ${f.shipmentTitle}` : ""}
                </small>
              )}
              <Thread f={f} t={t} lang={lang} adminName={t("you")} />
              <form
                className="fb-reply-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const reply = new FormData(form).get("reply");
                  if (!String(reply).trim()) return;
                  await act(f.id, { reply });
                  form.reset();
                }}
              >
                <input name="reply" maxLength={2000} placeholder={t("fbReplyPlaceholder")} />
                <button className="button small-button" disabled={busy}>
                  {t("fbReply")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t(all.length ? "notesNoMatch" : "fbAdminEmpty")}</p>
      )}
    </>
  );
}
