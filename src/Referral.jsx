import React, { useState } from "react";

// Dashboard card: invite companies with a personal link; each approved company adds a free month.
export function ReferralCard({ referral, t }) {
  const [copied, setCopied] = useState(false);
  if (!referral) return null;
  const link = `${location.origin}/register?ref=${referral.code}`;
  const share = encodeURIComponent(`${t("referralShareText")}\n${link}`);
  return (
    <section className="panel referral-card">
      <div>
        <h3>🎁 {t("referralTitle")}</h3>
        <p className="muted small">{t("referralIntro").replace("{max}", referral.max)}</p>
      </div>
      <div className="referral-link">
        <input
          readOnly
          value={link}
          dir="ltr"
          onFocus={(e) => e.target.select()}
          aria-label={t("referralLink")}
        />
        <button
          type="button"
          className="button small-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
        >
          {copied ? "✓ " + t("copied") : t("copyLink")}
        </button>
        <a
          className="button ghost small-button whatsapp"
          href={`https://wa.me/?text=${share}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("shareWhatsapp")}
        </a>
      </div>
      <div className="referral-stats">
        <span>
          <b>{referral.invited}</b> {t("referralInvited")}
        </span>
        <span>
          <b>{referral.joined}</b> {t("referralJoined")}
        </span>
        <span>
          <b>{referral.months}</b> {t("referralMonths")}
        </span>
      </div>
    </section>
  );
}
