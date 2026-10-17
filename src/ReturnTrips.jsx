import React, { useState } from "react";
import { countryOptions } from "../shared/countries";
import { crossings } from "../shared/crossings";
import { ReputationChips } from "./Reputation";
import { CostCalculator } from "./CostCalculator";
import "./return-trips.css";

// Empty return trips: carriers offer trucks going back empty at a lower price; traders ask for them.

const usd = (n) => "$" + Number(n).toLocaleString("en");
const today = () => new Date().toISOString().slice(0, 10);

function CountryPick({ name, defaultValue, t, label }) {
  const lang = document.documentElement.lang || "ar";
  const list = countryOptions(lang);
  const first = ["TR", "SY"];
  return (
    <label className="field">
      <span>{t(label)}</span>
      <select name={name} defaultValue={defaultValue}>
        {[...first.map((c) => list.find((o) => o.code === c)), ...list.filter((o) => !first.includes(o.code))]
          .filter(Boolean)
          .map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
      </select>
    </label>
  );
}

function openChat(id, navigate) {
  try {
    localStorage.setItem("lb_chat_to", id);
  } catch {}
  navigate("hub");
}

function TripCard({ trip, data, user, t, lang, run, busy, navigate }) {
  const name = (id) => data.users.find((u) => u.id === id)?.name || "—";
  const mine = trip.carrierId === user.id;
  const myRequest = trip.requests.find((r) => r.userId === user.id);
  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString(lang, { day: "numeric", month: "short" });
  return (
    <article className={`panel trip-card st-${trip.status}`}>
      <header>
        <b dir="auto">
          {trip.from} → {trip.to}
        </b>
        <span className={`badge ${trip.status === "open" ? "open" : trip.status}`}>
          {t("trip_" + trip.status)}
        </span>
      </header>
      <div className="trip-price">
        <strong>{usd(trip.price)}</strong>
        <small>{t("wholeTruck")}</small>
      </div>
      <ul className="trip-facts">
        <li>
          📅 {fmt(trip.date)}
          {trip.dateTo && trip.dateTo !== trip.date ? ` – ${fmt(trip.dateTo)}` : ""}
        </li>
        <li>
          🚚 {trip.truckType || t("truck")} · {trip.capacityTons} {t("tons")}
        </li>
        {trip.crossing && <li>🛂 {t(trip.crossing)}</li>}
        {trip.note && <li dir="auto">“{trip.note}”</li>}
      </ul>
      {!mine && (
        <div className="trip-carrier">
          <span>
            {t("carrierLabel")}: <b>{name(trip.carrierId)}</b>
          </span>
          <ReputationChips rep={data.reputation?.[trip.carrierId]} t={t} kind="carrier" />
        </div>
      )}
      {user.role === "merchant" && !mine && (
        <div className="trip-actions">
          {myRequest ? (
            <span className={`trip-req ${myRequest.status}`}>{t("tripRequest_" + myRequest.status)}</span>
          ) : (
            trip.status === "open" && (
              <button
                className="button small-button"
                disabled={busy}
                onClick={() => {
                  const note = window.prompt(t("tripRequestPrompt"), "");
                  if (note !== null)
                    run(`/return-trips/${trip.id}/request`, { note }, "POST", { success: "tripRequested" });
                }}
              >
                {t("requestTrip")}
              </button>
            )
          )}
          <button className="button ghost small-button" onClick={() => openChat(trip.carrierId, navigate)}>
            💬 {t("chatCarrier")}
          </button>
        </div>
      )}
      {(mine || user.role === "admin") && (
        <div className="trip-requests">
          <small className="muted">
            {t("tripRequests")} ({trip.requests.length})
          </small>
          {trip.requests.map((r) => (
            <div key={r.id} className="trip-request">
              <span>
                <b>{name(r.userId)}</b>
                {r.note ? <small dir="auto"> · {r.note}</small> : null}
              </span>
              <ReputationChips rep={data.reputation?.[r.userId]} t={t} kind="merchant" />
              {mine && r.status === "pending" ? (
                <span className="trip-request-actions">
                  <button
                    className="button small-button"
                    disabled={busy}
                    onClick={() =>
                      run(`/return-trips/${trip.id}/update`, { requestId: r.id, decision: "accepted" })
                    }
                  >
                    {t("acceptRequest")}
                  </button>
                  <button
                    className="button ghost small-button"
                    disabled={busy}
                    onClick={() =>
                      run(`/return-trips/${trip.id}/update`, { requestId: r.id, decision: "declined" })
                    }
                  >
                    {t("declineRequest")}
                  </button>
                  <button className="text-button" onClick={() => openChat(r.userId, navigate)}>
                    💬
                  </button>
                </span>
              ) : (
                <span className={`trip-req ${r.status}`}>{t("tripRequest_" + r.status)}</span>
              )}
            </div>
          ))}
          {mine && (
            <div className="trip-owner-actions">
              {trip.status !== "booked" && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => run(`/return-trips/${trip.id}/update`, { status: "booked" })}
                >
                  {t("markBooked")}
                </button>
              )}
              {trip.status !== "cancelled" && (
                <button
                  className="text-button danger-text"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(t("cancelTripConfirm")) &&
                    run(`/return-trips/${trip.id}/update`, { status: "cancelled" })
                  }
                >
                  {t("cancelTrip")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ReturnTrips({ data, user, t, lang, run, busy, navigate }) {
  const [query, setQuery] = useState("");
  const carrier = user.role === "carrier";
  const trips = (data.returnTrips || [])
    .filter((x) => !query || `${x.from} ${x.to} ${x.truckType}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date));
  const mine = trips.filter((x) => x.carrierId === user.id);
  const others = trips.filter((x) => x.carrierId !== user.id);
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("returnTrips")}</h1>
          <p>{t(carrier ? "returnTripsIntroCarrier" : "returnTripsIntroTrader")}</p>
        </div>
      </div>
      {carrier && (
        <form
          className="panel form-stack trip-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = Object.fromEntries(new FormData(form));
            const ok = await run("/return-trips", f, "POST", { success: "tripPosted" });
            if (ok) form.reset();
          }}
        >
          <h3>＋ {t("postReturnTrip")}</h3>
          <div className="trip-form-grid">
            <label className="field">
              <span>{t("tripFrom")}</span>
              <input name="from" required maxLength={80} placeholder={t("tripFromExample")} />
            </label>
            <CountryPick name="originCountry" defaultValue="SY" t={t} label="country" />
            <label className="field">
              <span>{t("tripTo")}</span>
              <input name="to" required maxLength={80} placeholder={t("tripToExample")} />
            </label>
            <CountryPick name="destinationCountry" defaultValue="TR" t={t} label="country" />
            <label className="field">
              <span>{t("tripDate")}</span>
              <input name="date" type="date" required min={today()} />
            </label>
            <label className="field">
              <span>{t("tripDateTo")}</span>
              <input name="dateTo" type="date" min={today()} />
            </label>
            <label className="field">
              <span>{t("truckType")}</span>
              <input name="truckType" maxLength={60} placeholder={t("truckTypeExample")} />
            </label>
            <label className="field">
              <span>{t("capacityTons")}</span>
              <input name="capacityTons" type="number" min="0.5" max="100" step="0.5" required />
            </label>
            <label className="field">
              <span>{t("tripPrice")}</span>
              <input name="price" type="number" min="1" step="1" required />
            </label>
            <label className="field">
              <span>{t("borderCrossing")}</span>
              <select name="crossing" defaultValue="">
                <option value="">—</option>
                {Object.keys(crossings)
                  .filter((k) => crossings[k].status === "open")
                  .map((k) => (
                    <option key={k} value={k}>
                      {t(k)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field wide">
              <span>{t("noteOptional")}</span>
              <input name="note" maxLength={300} placeholder={t("tripNoteExample")} />
            </label>
          </div>
          <CostCalculator
            t={t}
            onUse={(price) => {
              const input = document.querySelector("form.trip-form input[name=price]");
              if (input) input.value = price;
            }}
          />
          <button className="button" disabled={busy}>
            {t("publishTrip")}
          </button>
        </form>
      )}
      <input
        type="search"
        className="trip-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchRoute")}
        aria-label={t("searchRoute")}
      />
      {carrier && mine.length > 0 && <h3>{t("myTrips")}</h3>}
      <div className="trip-grid">
        {(carrier ? mine : []).map((x) => (
          <TripCard
            key={x.id}
            trip={x}
            data={data}
            user={user}
            t={t}
            lang={lang}
            run={run}
            busy={busy}
            navigate={navigate}
          />
        ))}
      </div>
      {carrier && <h3>{t("otherTrips")}</h3>}
      {others.length ? (
        <div className="trip-grid">
          {others.map((x) => (
            <TripCard
              key={x.id}
              trip={x}
              data={data}
              user={user}
              t={t}
              lang={lang}
              run={run}
              busy={busy}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <p className="muted">{t("noReturnTrips")}</p>
      )}
    </>
  );
}
