import { HolidayCard } from "./Holidays";
import { SubscriptionCard } from "./Subscription";
import React, { useState } from "react";
import { accountKind, workspaceModules } from "../shared/workspaces";
export default function RoleDashboard({ data, t, navigate, money, ShipmentCard }) {
  const user = data.user,
    kind = accountKind(user),
    provider = kind === "carrier" || kind === "broker",
    own = data.shipments.filter((s) =>
      provider ? s.carrierId === user.id : s.ownerId === user.id && !s.parentId,
    ),
    active = own.filter((s) => !["delivered", "cancelled"].includes(s.status));
  const allowed = workspaceModules(user, data.flags);
  const bids = data.bids.filter((b) =>
    provider
      ? b.carrierId === user.id
      : data.shipments.some((s) => s.id === b.shipmentId && s.ownerId === user.id && s.status === "open"),
  );
  const listings = data.products.filter((p) => p.supplierId === user.id),
    orders = data.orders.filter((o) => listings.some((p) => p.id === o.productId));
  const reservations = data.reservations.filter((r) => r.userId === user.id),
    fleet = data.fleets.filter((f) => f.userId === user.id);
  const pending = data.kyb.filter((d) => d.status === "pending");
  const metrics = {
    merchant: [
      ["myActiveShipments", active.length],
      ["receivedOffers", bids.length],
      ["myReservations", reservations.length],
      [
        "myHeldFunds",
        money(data.escrows.filter((e) => e.status === "held").reduce((n, e) => n + e.amount, 0)),
      ],
    ],
    individual: [
      ["myShipments", own.length],
      ["myReservations", reservations.length],
      ["readyToReceive", own.filter((s) => s.status === "arrived").length],
      ["myDocuments", data.shipmentDocuments.length],
    ],
    carrier: [
      ["assignedJobs", active.length],
      ["availableJobs", data.shipments.filter((s) => s.status === "open").length],
      ["submittedOffers", bids.length],
      ["myVehicles", fleet.length],
    ],
    broker: [
      ["assignedJobs", active.length],
      ["availableJobs", data.shipments.filter((s) => s.status === "open").length],
      ["submittedOffers", bids.length],
      ["completedOperations", own.filter((s) => s.status === "delivered").length],
    ],
    supplier: [
      ["myEquipment", listings.length],
      ["newEquipmentOrders", orders.filter((o) => o.status === "demo_reserved").length],
      ["confirmedOrders", orders.filter((o) => o.status === "confirmed").length],
      ["orderValue", money(orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0))],
    ],
    admin: [
      ["pendingApplications", pending.length],
      ["registeredAccounts", data.users.filter((u) => u.role !== "admin" && !u.demo).length],
      [
        "activeShipments",
        data.shipments.filter((s) => !["delivered", "cancelled"].includes(s.status)).length,
      ],
      ["disputedShipments", data.shipments.filter((s) => s.status === "disputed").length],
    ],
  };
  const actions = {
    merchant: [
      ["newShipment", "enterShipment", "＋"],
      ["shipments", "compareMyOffers", "▤"],
      ["documents", "uploadDocuments", "⇧"],
      ["tracking", "trackMyShipments", "◎"],
    ],
    individual: [
      ["newShipment", "personalShipment", "＋"],
      ["groups", "reserve", "▦"],
      ["kyb", "passportUpload", "◇"],
      ["tracking", "trackMyShipments", "◎"],
    ],
    carrier: [
      ["jobs", "availableJobs", "▤"],
      ["fleet", "manageFleet", "⇄"],
      ["tracking", "updateMyJobs", "◎"],
      ["groups", "myDepartures", "▦"],
    ],
    broker: [
      ["jobs", "availableJobs", "▤"],
      ["tracking", "updateMyJobs", "◎"],
      ["documents", "uploadDocuments", "⇧"],
      ["border", "border", "☷"],
    ],
    supplier: [
      ["inventory", "manageEquipment", "▧"],
      ["orders", "manageOrders", "▤"],
      ["hub", "contactBuyers", "◌"],
      ["kyb", "businessVerification", "◇"],
    ],
    admin: [
      ["kyb", "identityApplications", "◇"],
      ["companies", "registeredAccounts", "▦"],
      ["admin", "featureFlags", "⚙"],
      ["tracking", "allShipments", "◎"],
    ],
  };
  const heroAction = {
    merchant: "newShipment",
    individual: "newShipment",
    carrier: "jobs",
    broker: "jobs",
    supplier: "inventory",
    admin: "kyb",
  }[kind];
  const list = provider ? active : own;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">LOGIBRIDGE · {t(kind)}</span>
          <h1>{t(`board_${kind}`)}</h1>
          <p>{t(`boardIntro_${kind}`)}</p>
        </div>
        <span className="role-tag">{user.name}</span>
      </div>
      <SubscriptionCard
        sub={data.subscription}
        t={t}
        lang={document.documentElement.lang}
        pricing={data.pricing}
        accountType={user.accountType}
      />
      <HolidayCard
        t={t}
        lang={document.documentElement.lang}
        navigate={allowed.includes("border") ? navigate : null}
      />
      <div className="operation-shortcuts">
        {actions[kind]
          .filter(([path]) => allowed.includes(path))
          .map(([path, label, symbol]) => (
            <button key={path} onClick={() => navigate(path)}>
              <span>{symbol}</span>
              <b>{t(label)}</b>
              <i>↗</i>
            </button>
          ))}
      </div>
      <div className="stats">
        {metrics[kind].map(([label, value]) => (
          <article className="stat" key={label}>
            <small>{t(label)}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className={`hero role-hero role-${kind}`}>
        <div>
          <span className="eyebrow">{t(`priority_${kind}`)}</span>
          <h2>{t(`boardHero_${kind}`)}</h2>
          <p>{t(`boardIntro_${kind}`)}</p>
          {allowed.includes(heroAction) && (
            <button className="button light" onClick={() => navigate(heroAction)}>
              {t(actions[kind][0][1])} ↗
            </button>
          )}
        </div>
        <span className="role-hero-icon">
          {{ merchant: "▤", individual: "◉", carrier: "⇄", broker: "⚖", supplier: "▧", admin: "◇" }[kind]}
        </span>
      </section>
      {!["supplier", "admin"].includes(kind) && (
        <>
          <div className="section-heading">
            <h2>{t(provider ? "myAssignedJobs" : "myShipments")}</h2>
            <button className="text-button" onClick={() => navigate(provider ? "jobs" : "shipments")}>
              {t("viewAll")} ↗
            </button>
          </div>
          <div className="cards">
            {list
              .slice(-3)
              .reverse()
              .map((s) => (
                <ShipmentCard key={s.id} s={s} compact />
              ))}
          </div>
          {!list.length && (
            <div className="panel">
              <p>{t(provider ? "noAssignedJobs" : "noPersonalShipments")}</p>
            </div>
          )}
          <div className="panel">
            <h3>
              {t(provider ? "submittedOffers" : kind === "individual" ? "myReservations" : "receivedOffers")}
            </h3>
            {kind === "individual"
              ? reservations.map((r) => (
                  <div className="list-row" key={r.id}>
                    <span>
                      {data.groups.find((g) => g.id === r.groupId)?.origin} →{" "}
                      {data.groups.find((g) => g.id === r.groupId)?.destination}
                    </span>
                    <b>
                      {r.volume} m³ · {money(r.price)}
                    </b>
                  </div>
                ))
              : bids.slice(-5).map((b) => (
                  <div className="list-row" key={b.id}>
                    <span>{data.shipments.find((s) => s.id === b.shipmentId)?.title}</span>
                    <b>{money(b.price)}</b>
                  </div>
                ))}
            {!(kind === "individual" ? reservations : bids).length && <p className="muted">{t("empty")}</p>}
          </div>
        </>
      )}
      {kind === "supplier" && (
        <div className="two-cols">
          <div className="panel">
            <h3>{t("myEquipment")}</h3>
            {listings.slice(0, 5).map((p) => (
              <div className="list-row" key={p.id}>
                <b>{p.title}</b>
                <span>
                  {t(p.type)} · {money(p.price)}
                </span>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>{t("newEquipmentOrders")}</h3>
            {orders
              .slice(-5)
              .reverse()
              .map((o) => (
                <div className="list-row" key={o.id}>
                  <span>{listings.find((p) => p.id === o.productId)?.title}</span>
                  <b>{money(o.total)}</b>
                  <span>{t(o.status)}</span>
                </div>
              ))}
            {!orders.length && <p className="muted">{t("empty")}</p>}
          </div>
        </div>
      )}
      {kind === "admin" && (
        <div className="two-cols">
          <div className="panel">
            <h3>{t("pendingApplications")}</h3>
            {pending.slice(0, 5).map((d) => (
              <div className="list-row" key={d.id}>
                <b>{d.company || d.fullName}</b>
                <span>{t(d.kind === "person" ? "individual" : "company")}</span>
                <button className="text-button" onClick={() => navigate("kyb")}>
                  {t("reviewDecision")} ↗
                </button>
              </div>
            ))}
            {!pending.length && <p className="muted">{t("empty")}</p>}
          </div>
          <div className="panel">
            <h3>{t("disputedShipments")}</h3>
            {data.shipments
              .filter((s) => s.status === "disputed")
              .map((s) => (
                <div className="list-row" key={s.id}>
                  <b>{s.title}</b>
                  <button className="text-button" onClick={() => navigate("shipments")}>
                    {t("viewAll")}
                  </button>
                </div>
              ))}
            {!data.shipments.some((s) => s.status === "disputed") && (
              <p className="muted">{t("noDisputes")}</p>
            )}
          </div>
        </div>
      )}
      <div className="panel role-next-step">
        <span>◇</span>
        <div>
          <h3>{t(kind === "admin" ? "identityApplications" : "identityReview")}</h3>
          <p>
            {t(
              kind === "individual"
                ? "passportDescription"
                : kind === "admin"
                  ? "manualVerificationNote"
                  : "businessDescription",
            )}
          </p>
        </div>
        <button className="button ghost" onClick={() => navigate("kyb")}>
          {t(kind === "admin" ? "identityApplications" : user.verified ? "manualVerified" : "submit")} ↗
        </button>
      </div>
    </>
  );
}
export function CarrierJobs({ data, t, ShipmentCard }) {
  const [scope, setScope] = useState("availableJobs");
  const list = data.shipments.filter((s) =>
    scope === "availableJobs" ? s.status === "open" : s.carrierId === data.user.id,
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("carrierJobs")}</h1>
          <p>{t(data.user.role === "broker" ? "boardIntro_broker" : "boardIntro_carrier")}</p>
        </div>
      </div>
      <div className="role-tabs">
        {["availableJobs", "myAssignedJobs"].map((k) => (
          <button className={scope === k ? "active" : ""} key={k} onClick={() => setScope(k)}>
            {t(k)}
          </button>
        ))}
      </div>
      <div className="shipment-list">
        {list.map((s) => (
          <ShipmentCard s={s} key={s.id} />
        ))}
      </div>
      {!list.length && (
        <div className="panel">
          <p>{t("empty")}</p>
        </div>
      )}
    </>
  );
}
export function SupplierInventory({ data, t, run, busy, money }) {
  const own = data.products.filter((p) => p.supplierId === data.user.id);
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("manageEquipment")}</h1>
          <p>{t("boardIntro_supplier")}</p>
        </div>
      </div>
      <form
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          run("/products", Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        <h3>{t("addProduct")}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{t("equipmentName")}</span>
            <input name="title" required maxLength="80" />
          </label>
          <label className="field">
            <span>{t("price")}</span>
            <input name="price" type="number" required min=".01" step=".01" />
          </label>
          <label className="field">
            <span>{t("listingType")}</span>
            <select name="type">
              <option value="sale">{t("sale")}</option>
              <option value="rental">{t("rental")}</option>
            </select>
          </label>
        </div>
        <button className="button" disabled={busy}>
          {t("publish")}
        </button>
      </form>
      <div className="cards supplier-catalog">
        {own.map((p) => (
          <article className="panel" key={p.id}>
            <span className="tag">{t(p.type)}</span>
            <h3>{p.title}</h3>
            <strong>{money(p.price)}</strong>
            <p className="muted small">{t("ownedListing")}</p>
          </article>
        ))}
      </div>
    </>
  );
}
export function SupplierOrders({ data, t, run, busy, money }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>{t("manageOrders")}</h1>
          <p>{t("supplierOrdersIntro")}</p>
        </div>
      </div>
      {data.orders.length ? (
        data.orders.map((o) => (
          <article className="panel supplier-order" key={o.id}>
            <div>
              <h3>{data.products.find((p) => p.id === o.productId)?.title}</h3>
              <p>
                {data.users.find((u) => u.id === o.userId)?.name} · {t("quantity")}: {o.quantity}
              </p>
              <small>
                {t("shipmentReference")}: {o.id}
              </small>
            </div>
            <strong>{money(o.total)}</strong>
            <span className={`badge ${o.status}`}>{t(o.status)}</span>
            <div className="actions">
              {o.status === "demo_reserved" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => run(`/orders/${o.id}/status`, { status: "confirmed" }, "PATCH")}
                >
                  {t("confirmOrder")}
                </button>
              )}
              {o.status === "confirmed" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => run(`/orders/${o.id}/status`, { status: "completed" }, "PATCH")}
                >
                  {t("completeOrder")}
                </button>
              )}
              {["demo_reserved", "confirmed"].includes(o.status) && (
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() => run(`/orders/${o.id}/status`, { status: "cancelled" }, "PATCH")}
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </article>
        ))
      ) : (
        <div className="panel">
          <p>{t("empty")}</p>
        </div>
      )}
    </>
  );
}
