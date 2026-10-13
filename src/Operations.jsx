import { SubscriptionAdminCell } from "./Subscription";
import {
  TrackMap,
  FleetMap,
  TrackFacts,
  PhotoStrip,
  PhotoUpload,
  ProofForm,
  LiveShare,
  OwnerTrackingTools,
  DeliveryPointForm,
  targetOf,
  legColors,
} from "./Tracking";
import { waLink } from "../shared/wa.js";
import { AdminEmailSettings, AdminSiteSettings, AccountDetails, TaxBadge } from "./Profiles";
import { officialTaxLink } from "../shared/tax";
import { GpsShare } from "./Gps";
import { AdminPayments, BankTransfers } from "./Payments";
import React, { useEffect, useState } from "react";
import { countryName } from "../shared/countries";
import CountrySelect from "./CountrySelect";
import ShipmentRoute from "./ShipmentRoute";
import { ReviewQueue } from "./Verification";
import { documentLabels } from "./i18n";
import { PriceEstimate } from "./Advanced";
async function fileBody(file) {
  if (
    !file?.size ||
    file.size > 2000000 ||
    !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
  )
    return null;
  const content = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return { content, filename: file.name, mime: file.type };
}
export function QuickActions({ user, t, navigate }) {
  const actions =
    user.role === "admin"
      ? [
          ["admin", "adminOverview", "◇"],
          ["companies", "registeredAccounts", "▦"],
          ["kyb", "identityApplications", "⇧"],
          ["tracking", "tracking", "◎"],
        ]
      : [
          ...(user.role === "merchant" ? [["newShipment", "enterShipment", "＋"]] : []),
          ["documents", "uploadDocuments", "⇧"],
          ["kyb", user.accountType === "individual" ? "passportVerification" : "businessVerification", "◇"],
          ["tracking", "trackMyShipments", "◎"],
        ];
  return (
    <div className="operation-shortcuts">
      {actions.map(([path, label, symbol]) => (
        <button key={path} onClick={() => navigate(path)}>
          <span>{symbol}</span>
          <b>{t(label)}</b>
          <i>↗</i>
        </button>
      ))}
    </div>
  );
}
export function ShipmentEntry({ t, run, busy, onCreated }) {
  const field = (label, name, props = {}) => (
    <label className="field">
      <span>{t(label)}</span>
      <input name={name} required {...props} />
    </label>
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("enterShipment")}</h1>
          <p>{t("shipmentEntryIntro")}</p>
        </div>
      </div>
      <form
        className="panel shipment-entry"
        onSubmit={async (e) => {
          e.preventDefault();
          const b = Object.fromEntries(new FormData(e.currentTarget));
          const result = await run("/shipments", b);
          if (result) onCreated(result);
        }}
      >
        <h3>01 · {t("cargoInformation")}</h3>
        <div className="form-grid">
          {field("title", "title", { maxLength: 300 })}
          <label className="field">
            <span>{t("category")}</span>
            <select name="category">
              {["textiles", "food", "machinery", "packaging", "other"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          {field("volume", "volume", { type: "number", min: 0.01, step: 0.01 })}
          {field("weight", "weight", { type: "number", min: 0.01, step: 0.01 })}
          {field("hsCode", "hsCode", {
            inputMode: "numeric",
            pattern: "[0-9]{6,12}",
            maxLength: 12,
            placeholder: "010121",
            title: t("hsCodeHint"),
          })}
          <label className="field full-field">
            <span>{t("cargoDescription")}</span>
            <textarea name="description" rows="3" maxLength="2000" required />
          </label>
        </div>
        <h3>02 · {t("routeAndDate")}</h3>
        <div className="form-grid">
          <ShipmentRoute t={t} />
          {field("origin", "origin", { maxLength: 80 })}
          {field("destination", "destination", { maxLength: 80 })}
          {field("date", "date", { type: "date", min: new Date().toISOString().slice(0, 10) })}
        </div>
        <PriceEstimate t={t} />
        <label className="insurance-choice">
          <input type="checkbox" name="insuranceRequested" /> {t("requestInsurance")}
        </label>
        <p className="muted small">{t("insuranceNote")}</p>
        <h3>03 · {t("contactInformation")}</h3>
        <div className="form-grid">
          {field("senderName", "senderName", { maxLength: 120 })}
          {field("recipientName", "recipientName", { maxLength: 120 })}
          {field("contactPhone", "phone", { type: "tel", maxLength: 40 })}
          {field("deliveryAddress", "destinationAddress", { maxLength: 300 })}
        </div>
        <p className="notice">{t("contactPrivateNote")}</p>
        <button className="button" disabled={busy}>
          ＋ {t("publish")}
        </button>
      </form>
    </>
  );
}
export function DocumentCenter({ data, user, t, run, busy, navigate }) {
  const [error, setError] = useState("");
  const shipments = data.shipments.filter((s) => [s.ownerId, s.carrierId].includes(user.id));
  async function submit(e) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const file = await fileBody(f.get("file"));
      if (!file) {
        setError(t("invalidFile"));
        return;
      }
      await run("/shipment-documents", { shipmentId: f.get("shipmentId"), kind: f.get("kind"), ...file });
    } catch {
      setError(t("error"));
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("uploadDocuments")}</h1>
          <p>{t("documentCenterIntro")}</p>
        </div>
        <button className="button ghost" onClick={() => navigate("kyb")}>
          {t(
            user.role === "admin"
              ? "identityApplications"
              : user.accountType === "individual"
                ? "passportUpload"
                : "registryUpload",
          )}{" "}
          ↗
        </button>
      </div>
      <div className="two-cols">
        {user.role !== "admin" && (
          <form className="panel form-stack" onSubmit={submit}>
            <h3>{t("shipmentDocuments")}</h3>
            {shipments.length ? (
              <>
                <label className="field">
                  <span>{t("selectShipment")}</span>
                  <select name="shipmentId" required>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} · {s.origin} → {s.destination}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("documentKind")}</span>
                  <select name="kind">
                    {["invoice", "packing", "origin", "transport", "customs", "other"].map((k) => (
                      <option key={k} value={k}>
                        {t(documentLabels[k] || k)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="document-drop">
                  <span className="upload-icon">⇧</span>
                  <b>{t("chooseDocument")}</b>
                  <small>PDF / PNG / JPEG · 2 MB</small>
                  <input type="file" name="file" accept="application/pdf,image/png,image/jpeg" required />
                </label>
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                <button className="button" disabled={busy}>
                  {t("uploadDocument")}
                </button>
              </>
            ) : (
              <>
                <p>{t("createShipmentBeforeUpload")}</p>
                {user.role === "merchant" && (
                  <button className="button" type="button" onClick={() => navigate("newShipment")}>
                    {t("enterShipment")}
                  </button>
                )}
              </>
            )}
          </form>
        )}
        <div className="panel">
          <h3>{t("completeShipmentRequest")}</h3>
          {shipments
            .filter(
              (sh) => sh.ownerId === user.id && data.shipmentDocuments.some((d) => d.shipmentId === sh.id),
            )
            .map((sh) => (
              <div className="saved-document" key={sh.id}>
                <b>{sh.title}</b>
                {sh.submittedAt ? (
                  <span className="badge approved">{t("requestComplete")}</span>
                ) : (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => run("/shipments/" + sh.id + "/submit", {})}
                  >
                    {t("finishRequest")}
                  </button>
                )}
              </div>
            ))}
          <p className="muted">{t("finishRequestNote")}</p>
          <h3>{t("savedDocuments")}</h3>
          {data.shipmentDocuments.length ? (
            data.shipmentDocuments.map((d) => (
              <div className="saved-document" key={d.id}>
                <div>
                  <b>{d.filename}</b>
                  <small>
                    {t(documentLabels[d.kind] || d.kind)} ·{" "}
                    {data.shipments.find((s) => s.id === d.shipmentId)?.title}
                  </small>
                </div>
                <a className="button ghost" href={`/api/shipment-documents/${d.id}`}>
                  {t("download")} ↗
                </a>
              </div>
            ))
          ) : (
            <p className="empty">{t("noUploadedDocuments")}</p>
          )}
        </div>
      </div>
    </>
  );
}
export function TrackingPanel({ data, user, t, run, busy, refresh, navigate, ShipmentCard }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  const own = data.shipments.filter(
    (s) => user.role === "admin" || [s.ownerId, s.carrierId].includes(user.id),
  );
  const matches = own.filter((s) =>
    `${s.title} ${s.id} ${s.origin} ${s.destination}`.toLowerCase().includes(query.toLowerCase()),
  );
  const shipment = own.find((s) => s.id === selected) || matches[0];
  const stages = ["open", "assigned", "transit", "arrived", "delivered"];
  // An order shows its three stages together: one coloured line per stage on the map.
  const legs = shipment?.isOrder
    ? data.shipments.filter((x) => x.parentId === shipment.id).sort((a, b) => a.legIndex - b.legIndex)
    : [];
  const parts = shipment ? (shipment.isOrder ? legs : [shipment]) : [];
  const ids = parts.map((p) => p.id).concat(shipment ? [shipment.id] : []);
  const events = shipment
    ? data.trackingEvents
        .filter((e) => ids.includes(e.shipmentId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];
  const moving =
    parts.find((p) => p.status === "transit") ||
    parts
      .filter((p) => p.lastPosition)
      .sort((a, b) => b.lastPosition.at.localeCompare(a.lastPosition.at))[0] ||
    shipment;
  const segments = parts.map((p) => ({
    points: p.track || [],
    last: p.lastPosition,
    color: legColors[p.legType] || "#2563eb",
    label: p.legType ? t("leg_" + p.legType) : p.title,
  }));
  const root = shipment?.parentId
    ? data.shipments.find((x) => x.id === shipment.parentId) || shipment
    : shipment;
  const isOwner = shipment && root?.ownerId === user.id;
  const isCarrier = shipment && user.id === shipment.carrierId;
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("tracking")}</h1>
          <p>{t("trackingManualIntro")}</p>
        </div>
        <button className="button ghost" onClick={refresh}>
          {t("refreshStatus")} ↻
        </button>
      </div>
      <p className="notice">{t("gpsIntro")}</p>
      {["carrier", "admin"].includes(user.role) && (
        <FleetMap shipments={own} t={t} onSelect={(id) => setSelected(id)} />
      )}
      <div className="filters">
        <input
          aria-label={t("trackingSearch")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected("");
          }}
          placeholder={t("trackingSearch")}
        />
      </div>
      {matches.length ? (
        <div className="tracking-layout">
          <aside className="panel tracking-picker">
            {matches.map((s) => (
              <button
                className={shipment?.id === s.id ? "selected" : ""}
                key={s.id}
                onClick={() => setSelected(s.id)}
              >
                <b>{s.title}</b>
                <small>
                  {s.origin} → {s.destination}
                </small>
                <span className={`badge ${s.status}`}>{t(s.status)}</span>
              </button>
            ))}
          </aside>
          <section>
            <div className="panel">
              <h3>{shipment.title}</h3>
              <p className="tracking-id">
                {t("shipmentReference")}: {shipment.id}
              </p>
              <div className="shipment-progress">
                {stages.map((k, i) => (
                  <div className={i <= stages.indexOf(shipment.status) ? "complete" : ""} key={k}>
                    <span>{i + 1}</span>
                    <b>{t(k)}</b>
                  </div>
                ))}
              </div>
              <p>
                <b>{t("lastKnownLocation")}:</b> {(moving || shipment).lastLocation || t("notReported")}
              </p>
              <TrackMap
                segments={segments}
                crossing={shipment.crossing}
                target={targetOf(moving || shipment)}
                t={t}
              />
              <TrackFacts sh={moving} t={t} lang={document.documentElement.lang} />
              <p className="muted small">{t("updatedByCarrier")}</p>
              <PhotoStrip
                docs={data.shipmentDocuments.filter((d) => ids.includes(d.shipmentId))}
                t={t}
                lang={document.documentElement.lang}
              />
              {isOwner && root && <OwnerTrackingTools sh={root} t={t} run={run} busy={busy} />}
              {(isOwner || isCarrier) &&
                !shipment.isOrder &&
                !["delivered", "cancelled"].includes(shipment.status) && (
                  <DeliveryPointForm sh={shipment} t={t} run={run} busy={busy} />
                )}
              {isOwner &&
                shipment.isOrder &&
                legs[2] &&
                !["delivered", "cancelled"].includes(legs[2].status) && (
                  <DeliveryPointForm sh={legs[2]} t={t} run={run} busy={busy} />
                )}
              {user.id === shipment.carrierId &&
                ["assigned", "transit", "arrived"].includes(shipment.status) && (
                  <form
                    className="form-stack tracking-update"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(
                        `/shipments/${shipment.id}/location`,
                        Object.fromEntries(new FormData(e.currentTarget)),
                      );
                    }}
                  >
                    <h3>{t("reportLocation")}</h3>
                    <GpsShare
                      t={t}
                      disabled={busy}
                      send={(position) =>
                        run(`/shipments/${shipment.id}/location`, position, "POST", { silent: true }).then(
                          Boolean,
                        )
                      }
                    />
                    <LiveShare
                      t={t}
                      storageKey={`lb_track_${shipment.id}`}
                      sendBatch={(positions) =>
                        run(`/shipments/${shipment.id}/positions`, { positions }, "POST", {
                          silent: true,
                        }).then(Boolean)
                      }
                    />
                    <label className="field">
                      <span>{t("currentLocation")}</span>
                      <input name="location" required maxLength="120" />
                    </label>
                    <label className="field">
                      <span>{t("noteOptional")}</span>
                      <textarea name="note" rows="2" maxLength="500" />
                    </label>
                    <button className="button" disabled={busy}>
                      {t("saveLocation")}
                    </button>
                  </form>
                )}
              {isCarrier && ["assigned", "transit", "arrived", "delivered"].includes(shipment.status) && (
                <PhotoUpload
                  t={t}
                  send={(body) =>
                    run(`/shipments/${shipment.id}/photos`, body, "POST", { silent: true }).then(Boolean)
                  }
                />
              )}
              {isCarrier && ["transit", "arrived"].includes(shipment.status) && !shipment.pod && (
                <ProofForm
                  t={t}
                  send={(body) => run(`/shipments/${shipment.id}/proof`, body, "POST").then(Boolean)}
                />
              )}
              <h3 className="events-title">{t("shipmentHistory")}</h3>
              <div className="tracking-history">
                {events.length ? (
                  events
                    .slice()
                    .reverse()
                    .map((e) => (
                      <article key={e.id}>
                        <span className="event-dot" />
                        <div>
                          <b>{t(e.event)}</b>
                          {e.location && (
                            <p>{e.event.startsWith("crossing_") ? t(e.location) : e.location}</p>
                          )}
                          {e.note && (
                            <p>
                              {e.event === "crossing_left"
                                ? t("timeAtCrossing").replace(
                                    "{h}",
                                    Math.round((Number(e.note) / 60) * 10) / 10,
                                  )
                                : e.note}
                            </p>
                          )}
                          <small>
                            {new Date(e.createdAt).toLocaleString(document.documentElement.lang)} ·{" "}
                            {t(
                              e.source === "demo"
                                ? "demoOnly"
                                : ["carrier_manual", "driver_manual"].includes(e.source)
                                  ? "carrierUpdate"
                                  : ["carrier_gps", "driver_gps"].includes(e.source)
                                    ? "gpsUpdate"
                                    : "platformUpdate",
                            )}
                          </small>
                        </div>
                      </article>
                    ))
                ) : (
                  <p className="muted">{t("noUpdates")}</p>
                )}
              </div>
            </div>
            <ShipmentCard s={shipment} />
          </section>
        </div>
      ) : (
        <div className="panel">
          <p>{t("noShipmentsToTrack")}</p>
          {user.role === "merchant" && (
            <button className="button" onClick={() => navigate("newShipment")}>
              {t("enterShipment")}
            </button>
          )}
        </div>
      )}
    </>
  );
}
export function AdminPanel({ data, t, run, busy, navigate, accountsOnly = false }) {
  const [accounts, setAccounts] = useState([]),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [reviewStatus, setReviewStatus] = useState("pending"),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    fetch("/api/admin/accounts/" + encodeURIComponent(selected))
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch(() => {
        if (active) setError(t("accountAccessRestricted"));
      });
    return () => {
      active = false;
    };
  }, [selected, data]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/accounts")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((value) => {
        if (active) setAccounts(value);
      })
      .catch(() => {
        if (active) setError(t("error"));
      });
    return () => {
      active = false;
    };
  }, [data]);
  const filtered = accounts.filter(
    (a) =>
      (kind === "all" ||
        (kind === "companies" && a.accountType !== "individual") ||
        (kind === "individuals" && a.accountType === "individual")) &&
      `${a.name} ${a.email || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pending = data.kyb.filter((d) => d.status === "pending").length;
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t(accountsOnly ? "registeredAccounts" : "adminOverview")}</h1>
          <p>{t("adminWorkspaceIntro")}</p>
        </div>
        <button className="button ghost" onClick={() => navigate(accountsOnly ? "admin" : "companies")}>
          {t(accountsOnly ? "adminOverview" : "registeredAccounts")} ↗
        </button>
      </div>
      {data.user.demo && <p className="notice">{t("demoAdminRestriction")}</p>}
      <div className="stats">
        {[
          ["registeredAccounts", accounts.length],
          ["pendingApplications", pending],
          ["verifiedAccounts", accounts.filter((a) => a.verified).length],
          [
            "activeShipments",
            data.shipments.filter((s) => !["delivered", "cancelled"].includes(s.status)).length,
          ],
        ].map(([k, value]) => (
          <article className="stat" key={k}>
            <small>{t(k)}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      {!accountsOnly && (
        <>
          <div className="section-heading">
            <h2>{t("identityApplications")}</h2>
            <select
              aria-label={t("status")}
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
            >
              {["pending", "approved", "rejected", "all"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </div>
          <ReviewQueue
            data={{
              ...data,
              kyb: data.kyb.filter((d) => reviewStatus === "all" || d.status === reviewStatus),
            }}
            t={t}
            run={run}
            busy={busy}
          />
        </>
      )}
      <div className="panel admin-directory">
        <h3>{t("registeredAccounts")}</h3>
        <div className="filters">
          <input
            placeholder={t("searchAccounts")}
            aria-label={t("searchAccounts")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={kind} aria-label={t("accountCategory")} onChange={(e) => setKind(e.target.value)}>
            {["all", "companies", "individuals"].map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "company",
                  "accountCategory",
                  "verificationInfo",
                  "plan",
                  "shipments",
                  "applications",
                  "accountDetails",
                ].map((k) => (
                  <th key={k}>{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    <small>{a.email || t(a.demo ? "demoOnly" : "emailPrivate")}</small>
                  </td>
                  <td>{t(a.accountType)}</td>
                  <td>
                    <span className={`badge ${a.verificationStatus}`}>
                      {t(a.verificationStatus || "not_submitted")}
                    </span>
                    {a.disabled && <span className="badge rejected">{t("suspended")}</span>}
                    {a.taxCheck && <TaxBadge check={a.taxCheck} t={t} />}
                    <SubscriptionAdminCell
                      account={a}
                      t={t}
                      lang={document.documentElement.lang}
                      run={async (path, body) => {
                        const ok = await run(path, body);
                        if (ok) setAccounts(await (await fetch("/api/admin/accounts")).json());
                        return ok;
                      }}
                      busy={busy}
                    />
                  </td>
                  <td>{t(a.plan)}</td>
                  <td>{a.shipmentCount}</td>
                  <td>{a.applicationCount}</td>
                  <td>
                    <button
                      className="button ghost small-button"
                      disabled={data.user.demo && !a.demo}
                      onClick={() => {
                        setError("");
                        setSelected(a.id);
                      }}
                    >
                      {t("accountDetails")} ↗
                    </button>
                    {!data.user.demo && !a.demo && a.verificationStatus !== "approved" && (
                      <button
                        className="button small-button"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(t("approveAccountConfirm")) &&
                          run(`/admin/accounts/${a.id}/review`, { status: "approved" })
                        }
                      >
                        ✓ {t("approveAccount")}
                      </button>
                    )}
                    {!data.user.demo && !a.demo && a.verificationStatus !== "rejected" && (
                      <button
                        className="button ghost small-button danger"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(t("rejectionReasonPrompt"));
                          if (!reason || !reason.trim()) return;
                          // Open WhatsApp now (inside the click) so pop-up blockers allow it.
                          const link = waLink(
                            a.details?.phone,
                            `${t("waRejectGreeting")} ${a.name},\n${t("waRejectBody")}\n${t("rejectionReason")}: ${reason.trim()}\n${location.origin}/workspace/kyb`,
                          );
                          const tab =
                            link && window.confirm(t("sendReasonWhatsappConfirm"))
                              ? window.open("", "_blank")
                              : null;
                          Promise.resolve(
                            run(`/admin/accounts/${a.id}/review`, { status: "rejected", reason }),
                          ).then((ok) => {
                            if (!tab) return;
                            if (!ok) tab.close();
                            else tab.location.href = link;
                          });
                        }}
                      >
                        ✕ {t("rejectAccount")}
                      </button>
                    )}
                    {a.verificationStatus === "rejected" && a.rejectionReason && waLink(a.details?.phone) && (
                      <a
                        className="button ghost small-button whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={waLink(
                          a.details.phone,
                          `${t("waRejectGreeting")} ${a.name},\n${t("waRejectBody")}\n${t("rejectionReason")}: ${a.rejectionReason}\n${location.origin}/workspace/kyb`,
                        )}
                      >
                        {t("sendReasonWhatsapp")}
                      </a>
                    )}
                    {!data.user.demo && !a.demo && (
                      <button
                        className={`button ghost small-button ${a.disabled ? "" : "danger"}`}
                        disabled={busy}
                        onClick={() =>
                          (a.disabled || window.confirm(t("suspendConfirm"))) &&
                          run(`/admin/accounts/${a.id}/status`, { disabled: !a.disabled })
                        }
                      >
                        {t(a.disabled ? "restoreAccount" : "suspendAccount")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p className="empty">{t("empty")}</p>}
      </div>
      {selected && (
        <section className="panel account-detail" aria-live="polite">
          <div className="section-heading">
            <h2>{t("accountDetails")}</h2>
            <button className="button ghost" onClick={() => setSelected("")}>
              {t("close")}
            </button>
          </div>
          {detail ? (
            <>
              <h3>{detail.account.name}</h3>
              <AccountDetails account={detail.account} t={t} />
              {!data.user.demo && detail.account.taxId && (
                <p className="actions">
                  <button
                    className="button ghost small-button"
                    disabled={busy}
                    onClick={async () => {
                      await run(`/admin/accounts/${detail.account.id}/tax-check`, {});
                      setSelected("");
                      setTimeout(() => setSelected(detail.account.id), 0);
                    }}
                  >
                    {t("recheckTax")}
                  </button>
                  {officialTaxLink(detail.account.details?.country) && (
                    <a
                      className="button ghost small-button"
                      href={officialTaxLink(detail.account.details?.country)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => navigator.clipboard?.writeText(detail.account.taxId).catch?.(() => {})}
                    >
                      {t("officialTaxCheck")} ↗
                    </a>
                  )}
                </p>
              )}
              {detail.account.profile?.about && (
                <>
                  <h4>{t("aboutUs")}</h4>
                  <p className="profile-text">{detail.account.profile.about}</p>
                  <h4>{t("ourServices")}</h4>
                  <p className="profile-text">{detail.account.profile.services}</p>
                </>
              )}
              <p>
                {t("email")}: <b dir="ltr">{detail.account.email}</b>
              </p>
              <p>
                {t("accountCategory")}: {t(detail.account.accountType)}
              </p>
              {detail.account.accountType !== "individual" && (
                <p>
                  {t("taxId")}:{" "}
                  <b dir="ltr">
                    {detail.account.taxId || detail.applications.at(-1)?.taxId || t("not_submitted")}
                  </b>
                </p>
              )}
              <span className={`badge ${detail.account.verificationStatus}`}>
                {t(detail.account.verificationStatus)}
              </span>
              {!detail.applications.length && <p className="notice">{t("documentsRequiredForApproval")}</p>}
              <ReviewQueue data={{ ...data, kyb: detail.applications }} t={t} run={run} busy={busy} />
              <h3>
                {t("shipments")} · {detail.shipments.length}
              </h3>
              {detail.shipments.map((sh) => (
                <p key={sh.id}>
                  {sh.title} · {sh.origin} → {sh.destination} · {t(sh.status)}
                </p>
              ))}
            </>
          ) : (
            <p>{t("loading")}</p>
          )}
        </section>
      )}
      {!accountsOnly && (
        <>
          <AdminSiteSettings data={data} t={t} run={run} busy={busy} />
          <AdminEmailSettings data={data} t={t} run={run} busy={busy} />
          <AdminPayments data={data} t={t} run={run} busy={busy} />
          <BankTransfers data={data} t={t} run={run} busy={busy} />
        </>
      )}
      {!accountsOnly && (
        <div className="panel">
          <h3>{t("featureFlags")}</h3>
          {Object.keys(data.flags).map((k) => (
            <label className="toggle-row" key={k}>
              <span>{t(k)}</span>
              <input
                type="checkbox"
                role="switch"
                disabled={busy}
                checked={data.flags[k]}
                onChange={(e) => run("/flags", { [k]: e.target.checked }, "PATCH")}
              />
            </label>
          ))}
        </div>
      )}
    </>
  );
}
