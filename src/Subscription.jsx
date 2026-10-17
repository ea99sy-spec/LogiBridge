import React, { useEffect, useState } from "react";

const date = (iso, lang) => (iso ? new Date(iso).toLocaleDateString(lang, { dateStyle: "medium" }) : "—");

// Free months counter and progress toward the 3 bonus months (dashboard and profile).
export function SubscriptionCard({ sub, t, lang, pricing, accountType }) {
  if (!sub || ["none", "pending"].includes(sub.status)) return null;
  const price = pricing?.prices?.[accountType];
  const pct = Math.round((sub.operations / sub.target) * 100);
  return (
    <section className={`panel subscription-card ${sub.status}`}>
      <div className="subscription-head">
        <h3>{t("subscriptionTitle")}</h3>
        <span className={`badge sub-${sub.status}`}>{t("sub_" + sub.status)}</span>
      </div>
      {sub.status === "expired" ? (
        <p>{t("subscriptionExpiredText")}</p>
      ) : (
        <p className="subscription-days">
          <b>{sub.daysLeft}</b> {t("daysLeft")} · {t("until")} {date(sub.endsAt, lang)}
        </p>
      )}
      {price > 0 && (
        <p className="muted small">
          {t("afterFreePeriod")} <bdi dir="ltr">${price}</bdi> / {t("perMonth")} · {t("noCommission")}
        </p>
      )}
      {sub.bonus ? (
        <p className="fact good">🎉 {t("bonusEarned")}</p>
      ) : sub.bonusOpen ? (
        <div className="bonus-progress">
          <div className="bonus-label">
            <span>{t("bonusProgress")}</span>
            <b>
              {sub.operations} / {sub.target}
            </b>
          </div>
          <div className="bar" role="progressbar" aria-valuenow={sub.operations} aria-valuemax={sub.target}>
            <i style={{ width: pct + "%" }} />
          </div>
          <small className="muted">
            {t("bonusHint")
              .replace("{n}", sub.target - sub.operations)
              .replace("{date}", date(sub.trialEnd, lang))}
          </small>
        </div>
      ) : null}
      <OnlinePayment t={t} />
    </section>
  );
}

// Pay the subscription online (PayTR), when the platform turned it on.
function OnlinePayment({ t }) {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    fetch("/api/subscription/online")
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, []);
  const result = new URLSearchParams(location.search).get("payment");
  if (!info?.enabled || !(info.prices?.[1] > 0)) return null;
  const pay = async (months) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          months,
          acceptSales: accepted,
          lang: document.documentElement.lang === "tr" ? "tr" : "en",
        }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error || "");
      setToken(v.token);
    } catch (e) {
      setError(
        t("err_" + e.message) !== "err_" + e.message ? t("err_" + e.message) : t("paymentUnavailable"),
      );
    }
    setBusy(false);
  };
  return (
    <div className="online-pay">
      {result === "ok" && <p className="notice">✓ {t("paymentReceivedNote")}</p>}
      {result === "failed" && <p className="notice error">{t("paymentFailedNote")}</p>}
      <b>💳 {t("payOnline")}</b>
      <label className="consent pay-consent">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          {t("acceptSalesPrefix")}{" "}
          <a href="/sales-terms" target="_blank" rel="noopener">
            {t("salesTerms")}
          </a>
        </span>
      </label>
      <div className="online-pay-options">
        <button
          type="button"
          className="button small-button"
          disabled={busy || !accepted}
          onClick={() => pay(1)}
        >
          {t("payOneMonth")} · <bdi dir="ltr">${info.prices[1]}</bdi>
        </button>
        <button
          type="button"
          className="button ghost small-button"
          disabled={busy || !accepted}
          onClick={() => pay(12)}
        >
          {t("payOneYear")} · <bdi dir="ltr">${info.prices[12]}</bdi>
        </button>
      </div>
      <small className="muted">{t("payOnlineNote")}</small>
      {error && <p className="form-error">{error}</p>}
      {token && (
        <div className="pay-modal" role="dialog" aria-modal="true" aria-label={t("payOnline")}>
          <div className="pay-modal-box">
            <button type="button" className="text-button pay-close" onClick={() => setToken("")}>
              ✕ {t("close")}
            </button>
            <iframe
              title="PayTR"
              src={`https://www.paytr.com/odeme/guvenli/${token}`}
              frameBorder="0"
              scrolling="yes"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Thin reminder at the top of the workspace in the last week and after the free period ends.
export function SubscriptionBanner({ sub, t, onOpen }) {
  if (!sub || !["trial", "paid", "expired"].includes(sub.status)) return null;
  if (sub.status !== "expired" && sub.daysLeft > 7) return null;
  return (
    <div className={`subscription-banner ${sub.status === "expired" ? "expired" : ""}`} role="status">
      {sub.status === "expired"
        ? t("subscriptionExpiredBanner")
        : t("subscriptionEndingBanner").replace("{n}", sub.daysLeft)}{" "}
      <button type="button" className="text-button" onClick={onOpen}>
        {t("details")}
      </button>
    </div>
  );
}

// Administrator: status per account and recording paid months.
export function SubscriptionAdminCell({ account, t, lang, run, busy }) {
  const sub = account.subscription;
  if (!sub || sub.status === "none") return null;
  return (
    <div className="sub-admin">
      <span className={`badge sub-${sub.status}`}>{t("sub_" + sub.status)}</span>
      {sub.status !== "pending" && (
        <small>
          {t("until")} {date(sub.endsAt, lang)} · {sub.operations}/{sub.target}
          {sub.bonus ? " ✓" : ""}
        </small>
      )}
      {!account.demo && sub.status !== "pending" && (
        <PaymentForm account={account} t={t} run={run} busy={busy} />
      )}
    </div>
  );
}

// Record a subscription payment: months and the amount received (empty = listed price).
function PaymentForm({ account, t, run, busy }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        className="button ghost small-button"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        + {t("addPaidMonths")}
      </button>
    );
  return (
    <form
      className="payment-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const amount = String(f.get("amount") || "").trim();
        await run(`/admin/accounts/${account.id}/subscription`, {
          months: Number(f.get("months")),
          ...(amount ? { amount: Number(amount) } : {}),
        });
        setOpen(false);
      }}
    >
      <label>
        <small>{t("paidMonths")}</small>
        <select name="months" defaultValue="1">
          {[1, 2, 3, 6, 12].map((m) => (
            <option key={m} value={m}>
              {m === 12 ? t("oneYearTenMonths") : m}
            </option>
          ))}
        </select>
      </label>
      <label>
        <small>{t("amountReceived")}</small>
        <input name="amount" type="number" min="0" step="0.01" dir="ltr" placeholder={t("amountAuto")} />
      </label>
      <button className="button small-button" disabled={busy}>
        {t("save")}
      </button>
      <button type="button" className="text-button" onClick={() => setOpen(false)}>
        {t("cancel")}
      </button>
    </form>
  );
}
