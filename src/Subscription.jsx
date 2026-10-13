import React from "react";

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
        <button
          className="button ghost small-button"
          disabled={busy}
          onClick={() => {
            const months = Number(window.prompt(t("paidMonthsPrompt"), "1"));
            if (Number.isInteger(months) && months > 0)
              run(`/admin/accounts/${account.id}/subscription`, { months });
          }}
        >
          + {t("addPaidMonths")}
        </button>
      )}
    </div>
  );
}
