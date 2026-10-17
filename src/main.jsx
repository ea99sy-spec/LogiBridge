import { requiresApproval } from "../shared/access";
import BorderPage, { BorderRules } from "./BorderRules";
import { PublicTracking } from "./Tracking";
import { GuidePage, StartHereCard } from "./Guide";
import { AdminNotes, NotesDueCard } from "./AdminNotes";
import { FormHolidayWarning } from "./Holidays";
import { SubscriptionBanner } from "./Subscription";
import { waLink } from "../shared/wa";
import { PendingAccount, Profile, Directory, AccountSecurity, CompanyProfile } from "./Profiles";
import { ShipmentPayment } from "./Payments";
import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { translate, languages, documentKeys, documentLabels, errorText } from "./i18n";
import "./style.css";
import "./access.css";
import "./landing.css";
import AccountAccess, { ResetPassword, VerifyEmail } from "./AccountAccess";
import Legal, { LegalLinks, TermsUpdateDialog } from "./Legal";
import Landing from "./Landing";
import { QuickActions, ShipmentEntry, DocumentCenter, TrackingPanel, AdminPanel } from "./Operations";
import "./operations.css";
import RoleDashboard, { CarrierJobs, SupplierInventory, SupplierOrders } from "./RoleDashboard";
import { workspaceModules, accountKind } from "../shared/workspaces";
import "./roles.css";
import "./advanced.css";
import "./accent.css";
import ShipmentRoute from "./ShipmentRoute";
import { crossingKeys } from "../shared/crossings";
import {
  DriverPortal,
  NotificationBell,
  DriverManager,
  RentalCalendar,
  DisputePanel,
  Reports,
  Integrations,
} from "./Advanced";
import { VerificationPanel, ReviewQueue } from "./Verification";

async function api(path, body, method = "POST") {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? "GET" : method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("offline");
  }
  let data = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) throw new Error(data?.error || (response.status >= 500 ? "Unexpected server error" : ""));
  return data ?? {};
}
// Shared values for the workspace components below. Keeping these components at
// module level (instead of inside App) stops React from re-creating them on every
// refresh, which used to wipe whatever the user was typing into a form.
const Workspace = createContext(null);
const useWorkspace = () => useContext(Workspace);
const formData = (e) => Object.fromEntries(new FormData(e.currentTarget));
function Field({ label, name, type = "text", optional = false, ...props }) {
  const { t } = useWorkspace();
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input name={name} type={type} required={!optional} {...props} />
    </label>
  );
}
function Select({ label, name, options, ...props }) {
  const { t } = useWorkspace();
  return (
    <label className="field">
      <span>{t(label)}</span>
      <select name={name} required {...props}>
        {options.map((k) => (
          <option key={k} value={k}>
            {t(k)}
          </option>
        ))}
      </select>
    </label>
  );
}
// A Türkiye⇄Syria order: three stages, each with its own provider (rule of 6 Feb 2026).
// Opens WhatsApp with a short shipment summary; the user picks the contact.
function ShareWhatsapp({ s, t }) {
  const text = `LogiBridge · ${s.title}\n${s.origin} → ${s.destination}${s.crossing ? ` (${t(s.crossing)})` : ""}\n${t(s.status)}\n${location.origin}/workspace/tracking`;
  return (
    <a
      className="button ghost small-button whatsapp"
      href={waLink("", text)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t("shareWhatsapp")}
    </a>
  );
}
function OrderCard({ s, compact }) {
  const { data, user, t, run, busy, lang } = useWorkspace();
  const legs = data.shipments.filter((x) => x.parentId === s.id).sort((a, b) => a.legIndex - b.legIndex);
  const owner = user.id === s.ownerId;
  const cancellable =
    owner &&
    !["cancelled", "delivered"].includes(s.status) &&
    legs.every((l) => {
      const escrow = data.escrows.find((e) => e.shipmentId === l.id);
      return (
        ["open", "cancelled"].includes(l.status) ||
        (l.status === "assigned" &&
          ["awaiting_funding", "direct_pending"].includes(escrow?.status) &&
          !(data.payments || []).some((p) => p.shipmentId === l.id && p.status === "pending"))
      );
    });
  return (
    <article className="shipment-card order-card">
      <div className="card-top">
        <span className="tag">{t(s.category)}</span>
        <span className={`badge ${s.status}`}>{t(s.status)}</span>
      </div>
      <h3>{s.title}</h3>
      <div className="route">
        <span>
          <small>{t("origin")}</small>
          {s.origin}
        </span>
        <span className="route-line">● ── {t(s.crossing)} ── ◉</span>
        <span>
          <small>{t("destination")}</small>
          {s.destination}
        </span>
      </div>
      <div className="stage-track">
        {legs.map((l) => (
          <div key={l.id} className={`stage-step ${l.status}`}>
            <b>{l.legIndex + 1}</b>
            <span>{t("leg_" + l.legType)}</span>
            <small>{t(l.status)}</small>
          </div>
        ))}
      </div>
      {!compact && (
        <>
          <p className="notice small">{t("stagedOrderNote")}</p>
          {owner && <ShareWhatsapp s={s} t={t} />}
          <div className="order-legs">
            {legs.map((l) => (
              <ShipmentCard key={l.id} s={l} />
            ))}
          </div>
          {cancellable && (
            <button
              disabled={busy}
              className="button ghost danger"
              onClick={() =>
                window.confirm(t("cancelShipmentConfirm")) &&
                run(`/shipments/${s.id}/action`, { action: "cancel" })
              }
            >
              {t("cancelOrder")}
            </button>
          )}
          {s.status === "delivered" && (
            <div className="operation-complete">
              <b>✓ {t("operationComplete")}</b>
              <small>
                {t("completedOn")} {new Date(s.completedAt || Date.now()).toLocaleDateString(lang)}
              </small>
            </div>
          )}
        </>
      )}
    </article>
  );
}
function ShipmentCard({ s, compact = false }) {
  const { data, user, t, run, busy, money, num, lang, openProfile } = useWorkspace();
  if (s.isOrder) return <OrderCard s={s} compact={compact} />;
  const admin = user.role === "admin",
    merchant = user.role === "merchant",
    // Carriers and customs brokers are both "providers"; each bids on its own stage type.
    carrier = user.role === "carrier" || user.role === "broker",
    canBid = carrier && (s.legType === "clearance") === (user.role === "broker");
  const clearance = s.legType === "clearance";
  const name = (id) => data.users.find((u) => u.id === id)?.name || "—";
  const badge = (status) => <span className={`badge ${status}`}>{t(status)}</span>;
  const action = (a) => run(`/shipments/${s.id}/action`, { action: a });
  const bids = data.bids.filter((b) => b.shipmentId === s.id).sort((a, b) => a.price - b.price),
    escrow = data.escrows.find((e) => e.shipmentId === s.id),
    myBid = bids.find((b) => b.carrierId === user.id);
  const owner = merchant && s.ownerId === user.id;
  const canCancel =
    owner &&
    !s.parentId &&
    (s.status === "open" ||
      (s.status === "assigned" &&
        escrow?.status === "awaiting_funding" &&
        !(data.payments || []).some((p) => p.shipmentId === s.id && p.status === "pending")));
  return (
    <article className="shipment-card">
      <div className="card-top">
        <span className="tag">{t(s.category)}</span>
        {badge(s.status)}
      </div>
      <h3>{s.title}</h3>
      {s.parentId && (
        <p className="stage-label">
          <b>
            {t("stage")} {s.legIndex + 1}/3
          </b>{" "}
          · {t("leg_" + s.legType)}
          {s.crossing ? " · " + t(s.crossing) : ""}
        </p>
      )}
      <div className="route">
        <span>
          <small>{t("origin")}</small>
          {s.origin}
        </span>
        <span className="route-line">● ──── ◉</span>
        <span>
          <small>{t("destination")}</small>
          {s.destination}
        </span>
      </div>
      <div className="cargo-details">
        <span>{num(s.volume)} m³</span>
        <span>{num(s.weight)} kg</span>
        {s.insuranceRequested && <span>{t("insurancePending")}</span>}
        {s.hsCode && (
          <span>
            HS Code: <b dir="ltr">{s.hsCode}</b>
          </span>
        )}
        <span>{new Date(s.date + "T12:00:00").toLocaleDateString(lang)}</span>
      </div>
      {!compact && (
        <>
          <p className="muted small">
            {t(s.transportType || (!s.crossing ? "international" : "crossBorder"))}
            {s.crossing ? " / " + t(s.crossing) : ""} · {name(s.ownerId)}
          </p>
          {(s.ownerId === user.id || s.carrierId === user.id) && !s.parentId && <ShareWhatsapp s={s} t={t} />}
          {s.description && <p className="small">{s.description}</p>}
          <div className="offers">
            <h4>
              {t("offers")} <span className="counter">{bids.length}</span>
            </h4>
            {!bids.length && <p className="muted small">{t("noOffers")}</p>}
            {bids.map((b) => (
              <div className={`offer ${s.bidId === b.id ? "accepted-offer" : ""}`} key={b.id}>
                <div>
                  <b>
                    {b.carrierId === user.id ? (
                      t("yourOffer")
                    ) : (
                      <a
                        href={`/workspace/company?id=${encodeURIComponent(b.carrierId)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          openProfile?.(b.carrierId);
                        }}
                      >
                        {name(b.carrierId)}
                      </a>
                    )}
                  </b>
                  {data.users.find((u) => u.id === b.carrierId)?.verified && (
                    <span className="verified"> ✓</span>
                  )}
                  <small>
                    {num(b.days)} {t("days")}
                    {b.note ? " · " + b.note : ""}
                  </small>
                </div>
                <strong>{money(b.price)}</strong>
                {owner && s.status === "open" && (
                  <button
                    disabled={busy}
                    className="button small-button"
                    onClick={() =>
                      window.confirm(t("acceptBidConfirm")) &&
                      run(`/shipments/${s.id}/accept`, { bidId: b.id })
                    }
                  >
                    {t("accept")}
                  </button>
                )}
                {carrier && b.carrierId === user.id && s.status === "open" && (
                  <button
                    disabled={busy}
                    className="button ghost small-button"
                    onClick={() =>
                      window.confirm(t("withdrawBidConfirm")) && run(`/bids/${b.id}`, {}, "DELETE")
                    }
                  >
                    {t("withdrawBid")}
                  </button>
                )}
              </div>
            ))}
            {canBid && s.status === "open" && !myBid && (
              <form
                className="bid-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  if (await run("/bids", { ...formData(e), shipmentId: s.id })) form.reset();
                }}
              >
                <Field label="price" name="price" type="number" min="0.01" step="0.01" />
                <Field label="days" name="days" type="number" min="1" max="365" step="1" />
                <Field label="noteOptional" name="note" maxLength="500" optional />
                <button className="button" disabled={busy}>
                  {t("bid")}
                </button>
              </form>
            )}
          </div>
          {escrow && (
            <div className="escrow-line">
              <span>
                {t(escrow.simulated === false ? "bankPaymentLedger" : "escrow")} · {money(escrow.amount)}
              </span>
              {badge(
                escrow.simulated === false && escrow.status === "held" ? "bank_received" : escrow.status,
              )}
              <small>
                {t("noCommission")} · {t("carrierNet")}: {money(escrow.carrierNet || escrow.amount)}
              </small>
            </div>
          )}
          <div className="actions">
            {owner && escrow?.status === "awaiting_funding" && user.demo && (
              <button disabled={busy} className="button" onClick={() => action("fund")}>
                {t("fund")}
              </button>
            )}
            {owner && escrow?.status === "awaiting_funding" && (
              <div className="payment-options">
                <p className="small">
                  <b>{t("choosePayment")}</b>
                </p>
                {!user.demo && <ShipmentPayment s={s} data={data} t={t} run={run} busy={busy} />}
                {!(data.payments || []).some((p) => p.shipmentId === s.id && p.status === "pending") && (
                  <button
                    disabled={busy}
                    className="button ghost"
                    onClick={() => window.confirm(t("payDirectConfirm")) && action("pay_direct")}
                  >
                    {t("payDirect")}
                  </button>
                )}
                <p className="muted small">{t("paymentMethodsNote")}</p>
              </div>
            )}
            {owner && escrow?.status === "direct_pending" && (
              <p className="notice">{t("waitingCarrierPayment")}</p>
            )}
            {carrier && s.carrierId === user.id && escrow?.status === "direct_pending" && (
              <button
                disabled={busy}
                className="button"
                onClick={() => window.confirm(t("confirmPaymentConfirm")) && action("confirm_payment")}
              >
                {t("confirmPaymentReceived")}
              </button>
            )}{" "}
            {carrier &&
              s.carrierId === user.id &&
              s.status === "assigned" &&
              ["held", "direct_paid"].includes(escrow?.status) && (
                <button disabled={busy} className="button" onClick={() => action("dispatch")}>
                  {t(clearance ? "startClearance" : "dispatch")}
                </button>
              )}
            {carrier && s.carrierId === user.id && s.status === "transit" && (
              <button disabled={busy} className="button" onClick={() => action("arrive")}>
                {t(clearance ? "clearanceDone" : "arrive")}
              </button>
            )}
            {owner && s.status === "arrived" && (
              <button
                disabled={busy}
                className="button"
                onClick={() => window.confirm(t("confirmDeliveryConfirm")) && action("confirm")}
              >
                {t("confirm")}
              </button>
            )}
            {owner && escrow?.status === "held" && ["assigned", "transit", "arrived"].includes(s.status) && (
              <button disabled={busy} className="button ghost" onClick={() => action("dispute")}>
                {t("dispute")}
              </button>
            )}
            {admin && s.status === "disputed" && (
              <button disabled={busy} className="button" onClick={() => action("refund")}>
                {t("refund")}
              </button>
            )}
            {canCancel && (
              <button
                disabled={busy}
                className="button ghost danger"
                onClick={() => window.confirm(t("cancelShipmentConfirm")) && action("cancel")}
              >
                {t("cancelShipment")}
              </button>
            )}
          </div>
          {s.status === "delivered" && (
            <div className="operation-complete">
              <b>✓ {t("operationComplete")}</b>
              <small>
                {t("completedOn")} {new Date(s.completedAt || s.date + "T12:00:00").toLocaleDateString(lang)}
                {escrow?.paymentMethod === "direct" ? " · " + t("paidDirect") : ""}
              </small>
              {[s.ownerId, s.carrierId].includes(user.id) && (
                <a
                  className="button ghost small-button"
                  href={`/api/reports?format=print&kind=invoices&shipment=${encodeURIComponent(s.id)}`}
                  target="_blank"
                  rel="noopener"
                >
                  {t("operationSummary")} ↗
                </a>
              )}
            </div>
          )}
          <DisputePanel s={s} data={data} t={t} run={run} busy={busy} />
        </>
      )}
    </article>
  );
}
const icons = {
  profile: "◉",
  directory: "▦",
  drivers: "◉",
  calendar: "▦",
  reports: "▤",
  integrations: "API",
  dashboard: "◈",
  shipments: "▤",
  groups: "▦",
  customs: "✧",
  hub: "◌",
  kyb: "◇",
  border: "☷",
  tracking: "◎",
  ratings: "☆",
  marketplace: "▧",
  contracts: "▱",
  admin: "⚙",
  notes: "✎",
  fleet: "▣",
  documents: "⇧",
  newShipment: "＋",
  companies: "▦",
  jobs: "▤",
  guide: "?",
  inventory: "▧",
  orders: "▤",
  security: "⚿",
};
function App() {
  const [currency, setCurrency] = useState(localStorage.getItem("lb_currency") || "USD"),
    [fx, setFx] = useState({ rates: { USD: 1 }, dates: {} });
  const [lang, setLang] = useState(localStorage.getItem("lb_lang") || "ar"),
    [data, setData] = useState(null),
    [tab, setCurrentTab] = useState(
      window.location.pathname.startsWith("/workspace/")
        ? window.location.pathname.split("/")[2]
        : "dashboard",
    ),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null),
    [modal, setModal] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  // `id` is used by the company profile page: /workspace/company?id=...
  function setTab(next, id) {
    history.pushState(null, "", `/workspace/${next}${id ? "?id=" + encodeURIComponent(id) : ""}`);
    setCurrentTab(next);
    window.scrollTo({ top: 0 });
  }
  function enteredAccount(register, account) {
    const next =
      new URLSearchParams(window.location.search).get("next") ||
      (window.location.pathname.startsWith("/workspace/") ? window.location.pathname : "");
    setTab(register ? "kyb" : /^\/workspace\/[a-zA-Z]+$/.test(next) ? next.split("/")[2] : "dashboard");
  }

  useEffect(() => {
    const update = () => setCurrentTab(window.location.pathname.split("/")[2] || "dashboard");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const t = (k) => translate(lang, k),
    money = (v) =>
      new Intl.NumberFormat(lang, {
        style: "currency",
        currency: fx.rates[currency] ? currency : "USD",
        maximumFractionDigits: 2,
      }).format(v * (fx.rates[currency] || 1)),
    num = (v) => new Intl.NumberFormat(lang).format(v);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lb_lang", lang);
  }, [lang]);
  async function refresh() {
    try {
      setData(await api("/state"));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!data) return;
    let alive = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((r) => {
        if (alive) setFx(r);
      })
      .catch(() => {});
    const fxTimer = setInterval(
      () =>
        fetch("/api/fx")
          .then((r) => r.json())
          .then((r) => {
            if (alive) setFx(r);
          })
          .catch(() => {}),
      3600000,
    );
    const timer = setInterval(
      () =>
        fetch("/api/state")
          .then((r) => (r.ok ? r.json() : null))
          .then((s) => {
            if (alive) setData((previous) => (JSON.stringify(previous) === JSON.stringify(s) ? previous : s));
          })
          .catch(() => {}),
      5000,
    );
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(fxTimer);
    };
  }, [data?.user?.id]);
  useEffect(() => {
    if (!data || data.realtime === false) return;
    const events = new EventSource("/api/events");
    events.addEventListener("update", refresh);
    return () => events.close();
  }, [data?.user?.id]);
  useEffect(() => {
    localStorage.setItem("lb_currency", currency);
  }, [currency]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  // Runs an action against the server, refreshes the data and shows the outcome.
  // `options.silent` skips the success message (for small background actions).
  async function run(path, body, method = "POST", options = {}) {
    setBusy(true);
    try {
      const r = await api(path, body, method);
      if (path === "/logout") history.replaceState(null, "", "/");
      await refresh();
      if (!options.silent)
        setToast({
          ok: true,
          text: t(
            options.success ||
              (path === "/kyb"
                ? "applicationComplete"
                : /^\/shipments\/[^/]+\/submit$/.test(path)
                  ? "shipmentComplete"
                  : path === "/shipments"
                    ? "shipmentCreatedNext"
                    : path === "/logout"
                      ? "signedOut"
                      : "success"),
          ),
        });
      return r;
    } catch (e) {
      options.onError?.(e);
      // An ended session sends the visitor back to the sign-in page.
      if (e.message === "Sign in required" && path !== "/auth/login") await refresh();
      setToast({
        ok: false,
        text:
          e.message === "offline"
            ? t("offline")
            : e.message === "Equipment dates overlap"
              ? t("calendarConflict")
              : e.message === "Invalid rental dates"
                ? t("rentalDatesError")
                : e.message === "Account approval required"
                  ? t("approvalRestrictionNote")
                  : errorText(lang, e.message),
      });
      return null;
    } finally {
      setBusy(false);
    }
  }
  const langSelect = (
    <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className="language">
      {Object.entries(languages).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
  if (window.location.pathname === "/driver") return <DriverPortal t={t} />;
  if (window.location.pathname === "/border") return <BorderPage t={t} lang={lang} langSelect={langSelect} />;
  if (/^\/t\/[a-f0-9]{40}$/.test(window.location.pathname))
    return <PublicTracking t={t} lang={lang} langSelect={langSelect} />;
  if (["/terms", "/privacy"].includes(window.location.pathname))
    return <Legal page={window.location.pathname.slice(1)} t={t} lang={lang} langSelect={langSelect} />;
  if (window.location.pathname === "/verify-email")
    return <VerifyEmail t={t} langSelect={langSelect} run={run} />;
  if (window.location.pathname === "/reset-password")
    return <ResetPassword t={t} langSelect={langSelect} run={run} busy={busy} toast={toast} />;
  if (loading) return <div className="loading">{t("loading")}</div>;
  if (window.location.pathname === "/") return <Landing t={t} langSelect={langSelect} user={data?.user} />;
  // Signed-in visitors go straight to their own workspace instead of the sign-in pages.
  if (data?.user && /^\/(accounts|login)(\/|$)/.test(window.location.pathname)) {
    window.location.replace("/workspace/dashboard");
    return <div className="loading">{t("loading")}</div>;
  }
  if (
    !data ||
    window.location.pathname === "/accounts" ||
    /^\/(login|register)(\/|$)/.test(window.location.pathname)
  )
    return (
      <AccountAccess
        t={t}
        langSelect={langSelect}
        run={run}
        busy={busy}
        toast={toast}
        onEntered={enteredAccount}
        user={data?.user}
      />
    );
  const user = data.user,
    admin = user.role === "admin",
    merchant = user.role === "merchant",
    carrier = user.role === "carrier";
  const modules = workspaceModules(user, data.flags);
  const activeTab =
    modules.includes(tab) || (tab === "company" && modules.includes("directory")) ? tab : "dashboard";
  const ownShipments = data.shipments.filter(
    (s) => admin || s.ownerId === user.id || s.carrierId === user.id,
  );
  const name = (id) => data.users.find((u) => u.id === id)?.name || id;
  const heading = (key, desc) => (
    <div className="section-heading">
      <div>
        <h2>{t(key)}</h2>
        {desc && <p>{t(desc)}</p>}
      </div>
    </div>
  );
  const today = new Date().toISOString().slice(0, 10);
  const productName = (p) =>
    !p ? "—" : { p1: t("lashing"), p2: t("gps"), p3: t("container") }[p.id] || p.title;
  const eligibleRatings = ownShipments.filter(
    (s) =>
      s.status === "delivered" && !data.ratings.some((r) => r.shipmentId === s.id && r.userId === user.id),
  );
  const eligibleContracts = ownShipments.filter(
    (s) => s.status !== "open" && [s.ownerId, s.carrierId].includes(user.id),
  );
  const workspace = {
    data,
    user,
    t,
    run,
    busy,
    money,
    num,
    lang,
    openProfile: (id) => setTab("company", id),
  };
  return (
    <Workspace.Provider value={workspace}>
      <div className="app-shell">
        <aside className="sidebar">
          <a href="/" className="brand site-brand">
            <span className="brand-icon">⇄</span>LogiBridge
          </a>
          <p className="sidebar-tagline">{t("tagline")}</p>
          <div className="nav-label">WORKSPACE</div>
          <nav>
            {modules.map((k) => (
              <button
                className={activeTab === k ? "active" : ""}
                onClick={() => {
                  setTab(k);
                  window.scrollTo({ top: 0 });
                }}
                key={k}
              >
                <span className="nav-icon">{icons[k]}</span>
                {t(k === "kyb" && user.accountType === "individual" ? "passportVerification" : k)}
                {k === "shipments" && (
                  <span className="nav-count">
                    {data.shipments.filter((s) => s.status === "open").length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="connection-dot" /> {t("corridor")}
            <div className="account">
              <span className="avatar">
                {user.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <b>{user.name}</b>
                <small>
                  {t(user.role === "admin" ? "administrator" : user.accountType)} · {t(user.plan)}
                </small>
              </div>
            </div>
            <button
              className="switch"
              disabled={busy}
              onClick={async () => {
                await run("/logout", {});
                setCurrentTab("dashboard");
              }}
            >
              {t("logout")} ↗
            </button>
          </div>
        </aside>
        <main>
          <header className="topbar">
            <div className="breadcrumb">
              LogiBridge <span>/</span>{" "}
              <b>
                {t(
                  activeTab === "kyb" && user.accountType === "individual"
                    ? "passportVerification"
                    : activeTab === "company"
                      ? "companyPage"
                      : activeTab,
                )}
              </b>
            </div>
            <div className="header-tools">
              <NotificationBell data={data} t={t} run={run} navigate={setTab} />
              <label>
                <select
                  className="currency-select language"
                  aria-label={t("currencyDisplay")}
                  value={fx.rates[currency] ? currency : "USD"}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {["USD", "EUR", "TRY", "SYP"].map((c) => (
                    <option key={c} value={c} disabled={!fx.rates[c]}>
                      {c}
                    </option>
                  ))}
                </select>
                <small className="fx-date">
                  {fx.dates[currency] || "USD"}
                  {fx.stale ? " | " + t("fxStale") : ""}
                </small>
              </label>
              <a className="text-button home-link" href="/">
                {t("siteHome")}
              </a>
              {langSelect}
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  await run("/logout", {});
                  setCurrentTab("dashboard");
                }}
              >
                {t("logout")}
              </button>
              <span className={`verification ${user.verified ? "yes" : ""}`}>
                {user.verified ? "✓" : "◇"}{" "}
                {t(user.verified ? (user.demo ? "demoVerified" : "manualVerified") : "unverified")}
              </span>
            </div>
          </header>
          {user.demo && (
            <div className="demo-banner">
              <span>◉</span>
              {t("demoBanner")}
            </div>
          )}
          {user.disabled && <p className="notice">{t("err_Account disabled")}</p>}
          <SubscriptionBanner sub={data.subscription} t={t} onOpen={() => setTab("dashboard")} />
          {user.termsOutdated && <TermsUpdateDialog t={t} run={run} busy={busy} />}
          {!user.demo && user.emailVerified === false && (
            <div className={`notice email-verify ${data.emailVerificationRequired ? "blocking" : ""}`}>
              <span>{t(data.emailVerificationRequired ? "emailVerifyRequired" : "emailVerifyPending")}</span>
              <button
                className="button small-button"
                disabled={busy}
                onClick={() =>
                  run("/account/resend-verification", {}, "POST", { success: "verificationSent" })
                }
              >
                {t("resendVerification")}
              </button>
            </div>
          )}
          <div className="content">
            {activeTab === "dashboard" && data.approvalRequired && (
              <>
                <PendingAccount data={data} t={t} navigate={setTab} />
                <StartHereCard
                  kind={accountKind(user)}
                  t={t}
                  lang={lang}
                  navigate={setTab}
                  userId={user.id}
                />
              </>
            )}
            {activeTab === "guide" && (
              <GuidePage kind={accountKind(user)} t={t} lang={lang} navigate={setTab} modules={modules} />
            )}
            {activeTab === "profile" && <Profile data={data} t={t} run={run} busy={busy} navigate={setTab} />}
            {activeTab === "company" && (
              <CompanyProfile
                id={new URLSearchParams(window.location.search).get("id")}
                t={t}
                data={data}
                navigate={setTab}
                money={money}
              />
            )}
            {activeTab === "security" && <AccountSecurity data={data} t={t} run={run} busy={busy} />}
            {activeTab === "directory" && <Directory data={data} t={t} navigate={setTab} />}
            {activeTab === "dashboard" && !data.approvalRequired && (
              <>
                <StartHereCard
                  kind={accountKind(user)}
                  t={t}
                  lang={lang}
                  navigate={setTab}
                  userId={user.id}
                />
                {admin && !user.demo && <NotesDueCard t={t} lang={lang} navigate={setTab} />}
                <RoleDashboard
                  data={data}
                  t={t}
                  navigate={setTab}
                  money={money}
                  ShipmentCard={ShipmentCard}
                />
              </>
            )}
            {activeTab === "jobs" && (carrier || user.role === "broker") && (
              <CarrierJobs data={data} t={t} ShipmentCard={ShipmentCard} />
            )}
            {activeTab === "inventory" && user.role === "supplier" && (
              <SupplierInventory data={data} t={t} run={run} busy={busy} money={money} />
            )}
            {activeTab === "drivers" && <DriverManager data={data} t={t} run={run} busy={busy} />}
            {activeTab === "calendar" && <RentalCalendar data={data} t={t} run={run} busy={busy} />}
            {activeTab === "reports" && <Reports t={t} />}
            {activeTab === "integrations" && <Integrations data={data} t={t} run={run} busy={busy} />}
            {activeTab === "orders" && user.role === "supplier" && (
              <SupplierOrders data={data} t={t} run={run} busy={busy} money={money} />
            )}
            {activeTab === "shipments" && (
              <>
                <div className="section-heading">
                  <div>
                    <h1>{t("shipments")}</h1>
                    <p>{t("quickText")}</p>
                  </div>
                  {merchant && (
                    <button className="button" onClick={() => setTab("newShipment")}>
                      ＋ {t("newShipment")}
                    </button>
                  )}
                </div>
                <div className="filters">
                  <input
                    aria-label={t("search")}
                    placeholder={t("search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select aria-label={t("status")} value={filter} onChange={(e) => setFilter(e.target.value)}>
                    {[
                      "all",
                      "open",
                      "assigned",
                      "transit",
                      "arrived",
                      "delivered",
                      "disputed",
                      "cancelled",
                    ].map((k) => (
                      <option key={k} value={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shipment-list">
                  {data.shipments
                    .filter(
                      (s) =>
                        !(s.parentId && data.shipments.some((p) => p.id === s.parentId)) &&
                        (filter === "all" || s.status === filter) &&
                        `${s.title} ${s.origin} ${s.destination}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((s) => (
                      <ShipmentCard key={s.id} s={s} />
                    ))}
                  {!data.shipments.some(
                    (s) =>
                      (filter === "all" || s.status === filter) &&
                      `${s.title} ${s.origin} ${s.destination}`.toLowerCase().includes(search.toLowerCase()),
                  ) && <Empty t={t} />}
                </div>
              </>
            )}
            {activeTab === "fleet" && (
              <>
                {heading("fleet")}
                <div className="two-cols">
                  <form
                    className="panel form-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      if (await run("/fleets", formData(e))) form.reset();
                    }}
                  >
                    <Field label="fleetName" name="name" maxLength="80" />
                    <Field label="capacity" name="capacity" type="number" min="0.01" step="0.01" />
                    <button className="button" disabled={busy}>
                      {t("addFleet")}
                    </button>
                  </form>
                  <form
                    className="panel form-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      if (await run("/groups", formData(e))) form.reset();
                    }}
                  >
                    <h3>{t("newGroup")}</h3>
                    <ShipmentRoute t={t} />
                    <Field label="origin" name="origin" maxLength="80" />
                    <Field label="destination" name="destination" maxLength="80" />
                    <Field label="capacity" name="capacity" type="number" min="0.01" step="0.01" />
                    <Field label="pricePerM3" name="pricePerM3" type="number" min="0.01" step="0.01" />
                    <Field label="date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} />
                    <FormHolidayWarning t={t} lang={lang} />
                    <button className="button" disabled={busy}>
                      {t("publish")}
                    </button>
                  </form>
                </div>
                {(data.fleets || [])
                  .filter((f) => f.userId === user.id)
                  .map((f) => (
                    <div className="list-row" key={f.id}>
                      <b>{f.name}</b>
                      <span>{f.capacity} m³</span>
                    </div>
                  ))}
              </>
            )}
            {activeTab === "groups" && (
              <>
                {heading("groups", "groupsDesc")}
                <div className="cards">
                  {!data.groups.some((g) => (carrier ? g.carrierId === user.id : g.date >= today)) && (
                    <p className="muted">{t("noGroups")}</p>
                  )}
                  {data.groups
                    .filter((g) => (carrier ? g.carrierId === user.id : g.date >= today))
                    .map((g) => (
                      <article className="panel group-card" key={g.id}>
                        <span className="tag">
                          LCL · {new Date(g.date + "T12:00:00").toLocaleDateString(lang)}
                          {g.date < today ? " · " + t("departed") : ""}
                        </span>
                        <h3>
                          {g.origin} → {g.destination}
                        </h3>
                        <div className="capacity">
                          <strong>{num(g.capacity - g.booked)} m³</strong>
                          <span>
                            {t("available")} / {num(g.capacity)} m³
                          </span>
                        </div>
                        <progress value={g.booked} max={g.capacity} />
                        <p>
                          <b>{money(g.pricePerM3)}</b> {t("perM3")}
                        </p>
                        {merchant && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              if (await run(`/groups/${g.id}/reserve`, formData(e))) form.reset();
                            }}
                          >
                            <Field
                              label="volume"
                              name="volume"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={g.capacity - g.booked}
                            />
                            <button disabled={busy || g.booked >= g.capacity} className="button full">
                              {t("reserve")}
                            </button>
                          </form>
                        )}
                      </article>
                    ))}
                </div>
                <h3>{t("reservations")}</h3>
                {data.reservations.length ? (
                  data.reservations.map((r) => (
                    <div className="list-row" key={r.id}>
                      <span>
                        {data.groups.find((g) => g.id === r.groupId)?.origin} →{" "}
                        {data.groups.find((g) => g.id === r.groupId)?.destination}
                      </span>
                      <span>{num(r.volume)} m³</span>
                      <b>{money(r.price)}</b>
                    </div>
                  ))
                ) : (
                  <Empty t={t} />
                )}
              </>
            )}
            {activeTab === "customs" && (
              <Customs t={t} lang={lang} money={money} busy={busy} run={run} Field={Field} />
            )}
            {activeTab === "border" && (
              <>
                {heading("border")}
                <BorderRules
                  t={t}
                  lang={lang}
                  notices={data.borderNotices}
                  reports={data.crossingReports || []}
                  canReport={["carrier", "broker"].includes(user.role)}
                  admin={user.role === "admin" && !user.demo}
                  run={run}
                  busy={busy}
                />
                <h2>{t("borderChecklist")}</h2>
                <p className="notice">{t("customsNote")}</p>
                <Border data={data} t={t} run={run} />
              </>
            )}
            {activeTab === "hub" && (
              <>
                {heading("hub")}
                <Chat
                  data={{ ...data, users: data.users.filter((u) => !requiresApproval(u)) }}
                  t={t}
                  user={user}
                  run={run}
                  busy={busy}
                  name={name}
                  lang={lang}
                />
              </>
            )}
            {activeTab === "kyb" &&
              (admin ? (
                <ReviewQueue data={data} t={t} run={run} busy={busy} />
              ) : (
                <VerificationPanel data={data} user={user} t={t} run={run} busy={busy} />
              ))}
            {activeTab === "tracking" && (
              <TrackingPanel
                data={data}
                user={user}
                t={t}
                run={run}
                busy={busy}
                refresh={refresh}
                navigate={setTab}
                ShipmentCard={ShipmentCard}
              />
            )}
            {activeTab === "ratings" && (
              <>
                {heading("ratings")}
                <div className="two-cols">
                  <form
                    className="panel form-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      if (await run("/ratings", formData(e))) form.reset();
                    }}
                  >
                    <h3>{t("rateShipment")}</h3>
                    {eligibleRatings.length ? (
                      <>
                        <label className="field">
                          <span>{t("selectShipment")}</span>
                          <select name="shipmentId">
                            {eligibleRatings.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field label="score" name="score" type="number" min="1" max="5" />
                        <Field label="commentOptional" name="comment" maxLength="1000" optional />
                        <button disabled={busy} className="button">
                          {t("submit")}
                        </button>
                      </>
                    ) : (
                      <p>{t("emptyEligible")}</p>
                    )}
                  </form>
                  <div className="panel">
                    {data.ratings.length ? (
                      data.ratings.map((r) => (
                        <div className="rating-row" key={r.id}>
                          <b>{name(r.targetId)}</b>
                          <span className="stars">
                            {"★".repeat(r.score)}
                            {"☆".repeat(5 - r.score)}
                          </span>
                          <p>{r.comment}</p>
                          <small>{name(r.userId)}</small>
                        </div>
                      ))
                    ) : (
                      <Empty t={t} />
                    )}
                  </div>
                </div>
              </>
            )}
            {activeTab === "marketplace" && (
              <>
                <RentalCalendar data={data} t={t} run={run} busy={busy} />
                {heading("marketplace")}
                {user.role === "supplier" && (
                  <form
                    className="panel form-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      if (await run("/products", formData(e))) form.reset();
                    }}
                  >
                    <h3>{t("addProduct")}</h3>
                    <div className="form-grid">
                      <Field label="title" name="title" maxLength="80" />
                      <Field label="price" name="price" type="number" min="0.01" step="0.01" />
                      <Select label="listingType" name="type" options={["sale", "rental"]} />
                    </div>
                    <button className="button" disabled={busy}>
                      {t("publish")}
                    </button>
                  </form>
                )}
                <div className="cards">
                  {data.products.map((p) => (
                    <article className="panel product" key={p.id}>
                      <div className="product-art">{{ p1: "⛓", p2: "◎", p3: "▥" }[p.id] || "▧"}</div>
                      <span className="tag">{t(p.type)}</span>
                      <h3>{productName(p)}</h3>
                      <strong>{money(p.price)}</strong>
                      {p.type === "sale" && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            run("/orders", { productId: p.id, ...formData(e) });
                          }}
                        >
                          <Field
                            label="quantity"
                            name="quantity"
                            type="number"
                            min="1"
                            max="1000"
                            defaultValue="1"
                          />
                          <button disabled={busy} className="button full">
                            {t("order")}
                          </button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
                <h3>{t("orders")}</h3>
                {data.orders.length ? (
                  data.orders.map((o) => (
                    <div className="list-row" key={o.id}>
                      <span>{productName(data.products.find((p) => p.id === o.productId))}</span>
                      <span>× {o.quantity}</span>
                      <b>{money(o.total)}</b>
                    </div>
                  ))
                ) : (
                  <Empty t={t} />
                )}
              </>
            )}
            {activeTab === "contracts" && (
              <>
                {heading("contracts", "contractsDesc")}
                <p className="notice">{t("terms")}</p>
                {eligibleContracts.length ? (
                  eligibleContracts.map((s) => (
                    <article className="panel" key={s.id}>
                      <h3>{s.title}</h3>
                      {data.contracts.some((c) => c.shipmentId === s.id && c.userId === user.id) ? (
                        <p className="verified">✓ {t("acknowledged")}</p>
                      ) : (
                        <form
                          className="inline-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run("/contracts", { shipmentId: s.id, ...formData(e) });
                          }}
                        >
                          <Field label="signedName" name="name" />
                          <button className="button" disabled={busy}>
                            {t("acknowledge")}
                          </button>
                        </form>
                      )}
                    </article>
                  ))
                ) : (
                  <Empty t={t} />
                )}
              </>
            )}
            {activeTab === "notes" && <AdminNotes t={t} lang={lang} />}
            {["admin", "companies"].includes(activeTab) && (
              <AdminPanel
                data={data}
                t={t}
                run={run}
                busy={busy}
                navigate={setTab}
                accountsOnly={activeTab === "companies"}
              />
            )}
            {activeTab === "newShipment" && merchant && (
              <ShipmentEntry t={t} run={run} busy={busy} onCreated={() => setTab("documents")} />
            )}
            {activeTab === "documents" && (
              <DocumentCenter data={data} user={user} t={t} run={run} busy={busy} navigate={setTab} />
            )}
          </div>
          <footer>
            <LegalLinks t={t} />© 2026 LogiBridge <span>{t("tagline")} · AR / EN / TR</span>
          </footer>
        </main>
        {toast && (
          <div role="alert" className={`toast ${toast.ok ? "ok" : "bad"}`}>
            {toast.text}
          </div>
        )}
        {modal && (
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <section className="modal" role="dialog" aria-modal="true" aria-label={t("newShipment")}>
              <div className="section-heading">
                <h2>{t("newShipment")}</h2>
                <button className="close" aria-label={t("cancel")} onClick={() => setModal(false)}>
                  ×
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run("/shipments", formData(e))) setModal(false);
                }}
              >
                <div className="form-grid">
                  <Field label="title" name="title" maxLength="300" />
                  <Select
                    label="category"
                    name="category"
                    options={["textiles", "food", "machinery", "packaging", "other"]}
                  />
                  <Field label="origin" name="origin" maxLength="80" />
                  <Field label="destination" name="destination" maxLength="80" />
                  <Field label="volume" name="volume" type="number" step="0.01" min="0.01" />
                  <Field label="weight" name="weight" type="number" step="0.01" min="0.01" />
                  <Field
                    label="hsCode"
                    name="hsCode"
                    inputMode="numeric"
                    pattern="[0-9]{6,12}"
                    maxLength="12"
                  />
                  <Field label="date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} />
                  <FormHolidayWarning t={t} lang={lang} />
                  <ShipmentRoute t={t} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="button ghost" onClick={() => setModal(false)}>
                    {t("cancel")}
                  </button>
                  <button disabled={busy} className="button">
                    {t("publish")}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </Workspace.Provider>
  );
}
function Empty({ t }) {
  return (
    <div className="empty">
      <span>◇</span>
      <p>{t("empty")}</p>
    </div>
  );
}
function RouteArt() {
  return (
    <svg className="route-art" viewBox="0 0 460 240" aria-hidden="true">
      <defs>
        <linearGradient id="routeGlow">
          <stop stopColor="#8599b7" stopOpacity=".45" />
          <stop offset="1" stopColor="#8599b7" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <path
        d="M25 135L72 95 105 103 140 65 198 78 224 53 284 84 344 73 396 102 436 145 403 177 348 163 316 192 258 180 213 197 156 160 109 173 59 154Z"
        fill="url(#routeGlow)"
        stroke="#7f8fa8"
        strokeWidth="1"
      />
      <path
        d="M125 115 C190 66 230 185 334 132"
        fill="none"
        stroke="#779fdb"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      <circle cx="125" cy="115" r="17" fill="#7fa7e2" fillOpacity=".13" />
      <circle cx="125" cy="115" r="5" fill="#7fa7e2" />
      <circle cx="334" cy="132" r="17" fill="#7fa7e2" fillOpacity=".13" />
      <circle cx="334" cy="132" r="5" fill="#7fa7e2" />
      <text x="91" y="89" fill="#dfe4ec" fontSize="11">
        GAZIANTEP
      </text>
      <text x="309" y="170" fill="#dfe4ec" fontSize="11">
        ALEPPO
      </text>
      <g transform="translate(214 122) rotate(13)">
        <rect width="40" height="21" rx="3" fill="#dae4f3" />
        <rect x="40" y="7" width="16" height="14" rx="3" fill="#759fdf" />
        <circle cx="11" cy="24" r="5" fill="#102a56" />
        <circle cx="44" cy="24" r="5" fill="#102a56" />
      </g>
    </svg>
  );
}
function Border({ data, t, run }) {
  const [crossing, setCrossing] = useState("bab");
  const count = documentKeys.filter((k) => data.checklists[`${crossing}:${k}`]).length;
  return (
    <div className="panel border-panel">
      <label className="field">
        <span>{t("crossing")}</span>
        <select value={crossing} onChange={(e) => setCrossing(e.target.value)}>
          {crossingKeys.map((k) => (
            <option key={k} value={k}>
              {t(k)}
            </option>
          ))}
        </select>
      </label>
      <div className="capacity">
        <strong>{count} / 5</strong>
        <span>{t("docsReady")}</span>
      </div>
      <progress max="5" value={count} />
      {documentKeys.map((k) => (
        <label className="check-row" key={k}>
          <input
            type="checkbox"
            checked={!!data.checklists[`${crossing}:${k}`]}
            onChange={(e) => run("/checklist", { crossing, key: k, checked: e.target.checked })}
          />
          <span>{t(documentLabels[k])}</span>
        </label>
      ))}
    </div>
  );
}
function Customs({ t, lang, money, busy, run, Field }) {
  const [result, setResult] = useState(null),
    [value, setValue] = useState(""),
    [rate, setRate] = useState("");
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t("customs")}</h2>
          <p>{t("customsDesc")}</p>
        </div>
      </div>
      <div className="two-cols">
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const description = new FormData(e.currentTarget).get("description");
            setResult(await run("/customs", { description, language: lang }));
          }}
        >
          <label className="field">
            <span>{t("description")}</span>
            <textarea name="description" rows="6" maxLength="1000" required />
          </label>
          <button className="button" disabled={busy}>
            ✧ {t("ask")}
          </button>
        </form>
        <div className="panel">
          {result ? (
            <>
              <p className="notice">{t("customsNote")}</p>
              {result.mode === "demo" ? (
                <p>{t("customsDemo")}</p>
              ) : (
                <>
                  <p className="ai-answer">{result.answer}</p>
                  {result.hsCode && <p>HS: {result.hsCode}</p>}
                </>
              )}
              {(result.checklist || documentKeys)
                .filter((k) => documentKeys.includes(k))
                .map((k) => (
                  <p key={k}>◇ {t(documentLabels[k])}</p>
                ))}
            </>
          ) : (
            <Empty t={t} />
          )}
        </div>
      </div>
      <div className="panel">
        <h3>{t("estimated")}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{t("value")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("rate")}</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
        </div>
        <strong className="estimate">
          {money((Math.max(0, Number(value) || 0) * Math.min(100, Math.max(0, Number(rate) || 0))) / 100)}
        </strong>
        <p className="muted small">{t("customsNote")}</p>
      </div>
    </>
  );
}
function Chat({ data, t, user, run, busy, name, lang }) {
  const [recipient, setRecipient] = useState(() => {
      let wanted = null;
      try {
        wanted = localStorage.getItem("lb_chat_to");
        localStorage.removeItem("lb_chat_to");
      } catch {}
      return data.users.some((u) => u.id === wanted) ? wanted : data.users.find((u) => u.id !== user.id)?.id;
    }),
    [text, setText] = useState(""),
    [target, setTarget] = useState(lang);
  const messages = data.messages.filter((m) => [m.senderId, m.recipientId].includes(recipient));
  return (
    <div className="chat panel">
      <aside className="contacts">
        {data.users
          .filter((u) => u.id !== user.id)
          .map((u) => (
            <button
              className={recipient === u.id ? "selected" : ""}
              onClick={() => setRecipient(u.id)}
              key={u.id}
            >
              <span className="avatar">
                {u.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                {u.name}
                <small>{t(u.role === "admin" ? "administrator" : u.role)}</small>
              </span>
            </button>
          ))}
      </aside>
      <section className="chat-main">
        <h3>{name(recipient)}</h3>
        <div className="messages">
          {messages.length ? (
            messages.map((m) => (
              <div key={m.id} className={`message ${m.senderId === user.id ? "mine" : ""}`}>
                <p>{m.text}</p>
                {m.translationMode === "ai" ? (
                  <small>
                    {t("translated")}: {m.translated}
                  </small>
                ) : (
                  <small>{t("translationUnavailable")}</small>
                )}
                <time>
                  {new Date(m.createdAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))
          ) : (
            <Empty t={t} />
          )}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run("/messages", { recipientId: recipient, text, targetLanguage: target })) setText("");
          }}
        >
          <label className="field">
            <span>{t("targetLanguage")}</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {Object.entries(languages).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="compose">
            <input
              aria-label={t("message")}
              placeholder={t("message")}
              value={text}
              maxLength="2000"
              onChange={(e) => setText(e.target.value)}
              required
            />
            <button className="button" disabled={busy}>
              {t("send")} ↗
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
