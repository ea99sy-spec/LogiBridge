import { DriverRegistry } from "./Drivers";
import React, { useEffect, useState } from "react";
import { waLink } from "../shared/wa";
// Android driver app, rebuilt by GitHub Actions on every change in mobile/.
export const DRIVER_APP_URL =
  "https://github.com/ea99sy-spec/LogiBridge/releases/download/driver-app/logibridge-driver.apk";
import { GpsShare } from "./Gps";
import { TrackMap, TrackFacts, LiveShare, PhotoUpload, ProofForm, targetOf, legColors } from "./Tracking";
const request = async (path, body, method = "POST") => {
  const r = await fetch("/api" + path, {
    method: body === undefined ? "GET" : method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
};
export function DriverPortal({ t }) {
  const [task, setTask] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const token = window.location.hash.slice(1);
  async function load() {
    try {
      const r = await fetch("/driver-api/task", { headers: { Authorization: "Bearer " + token } });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setTask(d);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <main className="driver-portal">
      <a className="brand" href="/">
        LogiBridge
      </a>
      <h1>{t("driverPortal")}</h1>
      <p>{t("driverPrivacy")}</p>
      <p className="notice small">
        📱 {t("driverAppBanner")} <a href={DRIVER_APP_URL}>{t("downloadDriverApp")} ↓</a> ·{" "}
        <a href="/driver-app/" target="_blank" rel="noopener noreferrer">
          {t("tryDriverAppBrowser")} ↗
        </a>
      </p>
      {error && <p role="alert">{error}</p>}
      {task && (
        <div className="panel">
          <h2>{task.driverName}</h2>
          <h3>{task.shipment.title}</h3>
          <p>
            {task.shipment.origin} → {task.shipment.destination}
          </p>
          <b>{t(task.shipment.status)}</b>
          <p>{task.shipment.lastLocation}</p>
          <TrackMap
            segments={[
              {
                points: task.shipment.track,
                last: task.shipment.lastPosition,
                label: task.shipment.title,
                color: legColors[task.shipment.legType],
              },
            ]}
            crossing={task.shipment.crossing}
            target={targetOf(task.shipment)}
            t={t}
            height={240}
          />
          <TrackFacts sh={task.shipment} t={t} lang={document.documentElement.lang} />
          {["assigned", "transit", "arrived"].includes(task.shipment.status) && (
            <LiveShare
              t={t}
              storageKey={`lb_driver_${task.shipment.id}`}
              sendBatch={async (positions) => {
                const r = await fetch("/driver-api/positions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                  body: JSON.stringify({ positions }),
                });
                if (r.ok) load();
                return r.ok;
              }}
            />
          )}
          <GpsShare
            t={t}
            disabled={busy}
            send={async (position) => {
              const r = await fetch("/driver-api/update", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify(position),
              });
              if (r.ok) await load();
              return r.ok;
            }}
          />
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/driver-api/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                  body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
                });
                if (!r.ok) throw Error((await r.json()).error);
                await load();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              {t("location")}
              <input name="location" required maxLength="120" placeholder={t("manualLocation")} />
            </label>
            <label className="field">
              {t("noteOptional")}
              <textarea name="note" maxLength="500" />
            </label>
            <label className="field">
              {t("status")}
              <select name="action">
                <option value="">{t("locationOnly")}</option>
                {task.shipment.status === "assigned" && <option value="dispatch">{t("dispatch")}</option>}
                {task.shipment.status === "transit" && <option value="arrive">{t("arrive")}</option>}
              </select>
            </label>
            <button className="button" disabled={busy}>
              {t("saveUpdate")}
            </button>
          </form>
          <PhotoUpload
            t={t}
            send={async (body) => {
              const r = await fetch("/driver-api/photo", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify(body),
              });
              if (!r.ok) setError((await r.json()).error);
              else load();
              return r.ok;
            }}
          />
          {task.shipment.photos?.length > 0 && (
            <p className="muted small">
              {t("photosTaken")}: {task.shipment.photos.map((p) => t(p.kind)).join("، ")}
            </p>
          )}
          {["transit", "arrived"].includes(task.shipment.status) && !task.shipment.pod && (
            <ProofForm
              t={t}
              send={async (body) => {
                const r = await fetch("/driver-api/proof", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                  body: JSON.stringify(body),
                });
                if (!r.ok) setError((await r.json()).error);
                else load();
                return r.ok;
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
export function PriceEstimate({ t }) {
  const [estimate, setEstimate] = useState(null);
  useEffect(() => {
    const form = document.querySelector(".shipment-entry");
    if (!form) return;
    let timer,
      sequence = 0;
    const update = () => {
      const current = ++sequence;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const b = Object.fromEntries(new FormData(form));
        if (!b.origin || !b.destination || !(Number(b.weight) > 0)) {
          setEstimate(null);
          return;
        }
        try {
          const result = await request("/price-estimate", b);
          if (current === sequence) setEstimate(result);
        } catch {
          if (current === sequence) setEstimate(null);
        }
      }, 500);
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      ++sequence;
      clearTimeout(timer);
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);
  return (
    <div className="notice estimate">
      <b>{t("priceEstimate")}</b>
      <p>
        {estimate?.estimate != null
          ? `${estimate.estimate} USD · ${t("samples")}: ${estimate.samples} · ${t(estimate.confidence === "low" ? "lowConfidence" : "moderateConfidence")}`
          : t("noPriceData")}
      </p>
      <small>
        {t("estimateNote")}
        {estimate?.simulated ? " · " + t("demo") : ""}
      </small>
    </div>
  );
}
export function NotificationBell({ data, t, run, navigate }) {
  const [open, setOpen] = useState(false);
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <div className="notification-bell">
      <button className="text-button" aria-label={t("notifications")} onClick={() => setOpen(!open)}>
        🔔 {t("notifications")} {unread > 0 && <b>{unread}</b>}
      </button>
      {open && (
        <div className="notification-pop panel">
          <button
            className="text-button"
            onClick={() => run("/notifications/read", {}, "POST", { silent: true })}
          >
            {t("readAll")}
          </button>
          {[...data.notifications]
            .reverse()
            .slice(0, 30)
            .map((n) => (
              <button
                className="notification-item"
                key={n.id}
                onClick={() => {
                  run("/notifications/read", { id: n.id }, "POST", { silent: true });
                  if (n.event === "rate_prompt")
                    try {
                      localStorage.setItem("lb_rate", n.shipmentId);
                    } catch {}
                  const carrier = data.user.role === "carrier";
                  navigate(
                    n.event === "border_notice"
                      ? "border"
                      : n.event === "document_requested" || n.event === "document_uploaded"
                        ? "documents"
                        : n.event === "shipment_rejected" || n.event === "shipment_rejected_provider"
                          ? "shipments"
                          : n.event === "rate_prompt"
                            ? "ratings"
                            : ["route_alert", "admin_nudge"].includes(n.event)
                              ? "jobs"
                              : n.event === "recurring_invite"
                                ? "jobs"
                                : n.event.startsWith("recurring_")
                                  ? "recurring"
                                  : n.event === "monthly_report"
                                    ? "dashboard"
                                    : n.event.startsWith("return_trip_")
                                      ? "returnTrips"
                                      : n.event === "prohibited_attempt"
                                        ? "admin"
                                        : n.event === "feedback_new"
                                          ? "feedbackAdmin"
                                          : n.event === "feedback_replied"
                                            ? "feedback"
                                            : n.event === "company_joined"
                                              ? "directory"
                                              : n.event.startsWith("verification_") ||
                                                  n.event === "account_registered"
                                                ? "kyb"
                                                : n.event === "matching_opportunity" ||
                                                    (carrier && n.event === "cancel")
                                                  ? "jobs"
                                                  : n.event === "equipment_booking"
                                                    ? "calendar"
                                                    : n.event === "message_received"
                                                      ? "hub"
                                                      : n.event === "order_received"
                                                        ? "orders"
                                                        : n.event === "group_reserved"
                                                          ? "groups"
                                                          : n.event.startsWith("payment_") &&
                                                              data.user.role === "admin"
                                                            ? "admin"
                                                            : n.event.startsWith("settlement_") ||
                                                                [
                                                                  "dispute_escalated",
                                                                  "bid_received",
                                                                  "bid_withdrawn",
                                                                  "cancel",
                                                                  "crossing_busy",
                                                                ].includes(n.event)
                                                              ? "shipments"
                                                              : "tracking",
                  );
                  setOpen(false);
                }}
              >
                <b>{t("event_" + n.event)}</b>
                {n.detail && (
                  <small className="notice-detail">
                    {n.event.startsWith("verification_") || n.event.startsWith("payment_")
                      ? `${t("rejectionReason")}: `
                      : ""}
                    {n.detail}
                  </small>
                )}
                <small>{new Date(n.createdAt).toLocaleString(document.documentElement.lang)}</small>
                {!n.read && <span>●</span>}
              </button>
            ))}
          {!data.notifications.length && <p>{t("empty")}</p>}
        </div>
      )}
    </div>
  );
}
export function DriverManager({ data, t, run, busy }) {
  const [link, setLink] = useState(null);
  const jobs = data.shipments.filter(
    (s) => s.carrierId === data.user.id && ["assigned", "transit", "arrived"].includes(s.status),
  );
  return (
    <>
      <h1>{t("drivers")}</h1>
      <p>{t("driverPrivacy")}</p>
      <DriverRegistry data={data} t={t} run={run} busy={busy} />
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run("/driver-links", Object.fromEntries(new FormData(e.currentTarget)));
          if (r) setLink(r);
        }}
      >
        <label className="field">
          {t("driverName")}
          <input name="name" required maxLength="120" />
        </label>
        <label className="field">
          {t("selectShipment")}
          <select name="shipmentId">
            {jobs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <p>{t("driverExpiry")}</p>
        <button className="button" disabled={busy || !jobs.length}>
          {t("createDriverLink")}
        </button>
      </form>
      {link && (
        <div className="notice">
          <label>
            {t("driverLink")}
            <input readOnly value={window.location.origin + link.url} onFocus={(e) => e.target.select()} />
          </label>
          <p>
            {t("expires")}: {new Date(link.expiresAt).toLocaleString()}
          </p>
          <a
            className="button ghost small-button whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            href={waLink(
              "",
              `${t("driverLinkMessage")}\n${window.location.origin + link.url}\n\n${t("driverAppMessage")}\n${DRIVER_APP_URL}`,
            )}
          >
            {t("sendToDriverWhatsapp")}
          </a>
        </div>
      )}
      <p className="muted small">
        📱 {t("driverAppNote")} <a href={DRIVER_APP_URL}>{t("downloadDriverApp")} ↓</a> ·{" "}
        <a href="/driver-app/" target="_blank" rel="noopener noreferrer">
          {t("tryDriverAppBrowser")} ↗
        </a>
      </p>
      {data.driverLinks.map((l) => (
        <div className="list-row" key={l.id}>
          <b>{l.name}</b>
          <span>{new Date(l.expiresAt).toLocaleString()}</span>
          {l.revoked ? (
            t("revoked")
          ) : (
            <button className="button ghost" onClick={() => run("/driver-links/" + l.id, {}, "DELETE")}>
              {t("revoke")}
            </button>
          )}
        </div>
      ))}
    </>
  );
}
export function RentalCalendar({ data, t, run, busy, productId }) {
  const supplier = data.user.role === "supplier";
  const products = data.products.filter(
    (p) => p.type === "rental" && (!supplier || p.supplierId === data.user.id),
  );
  const [selected, setSelected] = useState(productId || products[0]?.id || ""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const records = data.equipmentBookings.filter((b) => b.productId === selected && b.status !== "cancelled");
  const [y, m] = month.split("-").map(Number),
    days = Array.from(
      { length: new Date(y, m, 0).getDate() },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    );
  return (
    <section className="panel">
      <h2>{t("calendar")}</h2>
      <p>{t("rentalNote")}</p>
      <div className="form-grid">
        <label className="field">
          {t("equipmentName")}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("calendarMonth")}
          <input
            type="month"
            required
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </label>
      </div>
      <div className="calendar-grid">
        {Array.from({ length: 7 }, (_, i) => (
          <b className="weekday" key={"weekday" + i}>
            {new Intl.DateTimeFormat(document.documentElement.lang, { weekday: "short" }).format(
              new Date(2026, 9, 4 + i),
            )}
          </b>
        ))}
        {Array.from({ length: new Date(y, m - 1, 1).getDay() }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {days.map((d) => {
          const booked = records.some((b) => b.start <= d && b.end >= d);
          return (
            <div key={d} className={booked ? "occupied" : "available"}>
              <b>{Number(d.slice(-2))}</b>
              <small>{t(booked ? "unavailable" : "available")}</small>
            </div>
          );
        })}
      </div>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          run(supplier ? "/equipment-blocks" : "/equipment-bookings", {
            productId: selected,
            ...Object.fromEntries(new FormData(e.currentTarget)),
          });
        }}
      >
        <label className="field">
          {t("rentalStart")}
          <input name="start" type="date" min={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label className="field">
          {t("rentalEnd")}
          <input name="end" type="date" min={new Date().toISOString().slice(0, 10)} required />
        </label>
        <button disabled={busy || !selected} className="button">
          {t(supplier ? "blockDates" : "bookEquipment")}
        </button>
      </form>
      {records
        .filter((b) => b.userId === data.user.id || supplier)
        .map((b) => (
          <div className="list-row" key={b.id}>
            <span>
              {b.start} → {b.end} · {b.total} USD
            </span>
            <button
              disabled={busy}
              onClick={() => run("/equipment-bookings/" + b.id, {}, "PATCH")}
              className="text-button"
            >
              {t("cancel")}
            </button>
          </div>
        ))}
    </section>
  );
}
export function DisputePanel({ s, data, t, run, busy }) {
  const participant = [s.ownerId, s.carrierId].includes(data.user.id),
    items = data.settlements.filter((x) => x.shipmentId === s.id);
  if (s.status !== "disputed" && !items.length) return null;
  if (data.escrows.find((e) => e.shipmentId === s.id)?.simulated === false)
    return (
      <section className="panel dispute-panel">
        <h3>{t("settlement")}</h3>
        <p>{t("bankPayoutNote")}</p>
        {participant && s.status === "disputed" && !s.disputeEscalated && (
          <button
            className="button ghost"
            disabled={busy}
            onClick={() => run("/shipments/" + s.id + "/escalate", {})}
          >
            {t("escalate")}
          </button>
        )}
      </section>
    );
  return (
    <section className="panel dispute-panel">
      <h3>{t("settlement")}</h3>
      <p>{t("settlementNote")}</p>
      {items.map((x) => (
        <div className="panel" key={x.id}>
          <b>
            {x.refundPercent}% {t("refundToMerchant")}
          </b>
          <p>{x.message}</p>
          <small>{t(x.status)}</small>
          {x.status === "pending" && participant && x.proposerId !== data.user.id && !s.disputeEscalated && (
            <div className="actions">
              <button
                className="button"
                disabled={busy}
                onClick={() => run("/settlements/" + x.id + "/respond", { decision: "accepted" })}
              >
                {t("acceptSettlement")}
              </button>
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => run("/settlements/" + x.id + "/respond", { decision: "rejected" })}
              >
                {t("reject")}
              </button>
            </div>
          )}
        </div>
      ))}
      {participant && s.status === "disputed" && !s.disputeEscalated && (
        <>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              run("/settlements", { shipmentId: s.id, ...Object.fromEntries(new FormData(e.currentTarget)) });
            }}
          >
            <label className="field">
              {t("refundPercent")}
              <input name="refundPercent" type="number" min="0" max="100" step="0.01" required />
            </label>
            <label className="field">
              {t("settlementMessage")}
              <textarea name="message" required maxLength="1000" />
            </label>
            <button className="button" disabled={busy}>
              {t("proposeSettlement")}
            </button>
          </form>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => run("/shipments/" + s.id + "/escalate", {})}
          >
            {t("escalate")}
          </button>
        </>
      )}
      {s.disputeEscalated && <p>{t("escalated")}</p>}
    </section>
  );
}
export function Reports({ t }) {
  const [month, setMonth] = useState(""),
    [kind, setKind] = useState("shipments");
  return (
    <>
      <h1>{t("reports")}</h1>
      <p>{t("reportNote")}</p>
      <div className="panel form-stack">
        <label className="field">
          {t("reportType")}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {["shipments", "invoices"].map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("month")}
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <div className="actions">
          <a className="button" href={"/api/reports?format=xlsx&kind=" + kind + "&month=" + month}>
            {t("exportExcel")}
          </a>
          <a
            className="button ghost"
            target="_blank"
            rel="noopener"
            href={"/api/reports?format=print&kind=" + kind + "&month=" + month}
          >
            {t("exportPdf")}
          </a>
        </div>
        <p>{t("pdfPrintNote")}</p>
      </div>
    </>
  );
}
export function Integrations({ data, t, run, busy }) {
  const [key, setKey] = useState(null);
  return (
    <>
      <h1>{t("integrations")}</h1>
      <p>{t("apiNote")}</p>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run("/integrations/keys", Object.fromEntries(new FormData(e.currentTarget)));
          if (r) setKey(r);
        }}
      >
        <label className="field">
          {t("integrationName")}
          <input name="name" required maxLength="100" />
        </label>
        <button className="button" disabled={busy}>
          {t("createApiKey")}
        </button>
      </form>
      {key && (
        <div className="notice">
          <p>{t("keyOnce")}</p>
          <input readOnly value={key.token} onFocus={(e) => e.target.select()} />
        </div>
      )}
      <pre dir="ltr">
        POST /api/v1/shipments{"\n"}Authorization: Bearer YOUR_KEY{"\n"}Idempotency-Key:
        YOUR_UNIQUE_REQUEST_ID{"\n"}Content-Type: application/json
      </pre>
      <pre dir="ltr">
        {JSON.stringify(
          {
            title: "ERP shipment",
            origin: "Gaziantep",
            destination: "Aleppo",
            originCountry: "TR",
            destinationCountry: "SY",
            category: "other",
            crossing: "bab",
            volume: 5,
            weight: 100,
            date: "2099-01-01",
            hsCode: "010121",
            insuranceRequested: false,
          },
          null,
          2,
        )}
      </pre>
      {data.apiKeys.map((k) => (
        <div className="list-row" key={k.id}>
          <b>{k.name}</b>
          <span>
            {t("expires")}: {new Date(k.expiresAt).toLocaleDateString()}
          </span>
          {k.revoked ? (
            t("revoked")
          ) : (
            <button className="text-button" onClick={() => run("/integrations/keys/" + k.id, {}, "DELETE")}>
              {t("revoke")}
            </button>
          )}
        </div>
      ))}
    </>
  );
}
