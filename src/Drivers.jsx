import React, { useState } from "react";

// Driver and truck verification (carrier side, administration review and the shipment badge).

async function readFile(file) {
  if (!file?.size) return null;
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 2000000)
    return false;
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ content: r.result.split(",")[1], mime: file.type });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function DriverStatus({ d, t }) {
  return (
    <span className={`driver-status ${d.status}`}>
      {d.status === "verified" ? "✓ " : ""}
      {t("driverStatus_" + d.status)}
    </span>
  );
}

// Carrier: registered drivers with plate, licence and truck photo.
export function DriverRegistry({ data, t, run, busy }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const drivers = data.drivers || [];
  return (
    <section className="panel driver-registry">
      <h2>🚚 {t("driverRegistry")}</h2>
      <p className="muted small">{t("driverRegistryIntro")}</p>
      <form
        className="driver-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const form = e.currentTarget;
          const f = new FormData(form);
          const files = { license: await readFile(f.get("license")), truck: await readFile(f.get("truck")) };
          if (Object.values(files).some((x) => x === false)) return setError(t("invalidFile"));
          const body = Object.fromEntries(
            [...f.entries()].filter(([k]) => !["license", "truck"].includes(k)),
          );
          const r = await run("/drivers", body, "POST", { silent: true });
          if (!r?.driver) return;
          for (const kind of ["license", "truck"])
            if (files[kind])
              await run(`/drivers/${r.driver.id}/file`, { kind, ...files[kind] }, "POST", { silent: true });
          form.reset();
          setError("");
          setSaved(true);
        }}
      >
        <label className="field">
          <span>{t("driverName")}</span>
          <input name="name" required maxLength={120} />
        </label>
        <label className="field">
          <span>{t("phone")}</span>
          <input name="phone" type="tel" maxLength={30} dir="ltr" />
        </label>
        <label className="field">
          <span>{t("plateNumber")}</span>
          <input name="plate" required maxLength={20} dir="ltr" placeholder="27 ABC 123" />
        </label>
        <label className="field">
          <span>{t("truckType")}</span>
          <input name="truckType" maxLength={60} />
        </label>
        <label className="field">
          <span>{t("licenseNumber")}</span>
          <input name="licenseNo" maxLength={40} dir="ltr" />
        </label>
        <label className="field">
          <span>{t("licenseExpiry")}</span>
          <input name="licenseExpiry" type="date" />
        </label>
        <label className="field">
          <span>{t("licensePhoto")}</span>
          <input name="license" type="file" accept="image/jpeg,image/png,application/pdf" required />
        </label>
        <label className="field">
          <span>{t("truckPhoto")}</span>
          <input name="truck" type="file" accept="image/jpeg,image/png" required />
        </label>
        {error && <p className="form-error">{error}</p>}
        {saved && <p className="notice">✓ {t("driverAdded")}</p>}
        <button className="button" disabled={busy}>
          {t("addDriver")}
        </button>
      </form>
      {drivers.length > 0 && (
        <ul className="driver-list">
          {drivers.map((d) => (
            <li key={d.id}>
              <div>
                <b>{d.name}</b> <span dir="ltr">· {d.plate}</span>
                {d.truckType ? ` · ${d.truckType}` : ""}
                <br />
                <DriverStatus d={d} t={t} />
                {d.status === "rejected" && d.reason && <small className="muted"> — {d.reason}</small>}
                {d.files.length < 2 && <small className="muted"> · {t("driverFilesMissing")}</small>}
              </div>
              <button
                type="button"
                className="text-button danger-text"
                disabled={busy}
                onClick={() =>
                  window.confirm(t("deleteDriverConfirm")) && run(`/drivers/${d.id}`, {}, "DELETE")
                }
              >
                {t("delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Administration: drivers waiting for verification.
export function DriverReview({ data, t, run, busy }) {
  const list = (data.drivers || []).filter((d) => d.status === "pending" && d.files.length === 2);
  const name = (id) => data.users.find((u) => u.id === id)?.name || "—";
  return (
    <section className="panel driver-review">
      <h2>🚚 {t("driverReviewTitle")}</h2>
      {!list.length ? (
        <p className="muted">{t("noDriversToReview")}</p>
      ) : (
        <ul className="driver-list">
          {list.map((d) => (
            <li key={d.id}>
              <div>
                <b>{d.name}</b> <span dir="ltr">· {d.plate}</span> · {name(d.carrierId)}
                <br />
                <small className="muted">
                  {t("licenseNumber")}: <span dir="ltr">{d.licenseNo || "—"}</span> · {t("licenseExpiry")}:{" "}
                  {d.licenseExpiry || "—"}
                </small>
                <br />
                <a href={`/api/drivers/${d.id}/file/license`} target="_blank" rel="noopener">
                  {t("licensePhoto")} ↗
                </a>{" "}
                ·{" "}
                <a href={`/api/drivers/${d.id}/file/truck`} target="_blank" rel="noopener">
                  {t("truckPhoto")} ↗
                </a>
              </div>
              <span className="driver-actions">
                <button
                  className="button small-button"
                  disabled={busy}
                  onClick={() => run(`/admin/drivers/${d.id}/review`, { status: "verified" })}
                >
                  {t("verifyDriver")}
                </button>
                <button
                  className="button ghost small-button"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(t("rejectDriverPrompt"));
                    if (reason && reason.trim().length >= 3)
                      run(`/admin/drivers/${d.id}/review`, { status: "rejected", reason: reason.trim() });
                  }}
                >
                  {t("rejectDriver")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// On a shipment card: the driver (everyone on the shipment) and the carrier's driver choice.
export function ShipmentDriver({ s, data, user, t, run, busy }) {
  const mine = s.carrierId === user.id && ["assigned", "transit"].includes(s.status);
  if (!s.driverInfo && !mine) return null;
  return (
    <div className="shipment-driver">
      {s.driverInfo && (
        <span>
          🚚 {s.driverInfo.name} · <span dir="ltr">{s.driverInfo.plate}</span>
          {s.driverInfo.phone ? (
            <>
              {" "}
              · <span dir="ltr">{s.driverInfo.phone}</span>
            </>
          ) : null}{" "}
          {s.driverInfo.verified ? (
            <span className="driver-status verified">✓ {t("verifiedDriver")}</span>
          ) : (
            <span className="driver-status pending">{t("driverStatus_pending")}</span>
          )}
        </span>
      )}
      {mine && (data.drivers || []).length > 0 && (
        <select
          aria-label={t("chooseDriver")}
          value={s.driverId || ""}
          disabled={busy}
          onChange={(e) => run(`/shipments/${s.id}/driver`, { driverId: e.target.value })}
        >
          <option value="">{t("chooseDriver")}</option>
          {data.drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.plate} {d.status === "verified" ? "✓" : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
