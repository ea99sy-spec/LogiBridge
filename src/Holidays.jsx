import React, { useEffect, useState } from "react";
import { upcomingHolidays, holidaysNear } from "../shared/holidays";
import { Flag } from "./Flags";

const index = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));
// Country labels as text chips (flag emoji render the wrong Syrian flag on many devices).
const Chip = ({ c, t }) => (
  <span className={`country-chip c-${c}`}>
    <Flag c={c} t={t} height={12} /> {t(c === "TR" ? "turkey" : "syria")}
  </span>
);

// Re-renders every 30 seconds so countdowns stay current.
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function parts(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

function Countdown({ h, now, t }) {
  const ms = h.active ? h.end - now : h.start - now;
  const p = parts(ms);
  return (
    <div className={`countdown ${h.active ? "active" : ""}`} aria-live="polite">
      <small>{t(h.active ? "holidayEndsIn" : "holidayStartsIn")}</small>
      <div className="countdown-digits">
        {[
          [p.d, "cdDays"],
          [p.h, "cdHours"],
          [p.m, "cdMinutes"],
        ].map(([v, k]) => (
          <span key={k}>
            <b>{v}</b>
            <small>{t(k)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

const range = (h, lang) => {
  const fmt = (ms) =>
    new Date(ms).toLocaleDateString(lang, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/Istanbul",
    });
  const last = h.end - 86400000;
  return h.days > 1 ? `${fmt(h.start)} – ${fmt(last)}` : fmt(h.start);
};

// Border page: countdown to the next holiday and the list of the coming ones.
export function HolidaySection({ t, lang }) {
  const now = useNow();
  const list = upcomingHolidays(now).slice(0, 10);
  const i = index(lang);
  if (!list.length) return null;
  const next = list[0];
  return (
    <section className="panel holidays" id="holidays">
      <h2>{t("holidaysTitle")}</h2>
      <p className="muted">{t("holidaysIntro")}</p>
      <div className="holiday-next">
        <div>
          <Chip c={next.country} t={t} />
          <h3>{next.name[i]}</h3>
          <small>
            {range(next, lang)}
            {next.days > 1 ? ` · ${next.days} ${t("daysWord")}` : ""}
          </small>
        </div>
        <Countdown h={next} now={now} t={t} />
      </div>
      <ul className="holiday-list">
        {list.slice(1).map((h) => (
          <li key={h.country + h.date + h.key}>
            <Chip c={h.country} t={t} />
            <b>{h.name[i]}</b>
            <span className="holiday-date">
              {range(h, lang)}
              {h.days > 1 ? ` · ${h.days} ${t("daysWord")}` : ""}
            </span>
            <small className="muted">
              {t("inDays").replace("{n}", Math.max(0, Math.ceil((h.start - now) / 86400000)))}
              {h.lunar ? ` · ${t("lunarNote")}` : ""}
            </small>
          </li>
        ))}
      </ul>
      <p className="muted small">{t("holidayImpact")}</p>
    </section>
  );
}

// Dashboard: the next holiday in either country with its countdown.
export function HolidayCard({ t, lang, navigate }) {
  const now = useNow();
  const next = upcomingHolidays(now)[0];
  if (!next) return null;
  const i = index(lang);
  return (
    <section className="panel holiday-card">
      <div>
        <small className="muted">{t("nextHoliday")}</small>
        <h3>
          <Chip c={next.country} t={t} /> {next.name[i]}
        </h3>
        <small>{range(next, lang)}</small>
      </div>
      <Countdown h={next} now={now} t={t} />
      {navigate && (
        <button type="button" className="text-button" onClick={() => navigate("border")}>
          {t("allHolidays")} ↗
        </button>
      )}
    </section>
  );
}

// Shipment form: warns when the chosen date falls on or next to a holiday.
export function HolidayWarning({ date, countries, t, lang }) {
  const near = holidaysNear(date, countries);
  if (!near.length) return null;
  const i = index(lang);
  return (
    <p className="notice holiday-warning" role="status">
      ⚠ {t("holidayWarning")}{" "}
      {near
        .map(
          (h) =>
            `${t(h.country === "TR" ? "turkey" : "syria")}: ${h.name[i]} (${range({ ...h, start: Date.parse(h.date + "T00:00:00+03:00"), end: Date.parse(h.date + "T00:00:00+03:00") + h.days * 86400000 }, lang)})`,
        )
        .join("، ")}
    </p>
  );
}

// Drop inside any form with a "date" field: shows the holiday warning for the chosen date,
// for the countries of the route (originCountry / destinationCountry) when they are TR or SY.
export function FormHolidayWarning({ t, lang }) {
  const ref = React.useRef(null);
  const [state, setState] = useState({ date: "", countries: ["TR", "SY"] });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const f = new FormData(form);
      const route = [f.get("originCountry"), f.get("destinationCountry")].filter((c) =>
        ["TR", "SY"].includes(c),
      );
      setState({
        date: String(f.get("date") || ""),
        countries: route.length ? [...new Set(route)] : ["TR", "SY"],
      });
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, []);
  return (
    <span ref={ref} className="holiday-warning-slot">
      <HolidayWarning date={state.date} countries={state.countries} t={t} lang={lang} />
    </span>
  );
}
