import React, { useState } from "react";
import CountrySelect from "./CountrySelect";
import { countryName, officialRegistries } from "../shared/countries";
export function VerificationPanel({ data, user, t, run, busy }) {
  const person = user.accountType === "individual",
    docs = data.kyb.filter((d) => d.userId === user.id),
    pending = docs.some((d) => d.status === "pending");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget),
      file = form.get("file");
    if (
      !file?.size ||
      file.size > 2000000 ||
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
    ) {
      setError(t("invalidFile"));
      return;
    }
    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await run("/kyb", {
        ...Object.fromEntries([...form].filter(([k]) => k !== "file")),
        filename: file.name,
        mime: file.type,
        content,
      });
    } catch {
      setError(t("error"));
    }
  }
  const field = (label, name, props = {}) => (
    <label className="field">
      <span>{t(label)}</span>
      <input name={name} required {...props} />
    </label>
  );
  const steps = ["verificationInfo", "verificationUpload", "verificationReview"];
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t(person ? "passportVerification" : "businessVerification")}</h1>
          <p>{t(person ? "passportDescription" : "businessDescription")}</p>
          <p className="notice">{t("reviewEmailNote")}</p>
        </div>
        <span className={`badge ${user.verificationStatus}`}>
          {t(user.verificationStatus || "not_submitted")}
        </span>
      </div>
      <div className="verification-steps">
        {steps.map((k, i) => (
          <div className={user.verified || (pending && i < 2) ? "complete" : ""} key={k}>
            <span>{i + 1}</span>
            <b>{t(k)}</b>
          </div>
        ))}
      </div>
      <div className="two-cols">
        <form className="panel form-stack verification-form" onSubmit={submit}>
          <h3>{t(person ? "passportDetails" : "companyDetails")}</h3>
          {person ? (
            <>
              {field("fullName", "fullName", { defaultValue: user.name, maxLength: 120 })}
              {field("passportNumber", "passportNumber", { maxLength: 40 })}
              {field("passportExpiry", "expiry", {
                type: "date",
                min: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
              })}
            </>
          ) : (
            <>
              {field("company", "company", { defaultValue: user.name, maxLength: 300 })}
              {field("taxId", "taxId", {
                defaultValue: user.taxId || "",
                maxLength: 40,
                minLength: 3,
                pattern: "[A-Za-z0-9][A-Za-z0-9 ./-]{2,39}",
                dir: "ltr",
              })}
              {field("registration", "registration", { maxLength: 80 })}
              {field("registryAuthority", "registry", { maxLength: 120 })}
            </>
          )}
          <CountrySelect t={t} label={person ? "passportCountry" : "companyCountry"} disabled={pending} />
          <label className="document-drop">
            <span className="upload-icon">⇧</span>
            <b>{t(person ? "passportUpload" : "registryUpload")}</b>
            <small>PDF / PNG / JPEG · 2 MB</small>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required
              disabled={pending}
            />
          </label>
          <label className="consent">
            <input type="checkbox" required disabled={pending} />
            <span>{t("documentConsent")}</span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy || pending}>
            {t(pending ? "pending" : "submit")} ↗
          </button>
        </form>
        <div className="verification-summary">
          <div className="panel verification-status">
            <span className="identity-seal">{person ? "◉" : "◇"}</span>
            <h3>{t(user.verified ? "manualVerified" : "reviewBeforeBadge")}</h3>
            <p>{t("manualVerificationNote")}</p>
            <div className="verification-requirement">
              ◇ {t(person ? "passportValidityRequirement" : "registryReviewRequirement")}
            </div>
            <div className="verification-requirement">◇ {t("documentReviewRequirement")}</div>
            <div className="verification-requirement">◇ {t("reviewAuditRequirement")}</div>
            {user.demo && <p className="notice">{t("testDocumentsOnly")}</p>}
          </div>
          <div className="panel">
            <h3>{t("applications")}</h3>
            {docs.length ? (
              docs
                .slice()
                .reverse()
                .map((d) => (
                  <div className="verification-application" key={d.id}>
                    <div>
                      <b>{d.fullName || d.company}</b>
                      <small>{d.filename}</small>
                    </div>
                    <span className={`badge ${d.status}`}>{t(d.status)}</span>
                    {d.review?.reason && (
                      <p>
                        {t("reason")}: {d.review.reason}
                      </p>
                    )}
                    {d.review?.reference && (
                      <p>
                        {t("reviewReference")}: {d.review.reference}
                      </p>
                    )}
                  </div>
                ))
            ) : (
              <p className="muted">{t("not_submitted")}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
export function ReviewQueue({ data, t, run, busy }) {
  return (
    <div className="panel">
      <h3>{t("identityApplications")}</h3>
      {!data.kyb.length && <p className="muted">{t("empty")}</p>}
      {data.kyb
        .slice()
        .reverse()
        .map((doc) => (
          <ReviewCard doc={doc} t={t} run={run} busy={busy} key={doc.id} />
        ))}
    </div>
  );
}
function ReviewCard({ doc, t, run, busy }) {
  const [decision, setDecision] = useState("approved");
  const person = doc.kind === "person";
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(`/kyb/${doc.id}/review`, {
      status: decision,
      reference: f.get("reference"),
      reason: f.get("reason"),
      documentMatches: f.has("documentMatches"),
      registryMatches: f.has("registryMatches"),
      businessActive: f.has("businessActive"),
      passportMatches: f.has("passportMatches"),
    });
  }
  const check = (name, label) => (
    <label className="consent">
      <input name={name} type="checkbox" required={decision === "approved"} />
      <span>{t(label)}</span>
    </label>
  );
  return (
    <article className="identity-review">
      <div className="review-heading">
        <div>
          <span className="tag">{t(person ? "individual" : "company")}</span>
          <h3>{doc.fullName || doc.company}</h3>
          <small>
            {person
              ? `•••• ${doc.passportLast4} · ${doc.expiry}`
              : `${doc.registration} · ${doc.registry || ""}`}{" "}
            · {countryName(doc.country, document.documentElement.lang)}
          </small>
        </div>
        <span className={`badge ${doc.status}`}>{t(doc.status)}</span>
      </div>
      {!person && doc.taxId && (
        <p>
          {t("taxId")}: <b dir="ltr">{doc.taxId}</b>
        </p>
      )}
      <a className="button ghost document-download" href={`/api/kyb/${doc.id}/document`}>
        {t("download")} ↗
      </a>
      {!person && (
        <div className="registry-links">
          {officialRegistries[doc.country] ? (
            <a href={officialRegistries[doc.country].url} target="_blank" rel="noopener noreferrer">
              {t("officialAuthority")} · {officialRegistries[doc.country].name} ↗
            </a>
          ) : (
            <p>{t("internationalRegistryReview")}</p>
          )}
          <small>{t("registryLinkNote")}</small>
        </div>
      )}
      {doc.status === "pending" ? (
        <form className="form-stack review-form" onSubmit={submit}>
          <label className="field">
            <span>{t("reviewDecision")}</span>
            <select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="approved">{t("approve")}</option>
              <option value="rejected">{t("reject")}</option>
            </select>
          </label>
          {decision === "approved" && (
            <>
              {check("documentMatches", "documentMatchCheck")}
              {person ? (
                check("passportMatches", "passportMatchCheck")
              ) : (
                <>
                  {check("registryMatches", "registryMatchCheck")}
                  {check("businessActive", "activeCompanyCheck")}
                  <label className="field">
                    <span>{t("reviewReference")}</span>
                    <input
                      name="reference"
                      required
                      maxLength="500"
                      placeholder={t("referencePlaceholder")}
                    />
                  </label>
                </>
              )}
            </>
          )}
          <label className="field">
            <span>{t("reason")}</span>
            <textarea name="reason" required={decision === "rejected"} maxLength="500" rows="2" />
          </label>
          <p className="muted small">{t("reviewResponsibility")}</p>
          <button className="button" disabled={busy}>
            {t("saveReview")}
          </button>
        </form>
      ) : (
        <div className="review-audit">
          <p>{t("manualVerificationNote")}</p>
          {doc.review?.reference && (
            <p>
              {t("reviewReference")}: {doc.review.reference}
            </p>
          )}
          {doc.review?.reason && (
            <p>
              {t("reason")}: {doc.review.reason}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
