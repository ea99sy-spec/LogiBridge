import React, { useEffect, useRef, useState } from "react";

// Reads the phone's GPS position once (the browser asks the user for permission).
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("gpsUnsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? "gpsDenied" : "gpsUnavailable")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    );
  });
}

// "Share my location now" and "keep sharing" (every 2 minutes while the page is open).
export function GpsShare({ t, send, disabled }) {
  const [state, setState] = useState(""),
    [live, setLive] = useState(false);
  const timer = useRef(null);
  async function shareOnce() {
    setState("gpsLocating");
    try {
      const position = await currentPosition();
      const ok = await send(position);
      setState(ok === false ? "gpsUnavailable" : "gpsShared");
    } catch (e) {
      setState(e.message);
      setLive(false);
    }
  }
  useEffect(() => {
    if (!live) return;
    shareOnce();
    timer.current = setInterval(shareOnce, 120000);
    return () => clearInterval(timer.current);
  }, [live]);
  return (
    <div className="gps-share">
      <button type="button" className="button" disabled={disabled} onClick={shareOnce}>
        📍 {t("gpsShareNow")}
      </button>
      <label className="consent">
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
        <span>{t("gpsKeepSharing")}</span>
      </label>
      {state && <small role="status">{t(state)}</small>}
    </div>
  );
}

// Map of the last reported position (OpenStreetMap, no API key needed).
export function PositionMap({ position, t, lang }) {
  if (!position) return null;
  const d = 0.05,
    bbox = [position.lng - d, position.lat - d, position.lng + d, position.lat + d].join(",");
  const marker = `${position.lat},${position.lng}`;
  return (
    <div className="position-map">
      <iframe
        title={t("gpsMap")}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
      />
      <small>
        {t("gpsLastUpdate")}: {new Date(position.at).toLocaleString(lang)}
        {position.accuracy ? ` · ±${position.accuracy} m` : ""} ·{" "}
        <a
          href={`https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=13/${position.lat}/${position.lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("gpsOpenMap")} ↗
        </a>
      </small>
    </div>
  );
}
