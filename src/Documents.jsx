import React, { useMemo, useRef, useState } from "react";
import { checklist, missingFor, requestableKinds } from "../shared/documents";
import "./documents.css";
import { CommercialDocs } from "./CommercialDocs";

// Documents page for every account: one folder per operation (shipment, 3-stage order or
// equipment order), a checklist of required and requested documents, one-tap upload per row,
// document requests between the people working on the operation, and the owner's "send request"
// which only opens when every required document is uploaded.

const kindLabel = (t, kind, title) =>
  title || t({ origin: "originDoc", customs: "customsDoc" }[kind] || "docKind_" + kind);
const MAX = 2000000;
const TYPES = ["application/pdf", "image/png", "image/jpeg"];

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ content: r.result.split(",")[1], filename: file.name, mime: file.type });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// All operations this account works on, newest first.
function filesFor(data, user) {
  const admin = user.role === "admin";
  const byId = Object.fromEntries(data.shipments.map((s) => [s.id, s]));
  const files = new Map();
  for (const s of data.shipments) {
    const mine = admin ? !s.parentId : s.ownerId === user.id || s.carrierId === user.id;
    if (!mine) continue;
    const rootId = s.parentId || s.id;
    if (files.has(rootId)) continue;
    const root = byId[rootId] || s;
    const legs = data.shipments.filter((x) => x.parentId === rootId);
    files.set(rootId, {
      id: rootId,
      type: "shipment",
      title: root.title || s.title,
      route: `${root.origin || s.origin} → ${root.destination || s.destination}`,
      status: root.status || s.status,
      submittedAt: root.submittedAt,
      createdAt: root.createdAt || s.createdAt || "",
      ownerId: root.ownerId || s.ownerId,
      parties: [
        root.ownerId || s.ownerId,
        root.carrierId,
        s.carrierId,
        ...legs.map((l) => l.carrierId),
      ].filter(Boolean),
      uploadTo: s.parentId && s.carrierId === user.id ? s.id : rootId,
      root: byId[rootId] || null,
      hasCommercialDocs: !!(byId[rootId]?.commercialDocs || s.hasCommercialDocs),
    });
  }
  for (const o of data.orders || []) {
    const product = (data.products || []).find((p) => p.id === o.productId);
    const supplierId = product?.supplierId;
    if (!admin && ![o.userId, supplierId].includes(user.id)) continue;
    files.set(o.id, {
      id: o.id,
      type: "order",
      title: product?.title || o.id,
      route: `${o.quantity || ""} × ${product?.title || ""}`,
      status: o.status,
      createdAt: o.createdAt || "",
      ownerId: o.userId,
      supplierId,
      parties: [o.userId, supplierId].filter(Boolean),
    });
  }
  return [...files.values()]
    .map((f) => {
      const docs = data.shipmentDocuments.filter((d) => (d.fileId || d.shipmentId || d.orderId) === f.id);
      const requests = (data.documentRequests || []).filter((r) => (r.shipmentId || r.orderId) === f.id);
      const items = checklist({ ...f, docs, requests });
      return {
        ...f,
        docs,
        requests,
        items,
        done: items.filter((i) => i.done).length,
        mine: missingFor(items, user.id),
      };
    })
    .sort((a, b) => b.mine.length - a.mine.length || String(b.createdAt).localeCompare(a.createdAt));
}

// Count of documents asked from this account (sidebar badge).
export function pendingDocumentsCount(data, user) {
  if (!data?.shipments || user.role === "admin") return 0;
  return filesFor(data, user).reduce((n, f) => n + f.mine.length, 0);
}

function UploadButton({ t, onFiles, busy, label, primary }) {
  const ref = useRef(null);
  return (
    <>
      <button
        type="button"
        className={`button small-button ${primary ? "" : "ghost"}`}
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        ⇧ {label || t("uploadDocument")}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        multiple
        accept="application/pdf,image/png,image/jpeg"
        onChange={(e) => {
          const list = [...e.target.files];
          e.target.value = "";
          if (list.length) onFiles(list);
        }}
      />
    </>
  );
}

function DocLine({ d, t, user, name, run, busy, lang }) {
  return (
    <li className="doc-line">
      <span className="doc-icon">{d.mime === "application/pdf" ? "PDF" : "IMG"}</span>
      <span className="doc-name">
        <b dir="auto">{d.filename}</b>
        <small>
          {name(d.userId)} · {new Date(d.createdAt).toLocaleDateString(lang)}
        </small>
        {d.views?.length > 0 && (
          <small
            className="doc-views"
            title={d.views
              .slice(-10)
              .map((v) => `${name(v.userId)} · ${new Date(v.at).toLocaleString(lang)}`)
              .join("\n")}
          >
            👁 {t("docViewedBy")} {d.views.length} {t("docViewsTimes")} · {name(d.views.at(-1).userId)}
          </small>
        )}
      </span>
      <a
        className="text-button"
        href={`/api/shipment-documents/${d.id}?view=1`}
        target="_blank"
        rel="noopener"
      >
        {t("view")}
      </a>
      <a className="text-button" href={`/api/shipment-documents/${d.id}`}>
        {t("download")}
      </a>
      {d.userId === user.id && !String(d.kind).startsWith("photo_") && (
        <button
          type="button"
          className="text-button danger-text"
          disabled={busy}
          onClick={() =>
            window.confirm(t("deleteDocumentConfirm")) &&
            run(`/shipment-documents/${d.id}`, {}, "DELETE", { success: "documentDeleted" })
          }
        >
          {t("delete")}
        </button>
      )}
    </li>
  );
}

function RequestForm({ file, t, user, name, run, busy }) {
  const others = [...new Set(file.parties)].filter((p) => p !== user.id);
  const [kinds, setKinds] = useState([]);
  if (!others.length) return <p className="muted small">{t("requestNoParties")}</p>;
  const toggle = (k) => setKinds((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  return (
    <form
      className="doc-request-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!kinds.length) return;
        const form = e.currentTarget;
        const f = new FormData(form);
        await run(
          "/document-requests",
          {
            ...(file.type === "order" ? { orderId: file.id } : { shipmentId: file.id }),
            kinds,
            title: f.get("title") || "",
            note: f.get("note") || "",
            from: f.get("from"),
          },
          "POST",
          { success: "documentRequested" },
        );
        form.reset();
        setKinds([]);
      }}
    >
      <fieldset className="wide doc-options">
        <legend>
          <small>{t("chooseDocuments")}</small>
        </legend>
        {requestableKinds.map((k) => (
          <label key={k} className={`doc-option ${kinds.includes(k) ? "on" : ""}`}>
            <input type="checkbox" checked={kinds.includes(k)} onChange={() => toggle(k)} />
            {kindLabel(t, k)}
          </label>
        ))}
      </fieldset>
      {kinds.includes("other") && (
        <label>
          <small>{t("documentNameRequired")}</small>
          <input name="title" maxLength={120} required placeholder={t("documentNameExample")} />
        </label>
      )}
      <label>
        <small>{t("requestFrom")}</small>
        <select name="from" defaultValue={file.ownerId !== user.id ? file.ownerId : others[0]}>
          {others.map((p) => (
            <option key={p} value={p}>
              {name(p)}
              {p === file.ownerId ? ` (${t("shipmentOwner")})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="wide">
        <small>{t("requestNote")}</small>
        <input name="note" maxLength={300} placeholder={t("requestNoteExample")} />
      </label>
      <button className="button" disabled={busy || !kinds.length}>
        {t("requestDocument")}
        {kinds.length > 1 ? ` (${kinds.length})` : ""}
      </button>
    </form>
  );
}

function FileView({ file, data, user, t, run, busy, lang, setError }) {
  const name = (id) =>
    id === user.id ? t("you") : data.users.find((u) => u.id === id)?.name || t("platformAdmin");
  const [uploading, setUploading] = useState("");
  const [extraKind, setExtraKind] = useState("other");
  const [dragKey, setDragKey] = useState("");
  const isOwner = file.ownerId === user.id;
  const party = file.parties.includes(user.id);
  async function upload(list, kind, requestId, key) {
    setError("");
    for (const f of list) {
      if (!TYPES.includes(f.type) || f.size > MAX) {
        setError(`${f.name}: ${t("invalidFile")}`);
        continue;
      }
      setUploading(key);
      try {
        const body = await readFile(f);
        await run(
          "/shipment-documents",
          {
            ...(file.type === "order" ? { orderId: file.id } : { shipmentId: file.uploadTo || file.id }),
            kind,
            ...(requestId ? { requestId } : {}),
            ...body,
          },
          "POST",
          { success: "documentUploaded" },
        );
      } catch {
        /* the toast already shows the error */
      }
    }
    setUploading("");
  }
  const drop = (key, kind, requestId) => ({
    onDragOver: (e) => {
      if (!party) return;
      e.preventDefault();
      setDragKey(key);
    },
    onDragLeave: () => setDragKey(""),
    onDrop: (e) => {
      if (!party) return;
      e.preventDefault();
      setDragKey("");
      upload([...e.dataTransfer.files], kind, requestId, key);
    },
  });
  const inChecklist = new Set(file.items.flatMap((i) => i.docs.map((d) => d.id)));
  const extra = file.docs.filter((d) => !inChecklist.has(d.id) && !String(d.kind).startsWith("photo_"));
  const photos = file.docs.filter((d) => String(d.kind).startsWith("photo_"));
  const ownerMissing = missingFor(file.items, file.ownerId);
  const pct = file.items.length ? Math.round((file.done / file.items.length) * 100) : 100;
  return (
    <section className="panel doc-file">
      <header className="doc-file-head">
        <div>
          <small className="muted">{t(file.type === "order" ? "equipmentOrder" : "shipment")}</small>
          <h2 dir="auto">{file.title}</h2>
          <p className="muted" dir="auto">
            {file.route}
          </p>
        </div>
        <span className={`badge ${file.status}`}>{t(file.status)}</span>
      </header>
      <div className="doc-progress" aria-label={t("documentsProgress")} hidden={!file.items.length}>
        <div>
          <span style={{ width: pct + "%" }} />
        </div>
        <b>
          {file.done}/{file.items.length}
        </b>
        <small>{t("documentsComplete")}</small>
      </div>

      <h3>{t("requiredDocuments")}</h3>
      {!file.items.length && <p className="muted small doc-none">{t("noRequiredDocuments")}</p>}
      <ul className="doc-checklist">
        {file.items.map((i) => {
          const mineToUpload = i.from === user.id && !i.done;
          return (
            <li
              key={i.key}
              className={`doc-item ${i.done ? "done" : mineToUpload ? "todo-mine" : "todo"} ${dragKey === i.key ? "drag" : ""}`}
              {...drop(i.key, i.kind, i.requestId)}
            >
              <div className="doc-item-head">
                <span className="doc-state" aria-hidden="true">
                  {i.done ? "✓" : "!"}
                </span>
                <div className="doc-item-text">
                  <b dir="auto">{kindLabel(t, i.kind, i.title)}</b>
                  <small>
                    {i.done ? t("docUploaded") : t("docMissing")} · {t("toUploadBy")}: {name(i.from)}
                    {i.requestId
                      ? ` · ${t("requestedBy")} ${name(i.requestedBy)}`
                      : ` · ${t("alwaysRequired")}`}
                  </small>
                  {i.note && (
                    <small className="doc-note" dir="auto">
                      “{i.note}”
                    </small>
                  )}
                </div>
                <div className="doc-item-actions">
                  {party && (
                    <UploadButton
                      t={t}
                      busy={busy || !!uploading}
                      primary={mineToUpload}
                      label={
                        uploading === i.key ? t("uploading") : i.done ? t("addFile") : t("uploadDocument")
                      }
                      onFiles={(list) => upload(list, i.kind, i.requestId, i.key)}
                    />
                  )}
                  {i.requestId && !i.done && i.requestedBy === user.id && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => run(`/document-requests/${i.requestId}/cancel`, {}, "POST")}
                    >
                      {t("cancelRequest")}
                    </button>
                  )}
                </div>
              </div>
              {i.docs.length > 0 && (
                <ul className="doc-lines">
                  {i.docs.map((d) => (
                    <DocLine
                      key={d.id}
                      d={d}
                      t={t}
                      user={user}
                      name={name}
                      run={run}
                      busy={busy}
                      lang={lang}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {party && <p className="muted small">{t("dropHint")}</p>}

      {file.type === "shipment" && isOwner && (
        <div className={`doc-send ${file.submittedAt ? "sent" : ownerMissing.length ? "blocked" : "ready"}`}>
          {file.submittedAt ? (
            <b>✓ {t("requestComplete")}</b>
          ) : ownerMissing.length ? (
            <>
              <b>{t("sendBlocked")}</b>
              <small>{ownerMissing.map((i) => kindLabel(t, i.kind, i.title)).join("، ")}</small>
              <button className="button" disabled>
                {t("finishRequest")}
              </button>
            </>
          ) : (
            <>
              <b>{t("sendReady")}</b>
              <button
                className="button"
                disabled={busy}
                onClick={() => run("/shipments/" + file.id + "/submit", {})}
              >
                {t("finishRequest")}
              </button>
            </>
          )}
        </div>
      )}

      {file.type === "shipment" && (
        <CommercialDocs file={file} user={user} t={t} run={run} busy={busy} isOwner={isOwner} />
      )}

      {(party || user.role === "admin") && (
        <details className="doc-box" open={file.requests.length === 0 && !isOwner}>
          <summary>＋ {t("requestDocumentTitle")}</summary>
          <p className="muted small">{t("requestDocumentIntro")}</p>
          <RequestForm file={file} t={t} user={user} name={name} run={run} busy={busy} />
        </details>
      )}

      <h3>{t("otherDocuments")}</h3>
      {party && (
        <div
          className={`doc-extra-upload ${dragKey === "extra" ? "drag" : ""}`}
          {...drop("extra", extraKind)}
        >
          <small>{t("pickDocumentType")}</small>
          <div className="doc-options" role="radiogroup" aria-label={t("documentKind")}>
            {requestableKinds.map((k) => (
              <label key={k} className={`doc-option ${extraKind === k ? "on" : ""}`}>
                <input
                  type="radio"
                  name="extraKind"
                  checked={extraKind === k}
                  onChange={() => setExtraKind(k)}
                />
                {kindLabel(t, k)}
              </label>
            ))}
          </div>
          <UploadButton
            t={t}
            primary
            busy={busy || !!uploading}
            label={
              uploading === "extra" ? t("uploading") : `${t("uploadDocument")}: ${kindLabel(t, extraKind)}`
            }
            onFiles={(list) => upload(list, extraKind, null, "extra")}
          />
        </div>
      )}
      {extra.length ? (
        <ul className="doc-lines">
          {extra.map((d) => (
            <li key={d.id} className="doc-extra-line">
              <small className="doc-kind-chip">{kindLabel(t, d.kind)}</small>
              <ul className="doc-lines">
                <DocLine d={d} t={t} user={user} name={name} run={run} busy={busy} lang={lang} />
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{t("noOtherDocuments")}</p>
      )}

      {photos.length > 0 && (
        <>
          <h3>{t("stagePhotos")}</h3>
          <ul className="doc-lines">
            {photos.map((d) => (
              <DocLine key={d.id} d={d} t={t} user={user} name={name} run={run} busy={busy} lang={lang} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function DocumentCenter({ data, user, t, run, busy, navigate, lang }) {
  const files = useMemo(() => filesFor(data, user), [data, user]);
  const wanted = new URLSearchParams(window.location.search).get("id");
  const [selected, setSelected] = useState(
    () => files.find((f) => f.id === wanted || f.uploadTo === wanted)?.id || files[0]?.id || "",
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const shown = files.filter(
    (f) =>
      (filter === "all" ||
        (filter === "mine" && f.mine.length) ||
        (filter === "missing" && f.done < f.items.length) ||
        (filter === "complete" && f.done === f.items.length)) &&
      (!query || `${f.title} ${f.route}`.toLowerCase().includes(query.toLowerCase())),
  );
  const file = files.find((f) => f.id === selected) || shown[0];
  const mineTotal = files.reduce((n, f) => n + f.mine.length, 0);
  // Light protection: no right-click menu, dragging or text selection on this page, and nothing
  // of it is printed. Files opened from here carry a watermark with the viewer's name (server side).
  const block = (e) => e.preventDefault();
  return (
    <>
      <div className="print-blocked">{t("printBlocked")}</div>
      <div className="protected-docs" onContextMenu={block} onDragStart={block} onCopy={block}>
        <div className="section-heading">
          <div>
            <h1>{t("uploadDocuments")}</h1>
            <p>{t("documentsIntroNew")}</p>
            <p className="doc-protect-note">🔒 {t("docWatermarkNote")}</p>
          </div>
          <button className="button ghost" onClick={() => navigate("kyb")}>
            {t(
              user.role === "admin"
                ? "identityApplications"
                : user.accountType === "individual"
                  ? "passportUpload"
                  : "registryUpload",
            )}{" "}
            ↗
          </button>
        </div>
        <p className="muted small doc-review-note">
          🛡 {t(user.role === "admin" ? "adminDocsReviewNote" : "docsReviewNote")}
        </p>
        {mineTotal > 0 && (
          <p className="notice doc-alert" role="status">
            📎 {t("documentsAskedFromYou").replace("{n}", mineTotal)}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {!files.length ? (
          <section className="panel doc-empty">
            <p>{t(user.role === "supplier" ? "noOrdersForDocuments" : "createShipmentBeforeUpload")}</p>
            {["merchant"].includes(user.role) && (
              <button className="button" type="button" onClick={() => navigate("newShipment")}>
                {t("enterShipment")}
              </button>
            )}
          </section>
        ) : (
          <div className="doc-layout">
            <aside className="panel doc-files">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchShipments")}
                aria-label={t("searchShipments")}
              />
              <div className="chip-tabs">
                {["all", "mine", "missing", "complete"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={filter === k ? "active" : ""}
                    onClick={() => setFilter(k)}
                  >
                    {t("docFilter_" + k)}
                  </button>
                ))}
              </div>
              <ul>
                {shown.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`doc-file-item ${file?.id === f.id ? "active" : ""}`}
                      onClick={() => {
                        setSelected(f.id);
                        setError("");
                        if (window.innerWidth < 900)
                          setTimeout(
                            () => document.querySelector(".doc-file")?.scrollIntoView({ behavior: "smooth" }),
                            50,
                          );
                      }}
                    >
                      <b dir="auto">{f.title}</b>
                      <small dir="auto">{f.route}</small>
                      <span className="doc-file-meta">
                        <span className={`doc-count ${f.done === f.items.length ? "ok" : ""}`}>
                          📎 {f.done}/{f.items.length}
                        </span>
                        {f.mine.length > 0 && (
                          <span className="doc-mine">{t("needsYou").replace("{n}", f.mine.length)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {!shown.length && <li className="muted small">{t("notesNoMatch")}</li>}
              </ul>
            </aside>
            {file && (
              <FileView
                key={file.id}
                file={file}
                data={data}
                user={user}
                t={t}
                run={run}
                busy={busy}
                lang={lang}
                setError={setError}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
