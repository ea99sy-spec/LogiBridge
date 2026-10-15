import { readState, mutate, id } from "./store.js";

// Private notes for the platform administrators: reminders, to-dos and notes about accounts.
// Only registered (non-demo) administrators can read or write them; they never reach
// /state or any other account.
const clean = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const validDate = (v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));

function fields(b, s) {
  const out = {};
  if ("text" in b) {
    out.text = clean(b.text, 4000);
    if (!out.text) throw new Error("Note text required");
  }
  if ("accountId" in b) {
    out.accountId = clean(b.accountId, 80);
    if (out.accountId && !s.users.some((u) => u.id === out.accountId && !u.demo && u.role !== "admin"))
      throw new Error("Account unavailable");
  }
  if ("due" in b) {
    out.due = clean(b.due, 10);
    if (!validDate(out.due)) throw new Error("Invalid request");
  }
  for (const k of ["done", "pinned"])
    if (k in b) {
      if (typeof b[k] !== "boolean") throw new Error("Invalid request");
      out[k] = b[k];
    }
  if ("color" in b) {
    out.color = ["", "yellow", "red", "green", "blue"].includes(b.color) ? b.color : "";
  }
  return out;
}

export function noteRoutes(app) {
  const realAdmin = (req, res) => {
    if (req.user?.role === "admin" && !req.user.demo) return true;
    res.status(403).json({ error: "A registered administrator is required" });
    return false;
  };
  app.get("/api/admin/notes", (req, res) => {
    if (!realAdmin(req, res)) return;
    const s = readState();
    const names = Object.fromEntries(s.users.map((u) => [u.id, u.name]));
    res.json({
      notes: (s.adminNotes || []).map((n) => ({
        ...n,
        accountName: n.accountId ? names[n.accountId] || "" : "",
        authorName: names[n.authorId] || "",
      })),
    });
  });
  app.post("/api/admin/notes", async (req, res) => {
    if (!realAdmin(req, res)) return;
    let note;
    await mutate((s) => {
      const f = fields({ text: "", ...req.body }, s);
      s.adminNotes ||= [];
      if (s.adminNotes.length >= 2000) throw new Error("Too many notes");
      const now = new Date().toISOString();
      note = {
        id: id(),
        text: f.text,
        accountId: f.accountId || "",
        due: f.due || "",
        color: f.color || "",
        pinned: !!f.pinned,
        done: false,
        authorId: req.user.id,
        createdAt: now,
        updatedAt: now,
      };
      s.adminNotes.unshift(note);
    });
    res.json({ ok: true, note });
  });
  app.put("/api/admin/notes/:id", async (req, res) => {
    if (!realAdmin(req, res)) return;
    await mutate((s) => {
      const n = (s.adminNotes || []).find((x) => x.id === req.params.id);
      if (!n) throw new Error("Note not found");
      Object.assign(n, fields(req.body, s), { updatedAt: new Date().toISOString() });
    });
    res.json({ ok: true });
  });
  app.delete("/api/admin/notes/:id", async (req, res) => {
    if (!realAdmin(req, res)) return;
    await mutate((s) => {
      const before = (s.adminNotes || []).length;
      s.adminNotes = (s.adminNotes || []).filter((x) => x.id !== req.params.id);
      if (s.adminNotes.length === before) throw new Error("Note not found");
    });
    res.json({ ok: true });
  });
}
