import React, { useMemo, useState } from "react";
import { checkCommercial, totals, UNITS, INCOTERMS } from "../shared/commercial";

// Owner: fill the goods once and get a matching commercial invoice and packing list, checked
// against the shipment. Everyone on the shipment can open both for printing or saving as PDF.

const emptyItem = (hsCode = "") => ({
  description: "",
  hsCode,
  qty: "",
  unit: "pcs",
  unitPrice: "",
  netKg: "",
  grossKg: "",
  packages: "",
});

function Links({ id, t }) {
  return (
    <div className="cd-links">
      <a
        className="button ghost small-button"
        href={`/api/shipments/${id}/commercial-docs/invoice`}
        target="_blank"
        rel="noopener"
      >
        📄 {t("openInvoice")}
      </a>
      <a
        className="button ghost small-button"
        href={`/api/shipments/${id}/commercial-docs/packing`}
        target="_blank"
        rel="noopener"
      >
        📦 {t("openPacking")}
      </a>
    </div>
  );
}

export function CommercialDocs({ file, user, t, run, busy, isOwner }) {
  const sh = file.root;
  const saved = sh?.commercialDocs;
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState(
    () =>
      saved || {
        number: "",
        date: new Date().toISOString().slice(0, 10),
        currency: "USD",
        incoterm: "",
        origin: "",
        marks: "",
        seller: { name: user.name || "", address: "", taxId: user.taxId || "" },
        buyer: {
          name: sh?.privateDetails?.recipientName || "",
          address: sh?.privateDetails?.destinationAddress || "",
          taxId: "",
        },
        items: [emptyItem(sh?.hsCode || "")],
      },
  );
  const check = useMemo(() => checkCommercial(doc, sh), [doc, sh]);
  const sum = totals(doc);
  if (!isOwner)
    return file.hasCommercialDocs ? (
      <div className="doc-box cd-box">
        <b>📄 {t("commercialDocsTitle")}</b>
        <Links id={file.id} t={t} />
      </div>
    ) : null;
  const set = (path, value) =>
    setDoc((d) => {
      const next = structuredClone(d);
      let o = next;
      for (const k of path.slice(0, -1)) o = o[k];
      o[path.at(-1)] = value;
      return next;
    });
  const msg = (e) =>
    t(e.key)
      .replace("{line}", e.line ?? "")
      .replace("{gross}", e.gross ?? "")
      .replace("{declared}", e.declared ?? "");
  return (
    <details className="doc-box cd-box" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        📄 {t("commercialDocsTitle")} {saved ? "✓" : ""}
      </summary>
      <p className="muted small">{t("commercialDocsIntro")}</p>
      {saved && <Links id={file.id} t={t} />}
      <form
        className="cd-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await run(`/shipments/${file.id}/commercial-docs`, doc, "POST", { success: "commercialSaved" });
        }}
      >
        <div className="cd-grid">
          <label>
            <small>{t("invoiceNumber")}</small>
            <input value={doc.number} maxLength={40} onChange={(e) => set(["number"], e.target.value)} />
          </label>
          <label>
            <small>{t("invoiceDate")}</small>
            <input type="date" value={doc.date} onChange={(e) => set(["date"], e.target.value)} />
          </label>
          <label>
            <small>{t("currency")}</small>
            <select value={doc.currency} onChange={(e) => set(["currency"], e.target.value)}>
              {["USD", "EUR", "TRY", "SYP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <small>{t("incoterm")}</small>
            <select value={doc.incoterm} onChange={(e) => set(["incoterm"], e.target.value)}>
              <option value="">—</option>
              {INCOTERMS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <small>{t("countryOfOrigin")}</small>
            <input value={doc.origin} maxLength={60} onChange={(e) => set(["origin"], e.target.value)} />
          </label>
          <label>
            <small>{t("shippingMarks")}</small>
            <input value={doc.marks} maxLength={200} onChange={(e) => set(["marks"], e.target.value)} />
          </label>
        </div>
        <div className="cd-parties">
          {["seller", "buyer"].map((p) => (
            <fieldset key={p}>
              <legend>{t(p === "seller" ? "sellerExporter" : "buyerImporter")}</legend>
              <input
                placeholder={t("partyName")}
                value={doc[p].name}
                maxLength={160}
                onChange={(e) => set([p, "name"], e.target.value)}
              />
              <input
                placeholder={t("partyAddress")}
                value={doc[p].address}
                maxLength={300}
                onChange={(e) => set([p, "address"], e.target.value)}
              />
              <input
                placeholder={t("taxId")}
                value={doc[p].taxId}
                maxLength={40}
                onChange={(e) => set([p, "taxId"], e.target.value)}
                dir="ltr"
              />
            </fieldset>
          ))}
        </div>
        <div className="cd-items-scroll">
          <table className="cd-items">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("itemDescription")}</th>
                <th>HS</th>
                <th>{t("qtyShort")}</th>
                <th>{t("unitShort")}</th>
                <th>{t("unitPriceShort")}</th>
                <th>{t("packagesShort")}</th>
                <th>{t("netKgShort")}</th>
                <th>{t("grossKgShort")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {doc.items.map((i, n) => (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td>
                    <input
                      value={i.description}
                      maxLength={200}
                      onChange={(e) => set(["items", n, "description"], e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="num"
                      value={i.hsCode}
                      maxLength={12}
                      inputMode="numeric"
                      dir="ltr"
                      onChange={(e) => set(["items", n, "hsCode"], e.target.value.replace(/\D/g, ""))}
                    />
                  </td>
                  {["qty"].map((k) => (
                    <td key={k}>
                      <input
                        className="num"
                        type="number"
                        min="0"
                        step="any"
                        value={i[k]}
                        onChange={(e) => set(["items", n, k], e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <select value={i.unit} onChange={(e) => set(["items", n, "unit"], e.target.value)}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t("unit_" + u)}
                        </option>
                      ))}
                    </select>
                  </td>
                  {["unitPrice", "packages", "netKg", "grossKg"].map((k) => (
                    <td key={k}>
                      <input
                        className="num"
                        type="number"
                        min="0"
                        step="any"
                        value={i[k]}
                        onChange={(e) => set(["items", n, k], e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    {doc.items.length > 1 && (
                      <button
                        type="button"
                        className="text-button danger-text"
                        aria-label={t("delete")}
                        onClick={() => setDoc((d) => ({ ...d, items: d.items.filter((_, x) => x !== n) }))}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5}>{t("totalsLabel")}</th>
                <th>
                  {sum.amount.toLocaleString("en")} {doc.currency}
                </th>
                <th>{sum.packages}</th>
                <th>{sum.net}</th>
                <th>{sum.gross}</th>
                <th />
              </tr>
            </tfoot>
          </table>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => setDoc((d) => ({ ...d, items: [...d.items, emptyItem(sh?.hsCode || "")] }))}
        >
          ＋ {t("addItem")}
        </button>
        <div className="cd-check" role="status">
          {check.errors.length === 0 && check.warnings.length === 0 ? (
            <p className="cd-ok">✓ {t("ccAllGood")}</p>
          ) : (
            <ul>
              {check.errors.map((e, x) => (
                <li key={"e" + x} className="cd-error">
                  ⛔ {msg(e)}
                </li>
              ))}
              {check.warnings.map((w, x) => (
                <li key={"w" + x} className="cd-warn">
                  ⚠ {msg(w)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="button" disabled={busy || check.errors.length > 0}>
          {t("saveCommercialDocs")}
        </button>
        <small className="muted">{t("commercialPrintHint")}</small>
      </form>
    </details>
  );
}
