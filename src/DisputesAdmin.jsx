import React from "react";

// Admin view of disputed shipments: amount held, and a refund to the customer.
// The admin can only refund here; paying the carrier is handled by the escrow flow.
export default function DisputesAdmin({ data, t, run, busy }) {
  const items = data.shipments.filter((s) => s.status === "disputed");
  if (!items.length) return <p className="muted">{t("disputeNone")}</p>;
  return (
    <section className="panel form-stack">
      {items.map((s) => {
        const e = data.escrows.find((x) => x.shipmentId === s.id);
        return (
          <div className="list-row" key={s.id}>
            <div>
              <b>{s.title}</b>
              <small>
                {s.origin} → {s.destination} · {t("amount")}: {e ? `${e.amount} USD` : "—"} ·{" "}
                {t(e?.status || "held")}
              </small>
            </div>
            <button
              className="button ghost"
              disabled={busy || !e}
              onClick={() => {
                if (window.confirm(t("disputeRefundConfirm")))
                  run(`/shipments/${s.id}/action`, { action: "refund" });
              }}
            >
              {t("disputeRefund")}
            </button>
          </div>
        );
      })}
    </section>
  );
}
