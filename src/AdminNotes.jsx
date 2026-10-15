import React, { useEffect, useMemo, useState } from "react";
import "./admin-notes.css";

// Private notes for the administrator: to-dos, reminders and notes about company accounts.
// Stored on the server (shared between registered administrators), never shown to other accounts.

async function call(path, body, method = "POST") {
  const r = await fetch("/api/admin/notes" + path, {
    method: body === undefined ? "GET" : method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "");
  return data;
}

const today = () => new Date().toISOString().slice(0, 10);
const COLORS = ["", "yellow", "red", "green", "blue"];

function useNotes() {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    call("")
      .then((d) => setNotes(d.notes || []))
      .catch(() => setError("accountAccessRestricted"));
  useEffect(() => {
    load();
  }, []);
  const act = async (fn) => {
    setError("");
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e.message ? "err_" + e.message : "err_Unexpected server error");
      return false;
    }
  };
  return { notes, error, act };
}

function dueState(due, done) {
  if (!due || done) return "";
  if (due < today()) return "overdue";
  if (due === today()) return "today";
  return "later";
}

const order = (a, b) =>
  a.done - b.done ||
  b.pinned - a.pinned ||
  (a.due && !a.done ? a.due : "9999").localeCompare(b.due && !b.done ? b.due : "9999") ||
  b.createdAt.localeCompare(a.createdAt);

function fmtDate(d, lang) {
  return new Date(d + "T12:00:00").toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NoteForm({ t, accounts, initial = {}, fixedAccount, onSave, onCancel, busy }) {
  const [text, setText] = useState(initial.text || "");
  const [accountId, setAccountId] = useState(fixedAccount || initial.accountId || "");
  const [due, setDue] = useState(initial.due || "");
  const [color, setColor] = useState(initial.color || "");
  const [pinned, setPinned] = useState(!!initial.pinned);
  return (
    <form
      className="note-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const ok = await onSave({ text, accountId, due, color, pinned });
        if (ok && !initial.id) {
          setText("");
          setDue("");
          setColor("");
          setPinned(false);
          if (!fixedAccount) setAccountId("");
        }
      }}
    >
      <textarea
        rows={initial.id ? 4 : 3}
        maxLength={4000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("notePlaceholder")}
        aria-label={t("noteText")}
        required
      />
      <div className="note-form-row">
        {!fixedAccount && (
          <label>
            <small>{t("noteAccount")}</small>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t("noteNoAccount")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <small>{t("noteDue")}</small>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <div className="note-colors" role="radiogroup" aria-label={t("noteColor")}>
          {COLORS.map((c) => (
            <button
              key={c || "none"}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={t("noteColor_" + (c || "none"))}
              className={`note-dot c-${c || "none"} ${color === c ? "on" : ""}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <label className="note-pin">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />{" "}
          {t("notePin")}
        </label>
      </div>
      <div className="actions">
        <button className="button" disabled={busy || !text.trim()}>
          {t(initial.id ? "save" : "addNote")}
        </button>
        {onCancel && (
          <button type="button" className="button ghost" onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function NoteCard({ n, t, lang, accounts, act, busy, showAccount = true, onOpenAccount }) {
  const [editing, setEditing] = useState(false);
  const due = dueState(n.due, n.done);
  if (editing)
    return (
      <li className={`note-card c-${n.color || "none"}`}>
        <NoteForm
          t={t}
          accounts={accounts}
          initial={n}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            const ok = await act(() => call("/" + n.id, body, "PUT"));
            if (ok) setEditing(false);
            return ok;
          }}
        />
      </li>
    );
  return (
    <li className={`note-card c-${n.color || "none"} ${n.done ? "done" : ""} ${due}`}>
      <div className="note-top">
        <label className="note-check">
          <input
            type="checkbox"
            checked={n.done}
            onChange={(e) => act(() => call("/" + n.id, { done: e.target.checked }, "PUT"))}
            aria-label={t(n.done ? "noteReopen" : "noteDone")}
          />
        </label>
        <p className="note-text" dir="auto">
          {n.text}
        </p>
        {n.pinned && (
          <span className="note-pinned" title={t("notePinned")}>
            📌
          </span>
        )}
      </div>
      <div className="note-meta">
        {showAccount && n.accountId && (
          <button type="button" className="note-account" onClick={() => onOpenAccount?.(n.accountId)}>
            🏢 {n.accountName || t("noteDeletedAccount")}
          </button>
        )}
        {n.due && (
          <span className={`note-due ${due}`}>
            📅 {fmtDate(n.due, lang)}
            {due === "overdue" ? ` · ${t("noteOverdue")}` : due === "today" ? ` · ${t("noteToday")}` : ""}
          </span>
        )}
        <small className="muted">
          {new Date(n.updatedAt || n.createdAt).toLocaleString(lang, {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {n.authorName ? ` · ${n.authorName}` : ""}
        </small>
        <span className="note-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => act(() => call("/" + n.id, { pinned: !n.pinned }, "PUT"))}
          >
            {t(n.pinned ? "noteUnpin" : "notePin")}
          </button>
          <button type="button" className="text-button" onClick={() => setEditing(true)}>
            {t("edit")}
          </button>
          <button
            type="button"
            className="text-button danger-text"
            onClick={() =>
              window.confirm(t("noteDeleteConfirm")) && act(() => call("/" + n.id, {}, "DELETE"))
            }
          >
            {t("delete")}
          </button>
        </span>
      </div>
    </li>
  );
}

function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    fetch("/api/admin/accounts")
      .then((r) => (r.ok ? r.json() : []))
      .then((v) => {
        const list = Array.isArray(v) ? v : v.accounts || [];
        setAccounts(
          list
            .filter((a) => a.role !== "admin" && !a.demo)
            .sort((a, b) => String(a.name).localeCompare(String(b.name))),
        );
      })
      .catch(() => {});
  }, []);
  return accounts;
}

// Workspace section "My notes".
export function AdminNotes({ t, lang, navigate }) {
  const { notes, error, act } = useNotes();
  const accounts = useAccounts();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("");
  const wrap = async (fn) => {
    setBusy(true);
    const ok = await act(fn);
    setBusy(false);
    return ok;
  };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes || [])
      .filter((n) =>
        filter === "open"
          ? !n.done
          : filter === "done"
            ? n.done
            : filter === "due"
              ? !n.done && n.due && n.due <= today()
              : filter === "accounts"
                ? !!n.accountId
                : true,
      )
      .filter((n) => !account || n.accountId === account)
      .filter((n) => !q || `${n.text} ${n.accountName}`.toLowerCase().includes(q))
      .sort(order);
  }, [notes, filter, query, account]);
  const count = (f) =>
    (notes || []).filter((n) =>
      f === "open"
        ? !n.done
        : f === "done"
          ? n.done
          : f === "due"
            ? !n.done && n.due && n.due <= today()
            : !!n.accountId,
    ).length;
  return (
    <section className="admin-notes">
      <div className="section-heading">
        <div>
          <h2>{t("notes")}</h2>
          <p>{t("notesIntro")}</p>
        </div>
      </div>
      <div className="panel">
        <NoteForm t={t} accounts={accounts} busy={busy} onSave={(body) => wrap(() => call("", body))} />
      </div>
      {error && (
        <p className="notice error" role="alert">
          {t(error) === error ? t("err_Unexpected server error") : t(error)}
        </p>
      )}
      <div className="note-filters">
        <div className="chip-tabs" role="tablist">
          {["open", "due", "accounts", "done", "all"].map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {t("notesFilter_" + f)}
              {f !== "all" && notes ? ` (${count(f)})` : ""}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder={t("searchNotes")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("searchNotes")}
        />
        <select value={account} onChange={(e) => setAccount(e.target.value)} aria-label={t("noteAccount")}>
          <option value="">{t("allAccounts")}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {notes === null ? (
        <p className="muted">{t("loading")}</p>
      ) : shown.length ? (
        <ul className="note-list">
          {shown.map((n) => (
            <NoteCard
              key={n.id}
              n={n}
              t={t}
              lang={lang}
              accounts={accounts}
              act={wrap}
              busy={busy}
              onOpenAccount={() => setAccount(n.accountId)}
            />
          ))}
        </ul>
      ) : (
        <p className="muted empty-notes">{t(notes.length ? "notesNoMatch" : "notesEmpty")}</p>
      )}
    </section>
  );
}

// Inside an account's details (admin): the notes about this company, with a quick add.
export function AccountNotes({ accountId, t, lang }) {
  const { notes, error, act } = useNotes();
  const [busy, setBusy] = useState(false);
  const wrap = async (fn) => {
    setBusy(true);
    const ok = await act(fn);
    setBusy(false);
    return ok;
  };
  if (notes === null) return null;
  const mine = notes.filter((n) => n.accountId === accountId).sort(order);
  return (
    <div className="account-notes">
      <h4>
        ✎ {t("accountNotes")} {mine.length ? `(${mine.length})` : ""}
      </h4>
      {error && (
        <p className="notice error">{t(error) === error ? t("err_Unexpected server error") : t(error)}</p>
      )}
      {mine.length > 0 && (
        <ul className="note-list compact">
          {mine.map((n) => (
            <NoteCard
              key={n.id}
              n={n}
              t={t}
              lang={lang}
              accounts={[]}
              act={wrap}
              busy={busy}
              showAccount={false}
            />
          ))}
        </ul>
      )}
      <NoteForm
        t={t}
        accounts={[]}
        fixedAccount={accountId}
        busy={busy}
        onSave={(body) => wrap(() => call("", body))}
      />
    </div>
  );
}

// Admin dashboard: notes due today or overdue.
export function NotesDueCard({ t, lang, navigate }) {
  const { notes } = useNotes();
  if (!notes) return null;
  const due = notes.filter((n) => !n.done && n.due && n.due <= today()).sort(order);
  const pinned = notes.filter((n) => !n.done && n.pinned && !(n.due && n.due <= today()));
  const list = [...due, ...pinned].slice(0, 5);
  if (!list.length) return null;
  return (
    <section className="panel notes-due-card">
      <div className="section-heading">
        <h3>✎ {t("notesDueTitle")}</h3>
        <button type="button" className="text-button" onClick={() => navigate("notes")}>
          {t("allNotes")} ↗
        </button>
      </div>
      <ul>
        {list.map((n) => {
          const d = dueState(n.due, n.done);
          return (
            <li key={n.id} className={d}>
              <span dir="auto">{n.text.length > 120 ? n.text.slice(0, 120) + "…" : n.text}</span>
              <small>
                {n.accountName ? `🏢 ${n.accountName} · ` : ""}
                {n.due ? fmtDate(n.due, lang) : "📌"}
                {d === "overdue" ? ` · ${t("noteOverdue")}` : d === "today" ? ` · ${t("noteToday")}` : ""}
              </small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
