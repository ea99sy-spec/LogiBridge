import React, { useEffect, useState } from "react";
import { crossings } from "../shared/crossings";
import { upcomingHolidays } from "../shared/holidays";
import { Flag } from "./Flags";
import "./landing-live.css";

const index = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));
const hoursAgo = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));

// "Live from the crossings": queue reports, next holiday and the latest administration notice,
// all from the platform's own data (/api/border and the holiday calendar).
export function LiveBorderStrip({ t, lang }) {
  const [data, setData] = useState({ notices: [], reports: [] });
  useEffect(() => {
    fetch("/api/border")
      .then((r) => (r.ok ? r.json() : { notices: [], reports: [] }))
      .then((v) => setData({ notices: v.notices || [], reports: v.reports || [] }))
      .catch(() => {});
  }, []);
  const i = index(lang);
  const items = [];
  for (const k of Object.keys(crossings).filter((k) => crossings[k].status === "open")) {
    const r = data.reports.find((x) => x.crossing === k);
    items.push(
      <span key={k} className={`live-item ${r && r.level >= 3 ? "busy" : ""}`}>
        <b>{t(k)}</b>:{" "}
        {r
          ? `${t("wait_" + r.level)} · ${hoursAgo(r.createdAt) < 1 ? t("justNow") : t("reportedAgo").replace("{h}", hoursAgo(r.createdAt))}`
          : t("crossing_open")}
      </span>,
    );
  }
  const next = upcomingHolidays()[0];
  if (next) {
    const days = Math.max(0, Math.ceil((next.start - Date.now()) / 86400000));
    items.push(
      <span key="holiday" className="live-item holiday">
        <Flag c={next.country} t={t} height={11} /> {next.name[i]} ·{" "}
        {next.active ? t("onNow") : t("inDays").replace("{n}", days)}
      </span>,
    );
  }
  const notice = data.notices[0];
  if (notice && Date.now() - Date.parse(notice.date) < 30 * 86400000)
    items.push(
      <span key="notice" className="live-item notice-item">
        📢 {notice.title}
      </span>,
    );
  return (
    <section className="live-strip" aria-label={t("liveFromBorder")}>
      <span className="live-label">
        <i /> {t("liveFromBorder")}
      </span>
      <div className="live-items">{items}</div>
      <a href="/border" className="live-more">
        {t("details")} ↗
      </a>
    </section>
  );
}

// Counts up from the previous value to the new one (respects reduced motion).
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const from = React.useRef(0);
  useEffect(() => {
    const start = from.current;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || start === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1200);
      const v = Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3)));
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <b>{shown.toLocaleString("en")}</b>;
}

// Real platform numbers, refreshed every minute so they grow by themselves.
// A number is shown only once it is above zero; the administrator can hide the whole row.
export function PlatformStats({ t }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const load = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then((r) => setStats(r.stats || null))
        .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  if (!stats) return null;
  const items = [
    ["companies", "statCompanies"],
    ["completed", "statCompleted"],
    ["active", "statActive"],
    ["countries", "statCountries"],
  ].filter(([k]) => stats[k] > 0);
  if (!items.length) return null;
  const crossingsOpen = Object.values(crossings).filter((c) => c.status === "open").length;
  return (
    <section className="platform-stats" aria-label={t("statsTitle")}>
      {items.map(([k, label]) => (
        <div key={k}>
          <CountUp value={stats[k]} />
          <small>{t(label)}</small>
        </div>
      ))}
      <div>
        <CountUp value={crossingsOpen} />
        <small>{t("statCrossings")}</small>
      </div>
    </section>
  );
}
