import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { crossings } from "../shared/crossings";
import { ZONE_KM, estimateArrival, distanceKm } from "../shared/geo";
import { currentPosition } from "./Gps";
import { waLink } from "../shared/wa";

const legColors = { origin_leg: "#2563eb", clearance: "#c27c0e", destination_leg: "#12805c" };
const fmtTime = (iso, lang) =>
  new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
const hours = (ms) => Math.round((ms / 3600000) * 10) / 10;

// Route map: one coloured line per stage, the latest truck position, the crossing zone and the delivery point.
export function TrackMap({ segments = [], crossing, target, t, height = 320 }) {
  const box = useRef(null),
    map = useRef(null);
  useEffect(() => {
    if (!box.current) return;
    if (!map.current) {
      map.current = L.map(box.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map.current);
    }
    const m = map.current;
    const layer = L.layerGroup().addTo(m);
    const bounds = [];
    for (const seg of segments) {
      const pts = (seg.points || []).map((p) => [p.lat, p.lng]);
      if (pts.length > 1)
        L.polyline(pts, { color: seg.color || "#2563eb", weight: 4, opacity: 0.85 }).addTo(layer);
      if (seg.last) {
        L.circleMarker([seg.last.lat, seg.last.lng], {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: seg.color || "#2563eb",
          fillOpacity: 1,
        })
          .bindTooltip(`🚚 ${seg.label || ""}`)
          .addTo(layer);
        bounds.push([seg.last.lat, seg.last.lng]);
      }
      bounds.push(...pts);
    }
    const c = crossings[crossing];
    if (c?.lat) {
      L.circle([c.lat, c.lng], { radius: ZONE_KM * 1000, color: "#c27c0e", weight: 1, fillOpacity: 0.08 })
        .bindTooltip(t(crossing))
        .addTo(layer);
      bounds.push([c.lat, c.lng]);
    }
    if (target?.lat) {
      L.circleMarker([target.lat, target.lng], {
        radius: 7,
        color: "#12805c",
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .bindTooltip(t("deliveryPoint"))
        .addTo(layer);
      bounds.push([target.lat, target.lng]);
    }
    if (bounds.length === 1) m.setView(bounds[0], 11);
    else if (bounds.length) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    else m.setView([36.6, 37.2], 7);
    setTimeout(() => m.invalidateSize(), 50);
    return () => layer.remove();
  }, [JSON.stringify(segments), crossing, target?.lat, target?.lng]);
  useEffect(() => () => map.current?.remove(), []);
  return <div ref={box} className="track-map" style={{ height }} role="img" aria-label={t("gpsMap")} />;
}

// Every truck currently on the road (carrier and administrator).
export function FleetMap({ shipments, t, onSelect }) {
  const box = useRef(null),
    map = useRef(null);
  const moving = shipments.filter(
    (s) => s.lastPosition && ["assigned", "transit", "arrived"].includes(s.status),
  );
  useEffect(() => {
    if (!box.current || !moving.length) return;
    if (!map.current) {
      map.current = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map.current);
    }
    const layer = L.layerGroup().addTo(map.current);
    for (const k of Object.keys(crossings))
      L.circle([crossings[k].lat, crossings[k].lng], {
        radius: ZONE_KM * 1000,
        color: "#c27c0e",
        weight: 1,
        fillOpacity: 0.06,
      })
        .bindTooltip(t(k))
        .addTo(layer);
    const pts = moving.map((s) => {
      const stale = Date.now() - Date.parse(s.lastPosition.at) > 6 * 3600000;
      L.circleMarker([s.lastPosition.lat, s.lastPosition.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: stale ? "#a23d22" : legColors[s.legType] || "#2563eb",
        fillOpacity: 1,
      })
        .bindTooltip(`${s.title} · ${t(s.status)}`)
        .on("click", () => onSelect?.(s.id))
        .addTo(layer);
      return [s.lastPosition.lat, s.lastPosition.lng];
    });
    if (pts.length === 1) map.current.setView(pts[0], 10);
    else map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 12 });
    setTimeout(() => map.current?.invalidateSize(), 50);
    return () => layer.remove();
  }, [JSON.stringify(moving.map((s) => [s.id, s.lastPosition.at]))]);
  useEffect(() => () => map.current?.remove(), []);
  if (!moving.length) return null;
  return (
    <section className="panel">
      <h3>
        {t("fleetMap")} <span className="counter">{moving.length}</span>
      </h3>
      <div ref={box} className="track-map" style={{ height: 300 }} />
      <p className="muted small">{t("fleetMapNote")}</p>
    </section>
  );
}

// Where the truck is heading next: the crossing for the first stage, otherwise the delivery point.
export function targetOf(sh) {
  if (sh.legType === "origin_leg" && crossings[sh.crossing]) return crossings[sh.crossing];
  return sh.destinationPoint || null;
}

// Live facts under the map: arrival estimate, time at crossing, silence and stop alerts.
export function TrackFacts({ sh, t, lang }) {
  if (!sh) return null;
  const facts = [];
  const pos = sh.lastPosition;
  if (pos) {
    const age = Date.now() - Date.parse(pos.at);
    facts.push(
      <span key="age" className={age > 6 * 3600000 ? "fact bad" : "fact"}>
        📍 {t("lastSignal")}: {fmtTime(pos.at, lang)}
        {age > 6 * 3600000 ? ` · ${t("signalLost")}` : ""}
      </span>,
    );
  }
  const target = targetOf(sh);
  if (
    pos &&
    target &&
    ["assigned", "transit"].includes(sh.status) &&
    !(sh.crossingArrivedAt && !sh.crossingLeftAt && sh.legType === "origin_leg")
  ) {
    const eta = estimateArrival(pos, target, sh.track);
    if (eta)
      facts.push(
        <span key="eta" className="fact">
          ⏱ {t(sh.legType === "origin_leg" ? "etaCrossing" : "etaDelivery")}: ~{eta.km} km ·{" "}
          {fmtTime(eta.at, lang)}
        </span>,
      );
  }
  if (sh.crossingArrivedAt && !sh.crossingLeftAt)
    facts.push(
      <span key="at" className="fact warn">
        ⏳ {t("atCrossingFor").replace("{h}", hours(Date.now() - Date.parse(sh.crossingArrivedAt)))}
      </span>,
    );
  if (sh.crossingLeftAt)
    facts.push(
      <span key="left" className="fact">
        ✓{" "}
        {t("timeAtCrossing").replace(
          "{h}",
          hours(Date.parse(sh.crossingLeftAt) - Date.parse(sh.crossingArrivedAt)),
        )}
      </span>,
    );
  if (sh.pod)
    facts.push(
      <span key="pod" className="fact good">
        ✍ {t("deliveredTo")} {sh.pod.recipient} · {fmtTime(sh.pod.at, lang)}
        {sh.pod.codeVerified ? ` · ${t("codeVerified")}` : ""}
      </span>,
    );
  return facts.length ? <div className="track-facts">{facts}</div> : null;
}

// Photos taken along the way (owner, carrier and administrator can open them).
export function PhotoStrip({ docs, t, lang }) {
  const photos = docs.filter((d) => d.kind?.startsWith("photo_"));
  if (!photos.length) return null;
  return (
    <div className="photo-strip">
      {photos.map((d) => (
        <a key={d.id} href={`/api/shipment-documents/${d.id}`} target="_blank" rel="noopener noreferrer">
          <img src={`/api/shipment-documents/${d.id}`} alt={t(d.kind)} loading="lazy" />
          <small>
            {t(d.kind)} · {fmtTime(d.createdAt, lang)}
          </small>
        </a>
      ))}
    </div>
  );
}

// Shrinks a camera photo in the browser so it uploads quickly over weak border networks.
async function shrink(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("invalidFile"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.75, 0.6, 0.45, 0.3]) {
      const data = canvas.toDataURL("image/jpeg", q).split(",")[1];
      if (data.length * 0.75 < 330000) return data;
    }
    throw new Error("photoTooLarge");
  } finally {
    URL.revokeObjectURL(url);
  }
}
const quickPosition = () =>
  Promise.race([currentPosition().catch(() => null), new Promise((r) => setTimeout(() => r(null), 6000))]);

export function PhotoUpload({ t, send }) {
  const [state, setState] = useState("");
  return (
    <form
      className="form-stack photo-upload"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const file = f.get("photo");
        if (!file?.size) return;
        setState("photoSending");
        try {
          const content = await shrink(file);
          const position = await quickPosition();
          const ok = await send({ stage: f.get("stage"), mime: "image/jpeg", content, ...(position || {}) });
          setState(ok ? "photoSaved" : "error");
          if (ok) e.target.reset();
        } catch (err) {
          setState(err.message === "photoTooLarge" ? "photoTooLarge" : "invalidFile");
        }
      }}
    >
      <h3>📷 {t("addPhoto")}</h3>
      <div className="two-cols">
        <label className="field">
          <span>{t("photoStage")}</span>
          <select name="stage">
            {["loading", "sealed", "crossing", "delivery"].map((k) => (
              <option key={k} value={k}>
                {t("photo_" + k)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("photo")}</span>
          <input name="photo" type="file" accept="image/*" capture="environment" required />
        </label>
      </div>
      <button className="button">{t("sendPhoto")}</button>
      {state && <small role="status">{t(state)}</small>}
    </form>
  );
}

// Receiver's name, signature and the owner's delivery code.
export function ProofForm({ t, send }) {
  const pad = useRef(null),
    drawing = useRef(false),
    [signed, setSigned] = useState(false),
    [state, setState] = useState("");
  useEffect(() => {
    const c = pad.current,
      ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#102a56";
  }, []);
  const point = (e) => {
    const r = pad.current.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * pad.current.width) / r.width,
      ((e.clientY - r.top) * pad.current.height) / r.height,
    ];
  };
  const clear = () => {
    const ctx = pad.current.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, pad.current.width, pad.current.height);
    setSigned(false);
  };
  return (
    <form
      className="form-stack proof-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!signed) return setState("signatureRequired");
        const f = new FormData(e.currentTarget);
        setState("photoSending");
        const position = await quickPosition();
        const ok = await send({
          recipient: f.get("recipient"),
          code: f.get("code"),
          mime: "image/png",
          content: pad.current.toDataURL("image/png").split(",")[1],
          ...(position || {}),
        });
        setState(ok ? "proofSaved" : "");
      }}
    >
      <h3>✍ {t("deliveryProof")}</h3>
      <p className="muted small">{t("deliveryProofNote")}</p>
      <div className="two-cols">
        <label className="field">
          <span>{t("recipientName")}</span>
          <input name="recipient" required maxLength="120" autoComplete="off" />
        </label>
        <label className="field">
          <span>{t("deliveryCodeOptional")}</span>
          <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" dir="ltr" />
        </label>
      </div>
      <span className="field-label">{t("recipientSignature")}</span>
      <canvas
        ref={pad}
        width="600"
        height="200"
        className="signature-pad"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = pad.current.getContext("2d");
          ctx.beginPath();
          ctx.moveTo(...point(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = pad.current.getContext("2d");
          ctx.lineTo(...point(e));
          ctx.stroke();
          setSigned(true);
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="actions">
        <button type="button" className="button ghost" onClick={clear}>
          {t("clearSignature")}
        </button>
        <button className="button">{t("saveProof")}</button>
      </div>
      {state && <small role="status">{t(state)}</small>}
    </form>
  );
}

// Continuous sharing that survives weak signal: points are kept on the phone and sent when back online.
export function LiveShare({ t, storageKey, sendBatch, disabled }) {
  const [live, setLive] = useState(false),
    [queued, setQueued] = useState(0),
    [state, setState] = useState("");
  const timer = useRef(null),
    lock = useRef(null);
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  };
  const write = (list) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list.slice(-500)));
    } catch {}
    setQueued(list.length);
  };
  async function flush() {
    const list = read();
    if (!list.length || !navigator.onLine) return;
    for (let i = 0; i < list.length; i += 200) {
      const ok = await sendBatch(list.slice(i, i + 200)).catch(() => false);
      if (!ok) return write(list.slice(i));
    }
    write([]);
    setState("gpsShared");
  }
  async function tick() {
    try {
      const p = await currentPosition();
      write([...read(), { ...p, at: new Date().toISOString() }]);
      await flush();
    } catch (e) {
      setState(e.message);
    }
  }
  useEffect(() => {
    setQueued(read().length);
    const online = () => flush();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  useEffect(() => {
    if (!live) return;
    tick();
    timer.current = setInterval(tick, 60000);
    // Keep the screen on so the phone does not stop GPS (supported by most phone browsers).
    navigator.wakeLock
      ?.request("screen")
      .then((l) => (lock.current = l))
      .catch(() => {});
    return () => {
      clearInterval(timer.current);
      lock.current?.release().catch(() => {});
    };
  }, [live]);
  return (
    <div className="gps-share live-share">
      <label className="consent">
        <input
          type="checkbox"
          checked={live}
          disabled={disabled}
          onChange={(e) => setLive(e.target.checked)}
        />
        <span>
          <b>{t("liveTracking")}</b>
          <br />
          <small>{t("liveTrackingNote")}</small>
        </span>
      </label>
      {queued > 0 && (
        <small className="fact warn">
          {t("pointsWaiting").replace("{n}", queued)} ·{" "}
          <button type="button" className="text-button" onClick={flush}>
            {t("sendNow")}
          </button>
        </small>
      )}
      {state && <small role="status">{t(state)}</small>}
    </div>
  );
}

// Owner tools: receiver link, delivery code and delivery point.
export function OwnerTrackingTools({ sh, t, run, busy }) {
  const link = sh.publicToken ? `${location.origin}/t/${sh.publicToken}` : "";
  return (
    <div className="owner-tools">
      {sh.deliveryCode && (
        <p className="delivery-code">
          {t("deliveryCode")}: <b dir="ltr">{sh.deliveryCode}</b>
          <small className="muted"> · {t("deliveryCodeNote")}</small>
        </p>
      )}
      <div className="share-link">
        <b>{t("receiverLink")}</b>
        {link ? (
          <>
            <input readOnly value={link} dir="ltr" onFocus={(e) => e.target.select()} />
            <div className="actions">
              <button
                type="button"
                className="button ghost small-button"
                onClick={() => navigator.clipboard?.writeText(link)}
              >
                {t("copyLink")}
              </button>
              <a
                className="button ghost small-button whatsapp"
                href={waLink("", `${t("receiverLinkMessage")} ${sh.title}\n${link}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("shareWhatsapp")}
              </a>
              <button
                type="button"
                className="button ghost small-button danger"
                disabled={busy}
                onClick={() => run(`/shipments/${sh.id}/public-link`, { enabled: false })}
              >
                {t("stopLink")}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="button small-button"
            disabled={busy}
            onClick={() => run(`/shipments/${sh.id}/public-link`, { enabled: true })}
          >
            {t("createReceiverLink")}
          </button>
        )}
        <small className="muted">{t("receiverLinkNote")}</small>
      </div>
    </div>
  );
}

export function DeliveryPointForm({ sh, t, run, busy }) {
  if (sh.legType === "origin_leg" || sh.legType === "clearance") return null;
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(`/shipments/${sh.id}/destination-point`, { point: new FormData(e.currentTarget).get("point") });
      }}
    >
      <label className="field">
        <span>{t("deliveryPointLabel")}</span>
        <input
          name="point"
          dir="ltr"
          maxLength="500"
          placeholder="36.20, 37.15 / https://maps.google.com/…"
          defaultValue={sh.destinationPoint ? `${sh.destinationPoint.lat}, ${sh.destinationPoint.lng}` : ""}
        />
      </label>
      <button className="button ghost" disabled={busy}>
        {t("save")}
      </button>
    </form>
  );
}

// Public page /t/<token> for the person receiving the goods.
export function PublicTracking({ t, lang, langSelect }) {
  const token = window.location.pathname.split("/")[2] || "";
  const [view, setView] = useState(null),
    [error, setError] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/public/track/" + encodeURIComponent(token));
      if (!r.ok) throw new Error("trackingLinkInvalid");
      setView(await r.json());
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="legal-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <main className="legal-content public-tracking">
        <h1>{t("trackYourShipment")}</h1>
        {error && <p className="form-error">{t(error)}</p>}
        {view && (
          <>
            <h2>{view.title}</h2>
            <p>
              {view.origin} → {view.destination}
              {view.crossing ? ` · ${t(view.crossing)}` : ""}
            </p>
            <span className={`badge ${view.status}`}>{t(view.status)}</span>
            {view.isOrder && (
              <div className="stage-track">
                {view.legs.map((l, i) => (
                  <div key={i} className={`stage-step ${l.status}`}>
                    <b>{i + 1}</b>
                    <span>{t("leg_" + l.legType)}</span>
                    <small>{t(l.status)}</small>
                  </div>
                ))}
              </div>
            )}
            {view.position && (
              <>
                <TrackMap
                  segments={[{ points: [], last: view.position, label: view.title }]}
                  crossing={view.crossing}
                  t={t}
                />
                <p className="muted small">
                  {t("lastSignal")}: {fmtTime(view.position.at, lang)} · {t("approxPosition")}
                </p>
              </>
            )}
            <h3>{t("shipmentHistory")}</h3>
            <ul className="public-events">
              {view.events
                .slice()
                .reverse()
                .map((e, i) => (
                  <li key={i}>
                    <b>{t("event_" + e.event)}</b> <small>{fmtTime(e.at, lang)}</small>
                  </li>
                ))}
              {!view.events.length && <li className="muted">{t("noUpdates")}</li>}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

export { legColors, distanceKm };
