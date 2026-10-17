import { readState } from "./store.js";
import { subscriptionOf } from "../shared/subscription.js";
import { countryName } from "../shared/countries.js";
import { crossings } from "../shared/crossings.js";

// Accounts report for the administrator: who joined, what they offer and how much they use the
// platform. Registered (non-demo) accounts only. Shown as a table and downloadable as Excel.

const L = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));
const words = {
  merchant: ["تاجر / شركة استيراد وتصدير", "Trader / import-export", "Tüccar / ithalat-ihracat"],
  carrier: ["شركة نقل", "Carrier", "Nakliye firması"],
  broker: ["مخلّص جمركي", "Customs broker", "Gümrük müşaviri"],
  supplier: ["مورّد معدات", "Equipment supplier", "Ekipman tedarikçisi"],
  individual: ["فرد", "Individual", "Bireysel"],
  approved: ["موافق عليه", "Approved", "Onaylı"],
  pending: ["قيد المراجعة", "Under review", "İncelemede"],
  rejected: ["مرفوض", "Rejected", "Reddedildi"],
  not_submitted: ["لم يرسل الوثائق", "No documents yet", "Belge gönderilmedi"],
  disabled: ["موقوف", "Suspended", "Askıda"],
  trial: ["فترة مجانية", "Free period", "Ücretsiz dönem"],
  paid: ["مدفوع", "Paid", "Ücretli"],
  expired: ["منتهي", "Expired", "Süresi doldu"],
  none: ["—", "—", "—"],
  import: ["استيراد", "Import", "İthalat"],
  export: ["تصدير", "Export", "İhracat"],
  both: ["استيراد وتصدير", "Import & export", "İthalat ve ihracat"],
  valid: ["صحيح", "Valid", "Geçerli"],
  invalid: ["غير صحيح", "Invalid", "Geçersiz"],
  format_ok: ["الصيغة صحيحة", "Format OK", "Biçim doğru"],
  fleet: ["الأسطول", "Fleet", "Filo"],
  routes: ["الخطوط", "Routes", "Güzergâhlar"],
  crossingsW: ["المعابر", "Crossings", "Kapılar"],
  warehouse: ["المستودع", "Warehouse", "Depo"],
  trucks: ["شاحنة", "trucks", "araç"],
};
const w = (k, i) => (words[k] ? words[k][i] : k || "");

// Column order and headers (Arabic, English, Turkish).
export const reportColumns = [
  ["name", ["اسم الحساب", "Account name", "Hesap adı"]],
  ["type", ["نوع الحساب", "Account type", "Hesap türü"]],
  ["status", ["حالة التوثيق", "Verification", "Doğrulama"]],
  ["joined", ["تاريخ التسجيل", "Joined", "Kayıt tarihi"]],
  ["approvedAt", ["تاريخ الموافقة", "Approved on", "Onay tarihi"]],
  ["email", ["الإيميل", "Email", "E-posta"]],
  ["phone", ["الهاتف", "Phone", "Telefon"]],
  ["country", ["البلد", "Country", "Ülke"]],
  ["city", ["المدينة", "City", "Şehir"]],
  ["taxId", ["الرقم الضريبي", "Tax number", "Vergi no"]],
  ["taxCheck", ["فحص الرقم الضريبي", "Tax check", "Vergi kontrolü"]],
  ["offers", ["ماذا يقدّم / النشاط", "Offers / activity", "Sunduğu hizmet / faaliyet"]],
  ["about", ["نبذة الملف", "Profile summary", "Profil özeti"]],
  ["subscription", ["الاشتراك", "Subscription", "Abonelik"]],
  ["subscriptionEnds", ["ينتهي في", "Ends on", "Bitiş"]],
  ["logins", ["مرات تسجيل الدخول", "Sign-ins", "Giriş sayısı"]],
  ["activeDays", ["أيام الاستخدام", "Active days", "Aktif gün"]],
  ["lastSeen", ["آخر استخدام", "Last active", "Son kullanım"]],
  ["shipmentsPosted", ["شحنات نشرها", "Shipments posted", "Yayınladığı sevkiyat"]],
  ["jobsTaken", ["عمليات نفّذها (نقل/تخليص)", "Jobs carried out", "Üstlendiği işler"]],
  ["bids", ["عروض قدّمها", "Offers sent", "Verdiği teklif"]],
  ["completed", ["عمليات مكتملة", "Completed", "Tamamlanan"]],
  ["active", ["عمليات جارية", "Under way", "Devam eden"]],
  ["rating", ["التقييم", "Rating", "Puan"]],
  ["reviews", ["عدد التقييمات", "Reviews", "Değerlendirme"]],
  ["termsAccepted", ["الموافقة على الشروط", "Terms accepted", "Koşul onayı"]],
  ["notes", ["ملاحظاتي", "My notes", "Notlarım"]],
];

const day = (iso) => (iso ? String(iso).slice(0, 10) : "");

function offersOf(u, i) {
  const d = u.details || {};
  const parts = [];
  if (d.activity) parts.push(w(d.activity, i));
  if (d.products) parts.push(d.products);
  if (d.fleetSize) parts.push(`${w("fleet", i)}: ${d.fleetSize} ${w("trucks", i)}`);
  if (d.routes) parts.push(`${w("routes", i)}: ${d.routes}`);
  if (d.crossings?.length)
    parts.push(
      `${w("crossingsW", i)}: ${d.crossings.map((c) => crossings[c]?.[i === 2 ? "tr" : "sy"] || c).join("، ")}`,
    );
  if (d.equipment) parts.push(d.equipment);
  if (d.warehouse) parts.push(`${w("warehouse", i)}: ${d.warehouse}`);
  if (u.profile?.services) parts.push(u.profile.services);
  return parts.join(" · ").slice(0, 600);
}

export function accountsReport(s, lang = "ar") {
  const i = L(lang);
  const lng = ["ar", "en", "tr"][i];
  const users = (s.users || []).filter((u) => u.role !== "admin" && !u.demo);
  const approvedOn = {};
  for (const k of s.kyb || [])
    if (k.status === "approved" && k.review?.reviewedAt) approvedOn[k.userId] = k.review.reviewedAt;
  const orders = (s.shipments || []).filter((x) => !x.parentId);
  const legs = s.shipments || [];
  return users
    .map((u) => {
      const kind = u.accountType === "individual" ? "individual" : u.role;
      const sub = subscriptionOf(s, u);
      const scores = (s.ratings || []).filter((r) => r.targetId === u.id).map((r) => r.score);
      const own = orders.filter((x) => x.ownerId === u.id);
      const taken = legs.filter((x) => x.carrierId === u.id);
      const mine = [...own, ...taken];
      return {
        id: u.id,
        kind,
        name: u.name || "",
        type: w(kind, i),
        status: u.disabled ? w("disabled", i) : w(u.verificationStatus || "not_submitted", i),
        statusKey: u.disabled ? "disabled" : u.verificationStatus || "not_submitted",
        joined: day(u.createdAt),
        approvedAt: day(approvedOn[u.id] || (u.verified ? u.subscription?.startedAt : "")),
        email: u.email || "",
        phone: u.details?.phone || "",
        country: u.details?.country ? countryName(u.details.country, lng) : "",
        city: u.details?.city || "",
        taxId: u.taxId || "",
        taxCheck: u.taxCheck?.status ? w(u.taxCheck.status, i) : "",
        offers: offersOf(u, i),
        about: (u.profile?.about || "").slice(0, 400),
        subscription: w(sub.status, i),
        subscriptionEnds: day(sub.endsAt),
        logins: u.loginCount || 0,
        activeDays: u.activeDays || 0,
        lastSeen: day(u.lastSeenAt || u.lastLoginAt),
        shipmentsPosted: own.length,
        jobsTaken: taken.length,
        bids: (s.bids || []).filter((b) => b.carrierId === u.id).length,
        completed: mine.filter((x) => x.status === "delivered").length,
        active: mine.filter((x) => !["delivered", "cancelled", "demo_reserved"].includes(x.status)).length,
        rating: scores.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : "",
        reviews: scores.length,
        termsAccepted: day(u.termsAcceptedAt),
        notes: (s.adminNotes || []).filter((n) => n.accountId === u.id && !n.done).length,
      };
    })
    .sort((a, b) => b.joined.localeCompare(a.joined));
}

const numeric = new Set([
  "logins",
  "activeDays",
  "shipmentsPosted",
  "jobsTaken",
  "bids",
  "completed",
  "active",
  "rating",
  "reviews",
  "notes",
]);
const dates = new Set(["joined", "approvedAt", "subscriptionEnds", "lastSeen", "termsAccepted"]);

export function accountsReportRoutes(app) {
  const realAdmin = (req, res) => {
    if (req.user?.role === "admin" && !req.user.demo) return true;
    res.status(403).json({ error: "A registered administrator is required" });
    return false;
  };
  app.get("/api/admin/accounts-report", async (req, res) => {
    if (!realAdmin(req, res)) return;
    const lang = ["ar", "en", "tr"].includes(req.query.lang) ? req.query.lang : "ar";
    const rows = accountsReport(readState(), lang);
    const i = L(lang);
    if (req.query.format !== "xlsx")
      return res.json({ rows, columns: reportColumns.map(([key, h]) => [key, h[i]]) });
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    book.creator = "LogiBridge";
    book.created = new Date();
    const sheet = book.addWorksheet(["الحسابات", "Accounts", "Hesaplar"][i], {
      views: [{ state: "frozen", ySplit: 1, xSplit: 1, rightToLeft: lang === "ar" }],
    });
    sheet.columns = reportColumns.map(([key, h]) => ({
      header: h[i],
      key,
      width: ["offers", "about"].includes(key) ? 50 : ["name", "email"].includes(key) ? 28 : 16,
    }));
    for (const r of rows) {
      const row = {};
      for (const [key] of reportColumns) {
        const v = r[key];
        row[key] = dates.has(key) && v ? new Date(v + "T12:00:00Z") : v;
      }
      sheet.addRow(row);
    }
    const head = sheet.getRow(1);
    head.font = { bold: true, color: { argb: "FF102A56" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFACC15" } };
    head.alignment = { vertical: "middle", wrapText: true };
    head.height = 30;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: reportColumns.length } };
    reportColumns.forEach(([key], idx) => {
      const col = sheet.getColumn(idx + 1);
      if (dates.has(key)) col.numFmt = "yyyy-mm-dd";
      if (numeric.has(key)) col.alignment = { horizontal: "center" };
      if (["offers", "about"].includes(key)) col.alignment = { wrapText: true, vertical: "top" };
    });

    // Second sheet: totals by account type.
    const sum = book.addWorksheet(["الملخص", "Summary", "Özet"][i], {
      views: [{ rightToLeft: lang === "ar" }],
    });
    const H = [
      ["نوع الحساب", "Account type", "Hesap türü"],
      ["عدد الحسابات", "Accounts", "Hesap"],
      ["موافق عليها", "Approved", "Onaylı"],
      ["قيد المراجعة", "Under review", "İncelemede"],
      ["شحنات منشورة", "Shipments posted", "Yayınlanan sevkiyat"],
      ["عمليات منفّذة", "Jobs carried out", "Üstlenilen iş"],
      ["عمليات مكتملة", "Completed", "Tamamlanan"],
      ["مرات الدخول", "Sign-ins", "Giriş"],
    ];
    sum.columns = H.map((h, n) => ({ header: h[i], key: "c" + n, width: n ? 16 : 30 }));
    const kinds = ["merchant", "carrier", "broker", "supplier", "individual"];
    const total = (list, f) => list.reduce((a, r) => a + (Number(r[f]) || 0), 0);
    for (const k of [...kinds, "all"]) {
      const list = k === "all" ? rows : rows.filter((r) => r.kind === k);
      sum.addRow({
        c0: k === "all" ? ["المجموع", "Total", "Toplam"][i] : w(k, i),
        c1: list.length,
        c2: list.filter((r) => r.statusKey === "approved").length,
        c3: list.filter((r) => r.statusKey === "pending").length,
        c4: total(list, "shipmentsPosted"),
        c5: total(list, "jobsTaken"),
        c6: total(list, "completed"),
        c7: total(list, "logins"),
      });
    }
    sum.getRow(1).font = { bold: true };
    sum.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFACC15" } };
    sum.getRow(sum.rowCount).font = { bold: true };
    sum.addRow([]);
    sum.addRow([
      ["تاريخ التقرير", "Report date", "Rapor tarihi"][i],
      new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    ]);

    const date = new Date().toISOString().slice(0, 10);
    res
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .set("Content-Disposition", `attachment; filename="logibridge-accounts-${date}.xlsx"`)
      .set("Cache-Control", "no-store");
    res.send(Buffer.from(await book.xlsx.writeBuffer()));
  });
}
