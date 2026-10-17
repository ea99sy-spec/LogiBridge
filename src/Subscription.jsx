import React, { useState } from "react";

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
    </section>
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
