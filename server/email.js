import { randomUUID } from "node:crypto";
import { queueWhatsApp } from "./whatsapp.js";
const subjects = {
  registered: "استلمنا تسجيلك في LogiBridge",
  login: "تسجيل دخول إلى حسابك في LogiBridge",
  approved: "تم قبول حسابك في LogiBridge",
  rejected: "قرار مراجعة حسابك في LogiBridge",
  application: "اكتمل تقديم طلب التوثيق",
  shipment_submitted: "استلمنا طلب شحنك",
  bid_received: "وصل عرض جديد لشحنتك",
  company_joined: "شركة جديدة وخدماتها في LogiBridge",
  message_received: "وصلتك رسالة من حساب آخر في LogiBridge",
  password_reset: "إعادة تعيين كلمة المرور في LogiBridge",
  password_changed: "تم تغيير كلمة مرور حسابك في LogiBridge",
  bid_accepted: "تم قبول عرضك للنقل في LogiBridge",
  payment_approved: "تم تأكيد الدفع لشحنتك في LogiBridge",
  payment_rejected: "لم يتم قبول إيصال الدفع في LogiBridge",
  direct_payment: "تم اختيار الدفع المباشر لشحنة في LogiBridge",
  payment_confirmed: "أكّد الناقل استلام الدفعة في LogiBridge",
  dispatched: "انطلقت شحنتك في LogiBridge",
  arrived: "وصلت شحنتك — بانتظار تأكيد الاستلام",
  operation_completed: "اكتملت العملية في LogiBridge",
  shipment_cancelled: "أُلغيت شحنة في LogiBridge",
  order_update: "تحديث على طلب الشراء في LogiBridge",
  order_received: "وصلك طلب شراء جديد في LogiBridge",
  verify_email: "أكّد بريدك الإلكتروني في LogiBridge",
  border_notice: "تنبيه جديد عن الحدود والجمارك — LogiBridge",
};
// Security emails also reach administrators; everything else is for platform accounts.
const securityEvents = new Set(["password_reset", "password_changed", "login", "verify_email"]);
export function queueEmail(s, userId, event, details = {}, key) {
  const u = s.users.find((x) => x.id === userId);
  if (!u || u.demo || !u.email || !subjects[event]) return;
  if (u.role === "admin" && !securityEvents.has(event)) return;
  if (event === "company_joined" && u.profile?.companyEmails === false) return;
  if (event === "border_notice" && u.profile?.borderEmails === false) return;
  s.emailOutbox ||= [];
  if (key && s.emailOutbox.some((x) => x.key === key)) return;
  const url = (process.env.URL || process.env.SITE_URL || "https://logibridge-ea99sy.netlify.app").replace(
    /\/$/,
    "",
  );
  const lines = {
    registered:
      "استلمنا تسجيلك. كل الحسابات تحتاج موافقة إدارة المنصة قبل الاستخدام. أكمل بياناتك ووثائقك من صفحة التوثيق، وسنرسل القرار بالبريد الإلكتروني.",
    login: "تم تسجيل دخول ناجح إلى حسابك. إذا لم تكن أنت، غيّر كلمة المرور وتواصل مع إدارة المنصة.",
    approved: "وافق المسؤول على حسابك. يمكنك الآن استخدام خدمات المنصة.",
    rejected: "لم تتم الموافقة على طلبك. يمكنك مراجعة السبب واستكمال المستندات وإعادة تقديم الطلب.",
    application: "اكتمل تقديم طلبك والملفات. الطلب الآن قيد التقييم وسنرسل القرار بالبريد الإلكتروني.",
    shipment_submitted:
      "اكتمل تقديم طلب الشحنة. يمكنك رفع ملفات إضافية من مركز الوثائق. عند وصول عروض النقل سنرسل إشعارًا بالبريد الإلكتروني.",
    bid_received: "وصل عرض نقل جديد. افتح الشحنة للاطلاع على السعر وشروط العرض.",
    company_joined:
      "انضمت شركة معتمدة إلى المنصة. يمكنك الاطلاع على تعريفها وخدماتها والتواصل معها داخل الموقع.",
    message_received: "وصلتك رسالة جديدة من حساب آخر. افتح مركز التواصل للرد.",
    bid_accepted: "قبل صاحب الشحنة عرضك. ستصلك رسالة عند تأكيد الدفع، وبعدها يمكنك بدء النقل.",
    payment_approved: "تم تأكيد استلام مبلغ الشحنة. يمكن للناقل الآن بدء النقل.",
    payment_rejected: "لم يتم قبول إيصال الدفع. افتح الشحنة لمعرفة السبب وإرسال إيصال صحيح.",
    direct_payment:
      "اختار صاحب الشحنة الدفع المباشر للناقل. على الناقل تأكيد استلام المبلغ من صفحة الشحنة قبل بدء النقل.",
    payment_confirmed: "أكّد الناقل استلام الدفعة. سيبدأ النقل قريبًا.",
    dispatched: "بدأ نقل الشحنة. يمكنك متابعة موقعها من صفحة التتبع.",
    arrived: "وصلت الشحنة إلى وجهتها. يرجى تأكيد الاستلام من صفحة الشحنة لإغلاق العملية.",
    operation_completed:
      "تم تأكيد استلام الشحنة وإغلاق العملية بنجاح. يمكنك تحميل ملخص العملية وتقييم الطرف الآخر من الموقع. شكرًا لاستخدامك LogiBridge.",
    shipment_cancelled: "أُلغيت الشحنة من صاحبها. لم يعد مطلوبًا أي إجراء منك.",
    order_update: "تغيّرت حالة طلب الشراء الخاص بك. افتح الموقع للتفاصيل.",
    order_received: "وصلك طلب شراء جديد لأحد منتجاتك. افتح قسم الطلبات للتأكيد.",
    border_notice:
      "نشرت إدارة LogiBridge تنبيهًا جديدًا عن المعابر أو الجمارك بين تركيا وسوريا. التفاصيل وكل القوانين المحدّثة في صفحة الحدود:",
    verify_email: "شكرًا لتسجيلك. اضغط الرابط التالي خلال 3 أيام لتأكيد بريدك الإلكتروني:",
    password_reset:
      "طلب أحدهم إعادة تعيين كلمة مرور حسابك. افتح الرابط التالي خلال ساعة لاختيار كلمة مرور جديدة. إذا لم تطلب ذلك فتجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.",
    password_changed:
      "تم تغيير كلمة مرور حسابك وتسجيل الخروج من الأجهزة الأخرى. إذا لم تقم بذلك، استخدم «نسيت كلمة المرور» فورًا وتواصل مع إدارة المنصة.",
  };
  const info = Object.entries(details)
    .filter(([k, v]) => k !== "url" && typeof v === "string" && v)
    .map(([, v]) => v)
    .join("\n");
  const shipmentEvents = new Set([
    "bid_accepted",
    "payment_approved",
    "payment_rejected",
    "direct_payment",
    "payment_confirmed",
    "dispatched",
    "arrived",
    "operation_completed",
    "shipment_cancelled",
  ]);
  const link =
    details.url ||
    (event === "border_notice" ? `${url}/border` : "") ||
    (shipmentEvents.has(event) ? `${url}/workspace/tracking` : "") ||
    (event.startsWith("order_")
      ? `${url}/workspace/${event === "order_received" ? "orders" : "marketplace"}`
      : "") ||
    `${url}/workspace/${event === "company_joined" ? "directory" : event === "message_received" ? "hub" : event === "bid_received" ? "shipments" : "dashboard"}`;
  s.emailOutbox.push({
    id: randomUUID(),
    key,
    to: u.email,
    userId,
    event,
    subject: subjects[event],
    text: `مرحبًا ${u.name}،\n\n${lines[event]}\n${info}\n\n${link}\n\nLogiBridge${event === "company_joined" ? "\nيمكنك إيقاف رسائل الشركات الجديدة من إعدادات ملفك الشخصي." : ""}`,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  // Same notice on WhatsApp for accounts that turned it on (never security links).
  if (u.profile?.whatsappNotify === true && !securityEvents.has(event))
    queueWhatsApp(
      s,
      u.details?.phone,
      `${subjects[event]}: ${lines[event]} ${info} ${link}`,
      key && "wa/" + key,
    );
}
export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
export async function deliverEmail(job, fetcher = fetch) {
  if (!mailConfigured()) return { configured: false };
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `logibridge/${job.id}`,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [job.to],
      subject: job.subject,
      text: job.text,
      ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error(`Email provider returned ${response.status}`);
  const value = await response.json();
  if (!value.id) throw Error("Email provider did not acknowledge the message");
  return { configured: true, providerId: value.id };
}
export async function flushEmails(limit = 3) {
  if (!mailConfigured()) return { configured: false, sent: 0 };
  const { readState, mutate } = await import("./store.js");
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const job = await mutate((s) => {
      const now = Date.now(),
        p = (s.emailOutbox || []).find(
          (x) =>
            (x.status === "pending" && (!x.nextAttempt || Date.parse(x.nextAttempt) <= now)) ||
            (x.status === "sending" && Date.parse(x.leaseUntil) < now),
        );
      if (!p) return null;
      p.status = "sending";
      p.leaseUntil = new Date(now + 120000).toISOString();
      p.attempts++;
      return p;
    });
    if (!job) break;
    try {
      const result = await deliverEmail(job);
      await mutate((s) => {
        const p = s.emailOutbox.find((x) => x.id === job.id);
        p.status = "sent";
        p.providerId = result.providerId;
        p.sentAt = new Date().toISOString();
        delete p.leaseUntil;
        delete p.lastError;
      });
      sent++;
    } catch (error) {
      await mutate((s) => {
        const p = s.emailOutbox.find((x) => x.id === job.id);
        p.status = p.attempts >= 5 ? "failed" : "pending";
        p.lastError = error.message;
        p.nextAttempt = new Date(Date.now() + Math.min(3600000, 60000 * 2 ** p.attempts)).toISOString();
        delete p.leaseUntil;
      });
    }
  }
  return { configured: true, sent };
}

// Activity report for the platform owner: one email per important event on the site.
const adminSubjects = {
  account_registered: "حساب جديد بانتظار موافقتك",
  verification_submitted: "طلب توثيق جديد بانتظار المراجعة",
  shipment_created: "طلب شحن جديد",
  bid_accepted: "تم قبول عرض نقل",
  payment_submitted: "إيصال دفع بنكي بانتظار التأكيد",
  direct_payment: "اختيار دفع مباشر للناقل",
  dispatched: "انطلقت شحنة",
  operation_completed: "اكتملت عملية شحن",
  shipment_cancelled: "أُلغيت شحنة",
  dispute_opened: "نزاع جديد يحتاج متابعة",
  order_placed: "طلب شراء معدات جديد",
  booking_created: "حجز معدات جديد",
  group_reserved: "حجز مساحة في رحلة مشتركة",
};
export function adminRecipient(s) {
  return (
    s.settings?.notifyEmail ||
    process.env.ADMIN_EMAIL ||
    s.supportEmail ||
    (s.users || []).find((u) => u.role === "admin" && !u.demo && u.email)?.email ||
    ""
  ).toLowerCase();
}
export function queueAdminEmail(s, event, details = {}, key) {
  const to = adminRecipient(s);
  if (!adminSubjects[event] || s.settings?.activityEmails === false) return;
  if (s.settings?.adminWhatsapp)
    queueWhatsApp(
      s,
      s.settings.adminWhatsapp,
      `LogiBridge · ${adminSubjects[event]}: ${Object.values(details).filter(Boolean).join(" · ")}`,
      key && "wa/admin/" + key,
    );
  if (!to) return;
  s.emailOutbox ||= [];
  if (key && s.emailOutbox.some((x) => x.key === key)) return;
  const url = (process.env.URL || process.env.SITE_URL || "https://logibridge-ea99sy.netlify.app").replace(
    /\/$/,
    "",
  );
  const lines = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `• ${k}: ${v}`)
    .join("\n");
  s.emailOutbox.push({
    id: randomUUID(),
    key,
    to,
    userId: null,
    event: "admin_" + event,
    subject: `LogiBridge · ${adminSubjects[event]}`,
    text: `${adminSubjects[event]}\n\n${lines}\n\n${url}/workspace/${event === "account_registered" || event === "verification_submitted" ? "companies" : "admin"}\n\nيمكنك إيقاف هذه الرسائل من لوحة المسؤول.`,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
}
