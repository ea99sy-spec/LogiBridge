import { readState, mutate, id } from "./store.js";
import { notice } from "./advanced.js";
import { queueAdminEmail } from "./email.js";

// Ratings of the platform, complaints and suggestions from every account, answered by the
// administration. Each account sees only its own; demo and registered accounts stay apart.
export const feedbackTypes = ["rating", "complaint", "suggestion"];
export const feedbackStatuses = ["new", "in_progress", "resolved", "closed"];
const text = (v, max) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

export function feedbackRoutes(app) {
  app.get("/api/feedback", (req, res) => {
    const s = readState();
    res.json({ items: (s.feedback || []).filter((f) => f.userId === req.user.id).reverse() });
  });
  app.post("/api/feedback", async (req, res) => {
    const b = req.body;
    if (req.user.role === "admin") throw new Error("Invalid request");
    if (!feedbackTypes.includes(b.type)) throw new Error("Invalid request");
    const message = text(b.message, 3000);
    const stars = Number(b.stars);
    if (b.type === "rating" && !(Number.isInteger(stars) && stars >= 1 && stars <= 5))
      throw new Error("Choose a rating from 1 to 5 stars");
    if (b.type !== "rating" && message.length < 5) throw new Error("Write a few words");
    await mutate((s) => {
      s.feedback ||= [];
      const recent = s.feedback.filter(
        (f) => f.userId === req.user.id && Date.now() - Date.parse(f.createdAt) < 86400000,
      );
      if (recent.length >= 10) throw new Error("Too many messages today, please try tomorrow");
      let shipmentId = "";
      if (b.shipmentId) {
        const sh = s.shipments.find((x) => x.id === b.shipmentId);
        if (!sh || ![sh.ownerId, sh.carrierId].includes(req.user.id)) throw new Error("Shipment unavailable");
        shipmentId = sh.id;
      }
      let aboutId = "";
      if (b.aboutId) {
        const other = s.users.find((u) => u.id === b.aboutId && u.role !== "admin");
        if (!other || !!other.demo !== !!req.user.demo || other.id === req.user.id)
          throw new Error("Account unavailable");
        aboutId = other.id;
      }
      const item = {
        id: id(),
        userId: req.user.id,
        demo: !!req.user.demo,
        type: b.type,
        stars: b.type === "rating" ? stars : null,
        subject: text(b.subject, 140),
        message,
        shipmentId,
        aboutId,
        status: "new",
        createdAt: new Date().toISOString(),
        replies: [],
      };
      s.feedback.push(item);
      for (const a of s.users.filter((u) => u.role === "admin" && !!u.demo === !!req.user.demo))
        notice(s, a.id, "feedback_new", undefined, item.subject || item.type);
      if (!req.user.demo)
        queueAdminEmail(
          s,
          "feedback_new",
          {
            النوع: { rating: "تقييم", complaint: "شكوى", suggestion: "اقتراح" }[item.type],
            الحساب: req.user.name,
            ...(item.stars ? { التقييم: "★".repeat(item.stars) } : {}),
            الموضوع: item.subject || "—",
          },
          "feedback/" + item.id,
        );
    });
    res.status(201).json({ ok: true });
  });

  const admin = (req, res) => {
    if (req.user.role === "admin") return true;
    res.status(403).json({ error: "Forbidden" });
    return false;
  };
  app.get("/api/admin/feedback", (req, res) => {
    if (!admin(req, res)) return;
    const s = readState();
    const name = (uid) => s.users.find((u) => u.id === uid)?.name || "";
    const kind = (uid) => {
      const u = s.users.find((x) => x.id === uid);
      return u ? (u.accountType === "individual" ? "individual" : u.role) : "";
    };
    res.json({
      items: (s.feedback || [])
        .filter((f) => !!f.demo === !!req.user.demo)
        .map((f) => ({
          ...f,
          userName: name(f.userId),
          userKind: kind(f.userId),
          aboutName: f.aboutId ? name(f.aboutId) : "",
          shipmentTitle: f.shipmentId ? s.shipments.find((x) => x.id === f.shipmentId)?.title || "" : "",
        }))
        .reverse(),
    });
  });
  app.post("/api/admin/feedback/:id", async (req, res) => {
    if (!admin(req, res)) return;
    const b = req.body;
    if (b.status && !feedbackStatuses.includes(b.status)) throw new Error("Invalid request");
    const reply = text(b.reply, 2000);
    await mutate((s) => {
      const f = (s.feedback || []).find((x) => x.id === req.params.id && !!x.demo === !!req.user.demo);
      if (!f) throw new Error("Message unavailable");
      if (b.status) f.status = b.status;
      if (reply) {
        f.replies.push({ by: req.user.id, text: reply, at: new Date().toISOString() });
        if (f.status === "new") f.status = "in_progress";
      }
      f.updatedAt = new Date().toISOString();
      if (reply || b.status) notice(s, f.userId, "feedback_replied", undefined, reply || "");
    });
    res.json({ ok: true });
  });
}
