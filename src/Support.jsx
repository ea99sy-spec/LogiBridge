import React, { useEffect, useRef, useState } from "react";
import { faq } from "../shared/supportFaq";
import { waLink } from "../shared/wa";
import { translate } from "./i18n";
import "./support.css";

// Support: the AI assistant (instant answers), WhatsApp with one tap, email, complaint tickets
// and the help-centre answers. A floating WhatsApp button and assistant are on every page.

const L = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));

let infoCache;
function useSupportInfo() {
  const [info, setInfo] = useState(infoCache || null);
  useEffect(() => {
    if (infoCache) return;
    fetch("/api/support/info")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        infoCache = v || { ai: false, whatsapp: "", email: "" };
        setInfo(infoCache);
      })
      .catch(() => setInfo({ ai: false, whatsapp: "", email: "" }));
  }, []);
  return info;
}

const WaIcon = () => (
  <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6S23 3 16 3zm0 23.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.3 1.1 1.2-4.2-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.2 9.7 10 5 16 5s10.8 4.7 10.8 10.6S22 26.2 16 26.2zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"
    />
  </svg>
);

export function SupportChat({ t, lang, compact = false, onHuman }) {
  const info = useSupportInfo();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [messages, busy]);
  const ask = async (q) => {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    setText("");
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch("/api/support/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          lang,
          history: messages.filter((m) => m.text).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(v.error || "");
      setMessages([
        ...next,
        { role: "assistant", text: v.answer || "", related: v.related || [], mode: v.mode, question },
      ]);
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", text: t("assistantError"), related: [], question, failed: true },
      ]);
    }
    setBusy(false);
  };
  const wa = (q) => waLink(info?.whatsapp, `${t("waSupportHello")}${q ? `\n${t("myQuestion")}: ${q}` : ""}`);
  const examples = ["exampleQ1", "exampleQ2", "exampleQ3"];
  return (
    <div className={`support-chat ${compact ? "compact" : ""}`}>
      <div className="chat-log" aria-live="polite">
        {!messages.length && (
          <div className="chat-hello">
            <p>👋 {t("assistantHello")}</p>
            <div className="chat-examples">
              {examples.map((k) => (
                <button key={k} type="button" onClick={() => ask(t(k))}>
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user" dir="auto">
              {m.text}
            </div>
          ) : (
            <div key={i} className="msg bot">
              {m.text && (
                <p dir="auto" className="pre-line">
                  {m.text}
                </p>
              )}
              {!m.text && m.related?.length > 0 && <p className="muted small">{t("closestAnswers")}</p>}
              {!m.text &&
                m.related?.map((f) => (
                  <div key={f.id} className="faq-hit">
                    <b dir="auto">{f.q}</b>
                    <p dir="auto">{f.a}</p>
                  </div>
                ))}
              {!m.text && !m.related?.length && !m.failed && <p>{t("noAnswerFound")}</p>}
              <div className="msg-actions">
                <small className="muted">{t("notSolved")}</small>
                {wa(m.question) && (
                  <a className="wa-small" href={wa(m.question)} target="_blank" rel="noopener noreferrer">
                    <WaIcon /> {t("talkToPerson")}
                  </a>
                )}
                {onHuman && (
                  <button type="button" className="text-button" onClick={onHuman}>
                    {t("openTicket")}
                  </button>
                )}
              </div>
            </div>
          ),
        )}
        {busy && <div className="msg bot typing">{t("assistantTyping")}</div>}
        <div ref={end} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={800}
          placeholder={t("askPlaceholder")}
          aria-label={t("askPlaceholder")}
          dir="auto"
        />
        <button className="button small-button" disabled={busy || !text.trim()}>
          {t("send")}
        </button>
      </form>
      <small className="muted chat-note">{t(info?.ai ? "assistantNoteAi" : "assistantNoteFaq")}</small>
    </div>
  );
}

export function SupportPage({ t, lang, navigate }) {
  const info = useSupportInfo();
  const i = L(lang);
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("support")}</h1>
          <p>{t("supportIntro")}</p>
        </div>
      </div>
      <div className="support-grid">
        <section className="panel">
          <h3>🤖 {t("assistantTitle")}</h3>
          <SupportChat t={t} lang={lang} onHuman={() => navigate("feedback")} />
        </section>
        <aside className="support-contacts">
          {info?.whatsapp && waLink(info.whatsapp) && (
            <a
              className="panel contact-card wa"
              href={waLink(info.whatsapp, t("waSupportHello"))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WaIcon />
              <span>
                <b>{t("whatsappSupport")}</b>
                <small>{t("whatsappSupportNote")}</small>
              </span>
            </a>
          )}
          {info?.email && (
            <a className="panel contact-card" href={`mailto:${info.email}`}>
              <span className="contact-icon">✉</span>
              <span>
                <b>{t("emailSupport")}</b>
                <small dir="ltr">{info.email}</small>
              </span>
            </a>
          )}
          <button type="button" className="panel contact-card" onClick={() => navigate("feedback")}>
            <span className="contact-icon">📝</span>
            <span>
              <b>{t("openTicket")}</b>
              <small>{t("openTicketNote")}</small>
            </span>
          </button>
          <button type="button" className="panel contact-card" onClick={() => navigate("guide")}>
            <span className="contact-icon">📖</span>
            <span>
              <b>{t("guide")}</b>
              <small>{t("guideNote")}</small>
            </span>
          </button>
        </aside>
      </div>
      <section className="panel faq-list">
        <h3>❓ {t("faqTitle")}</h3>
        {faq.map((f) => (
          <details key={f.id}>
            <summary dir="auto">{f.q[i]}</summary>
            <p dir="auto">{f.a[i]}</p>
          </details>
        ))}
      </section>
    </>
  );
}

// Floating buttons on every page: WhatsApp (one tap opens the chat) and the assistant.
export function FloatingHelp() {
  const [lang, setLang] = useState(document.documentElement.lang || "ar");
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const info = useSupportInfo();
  useEffect(() => {
    const obs = new MutationObserver(() => setLang(document.documentElement.lang || "ar"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNav);
    const timer = setInterval(onNav, 1000);
    return () => {
      obs.disconnect();
      window.removeEventListener("popstate", onNav);
      clearInterval(timer);
    };
  }, []);
  const t = (k) => translate(lang, k);
  // Not on the driver app, sign-in links and the support page itself (it has the full version).
  if (/^\/(driver|team-invite|reset-password|verify-email|t\/)/.test(path) || path === "/workspace/support")
    return null;
  const wa = info?.whatsapp ? waLink(info.whatsapp, t("waSupportHello")) : "";
  return (
    <div className="floating-help" dir={lang === "ar" ? "rtl" : "ltr"}>
      {open && (
        <div className="help-pop" role="dialog" aria-label={t("assistantTitle")}>
          <header>
            <b>🤖 {t("assistantTitle")}</b>
            <button
              type="button"
              className="text-button"
              aria-label={t("close")}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </header>
          <SupportChat t={t} lang={lang} compact />
        </div>
      )}
      <button
        type="button"
        className="fab fab-help"
        aria-label={t("assistantTitle")}
        title={t("assistantTitle")}
        onClick={() => setOpen(!open)}
      >
        {open ? "✕" : "?"}
      </button>
      {wa && (
        <a
          className="fab fab-wa"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("whatsappSupport")}
          title={t("whatsappSupport")}
        >
          <WaIcon />
        </a>
      )}
    </div>
  );
}
