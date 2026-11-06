import React, { useEffect, useState } from "react";
import { crossings } from "../shared/crossings";

// Working panels for carriers, customs brokers and equipment suppliers.
// Each row links to the page where the action is taken, so no new rules are added here.
export default function ProviderPanels({ kind, data, t, navigate, money }) {
  const user = data.user;
  const [live, setLive] = useState({});
  useEffect(() => {
    if (kind === "supplier") return;
    fetch("/api/border")
      .then((r) => (r.ok ? r.json() : {}))
      .then((v) => setLive(v.live || {}))
      .catch(() => {});
  }, [kind]);

  const openShipments = data.shipments.filter((s) => s.status === "open");
  const mine = data.shipments.filter(
    (s) => s.carrierId === user.id && !["delivered", "cancelled"].includes(s.status),
  );

  const borderBar = (
    <section className="panel">
      <h3>{t("borderNowTitle")}</h3>
      <div className="border-chips">
        {Object.keys(crossings).map((k) => {
          const state = live[k] || (crossings[k].status === "open" ? "open" : crossings[k].status);
          const label =
            state === "closed"
              ? t("crossingClosedNow")
              : state === "busy"
                ? t("crossingBusyNow")
                : state === "open"
                  ? t("crossing_open")
                  : t("crossing_" + state);
          return (
            <span key={k} className={`border-chip ${state}`}>
              <b>{t(k)}</b> · {label}
            </span>
          );
        })}
      </div>
      <button className="text-button" onClick={() => navigate("border")}>
        {t("viewAll")} ↗
      </button>
    </section>
  );

  const rows = (items, render, empty) =>
    items.length ? items.slice(0, 6).map(render) : <p className="muted">{empty}</p>;

  if (kind === "carrier") {
    return (
      <div className="two-cols">
        {borderBar}
        <section className="panel">
          <h3>{t("openShipmentsTitle")}</h3>
          {rows(
            openShipments,
            (s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <b>{s.title}</b>
                  <small>
                    {s.origin} → {s.destination}
                  </small>
                </div>
                <button className="text-button" onClick={() => navigate("jobs")}>
                  {t("providerOffer")} ↗
                </button>
              </div>
            ),
            t("empty"),
          )}
        </section>
      </div>
    );
  }

  if (kind === "broker") {
    return (
      <div className="two-cols">
        {borderBar}
        <section className="panel">
          <h3>{t("clearanceRequestsTitle")}</h3>
          {rows(
            openShipments.filter((s) => s.crossing || s.legType === "clearance"),
            (s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <b>{s.title}</b>
                  <small>
                    {s.crossing ? t(s.crossing) : ""} · {s.origin} → {s.destination}
                  </small>
                </div>
                <button className="text-button" onClick={() => navigate("jobs")}>
                  {t("providerOffer")} ↗
                </button>
              </div>
            ),
            t("empty"),
          )}
          <h3>{t("activeClearancesTitle")}</h3>
          {rows(
            mine,
            (s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <b>{s.title}</b>
                  <small>{s.crossing ? t(s.crossing) : ""}</small>
                </div>
                <button className="text-button" onClick={() => navigate("tracking")}>
                  {t("providerUpdate")} ↗
                </button>
              </div>
            ),
            t("empty"),
          )}
        </section>
      </div>
    );
  }

  // Supplier: incoming equipment orders and the product list
  const listings = data.products.filter((p) => p.supplierId === user.id);
  const orders = data.orders.filter((o) => listings.some((p) => p.id === o.productId));
  return (
    <div className="two-cols">
      <section className="panel">
        <h3>{t("equipmentOrdersTitle")}</h3>
        {rows(
          orders.filter((o) => o.status === "demo_reserved"),
          (o) => {
            const p = listings.find((x) => x.id === o.productId);
            return (
              <div className="list-row" key={o.id}>
                <div>
                  <b>{p?.title || "—"}</b>
                  <small>
                    {o.quantity} · {money(o.total)}
                  </small>
                </div>
                <button className="text-button" onClick={() => navigate("orders")}>
                  {t("providerOpen")} ↗
                </button>
              </div>
            );
          },
          t("empty"),
        )}
      </section>
      <section className="panel">
        <h3>{t("inventoryTitle")}</h3>
        {rows(
          listings,
          (p) => (
            <div className="list-row" key={p.id}>
              <div>
                <b>{p.title}</b>
                <small>
                  {p.type} · {money(p.price)}
                </small>
              </div>
              <button className="text-button" onClick={() => navigate("inventory")}>
                {t("providerUpdate")} ↗
              </button>
            </div>
          ),
          t("empty"),
        )}
        <button className="text-button" onClick={() => navigate("inventory")}>
          {t("providerAdd")} ↗
        </button>
      </section>
    </div>
  );
}
