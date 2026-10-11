import { randomUUID } from "node:crypto";

// WhatsApp notifications through the WhatsApp Business Cloud API (Meta).
// Optional: nothing is sent until the four settings below exist in the hosting
// environment. Business-initiated messages must use an approved template; the
// template needs one body variable {{1}} that carries the notification text.
//   WHATSAPP_TOKEN       permanent access token of a system user
//   WHATSAPP_PHONE_ID    phone number ID from WhatsApp Manager
//   WHATSAPP_TEMPLATE    approved template name, e.g. logibridge_update
//   WHATSAPP_LANG        template language code (default "ar")
//   WHATSAPP_API_VERSION Graph API version (default v21.0)
export const whatsappConfigured = () =>
  !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TEMPLATE);

export { waNumber } from "../shared/wa.js";
import { waNumber } from "../shared/wa.js";

// Template variables may not contain new lines, tabs or more than four spaces in a row.
const flat = (text) =>
  String(text)
    .replace(/[\r\n\t]+/g, " · ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, 900);

export function queueWhatsApp(s, to, text, key) {
  const number = waNumber(to);
  if (!number || !text) return;
  s.whatsappOutbox ||= [];
  if (key && s.whatsappOutbox.some((x) => x.key === key)) return;
  s.whatsappOutbox.push({
    id: randomUUID(),
    key,
    to: number,
    text: flat(text),
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  // Keep the queue small: drop old finished jobs.
  if (s.whatsappOutbox.length > 500)
    s.whatsappOutbox = s.whatsappOutbox.filter((x) => x.status === "pending").slice(-500);
}

export async function deliverWhatsApp(job, fetcher = fetch) {
  if (!whatsappConfigured()) return { configured: false };
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const response = await fetcher(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(process.env.WHATSAPP_PHONE_ID)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: job.to,
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE,
          language: { code: process.env.WHATSAPP_LANG || "ar" },
          components: [{ type: "body", parameters: [{ type: "text", text: job.text }] }],
        },
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw Error(`WhatsApp returned ${response.status}`);
  const value = await response.json();
  const providerId = value.messages?.[0]?.id;
  if (!providerId) throw Error("WhatsApp did not acknowledge the message");
  return { configured: true, providerId };
}

export async function flushWhatsApp(limit = 3) {
  if (!whatsappConfigured()) return { configured: false, sent: 0 };
  const { mutate } = await import("./store.js");
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const job = await mutate((s) => {
      const now = Date.now(),
        p = (s.whatsappOutbox || []).find(
          (x) =>
            (x.status === "pending" && (!x.nextAttempt || Date.parse(x.nextAttempt) <= now)) ||
            (x.status === "sending" && Date.parse(x.leaseUntil) < now),
        );
      if (!p) return null;
      p.status = "sending";
      p.leaseUntil = new Date(now + 120000).toISOString();
      p.attempts++;
      return { ...p };
    });
    if (!job) break;
    try {
      const result = await deliverWhatsApp(job);
      await mutate((s) => {
        const p = s.whatsappOutbox.find((x) => x.id === job.id);
        Object.assign(p, { status: "sent", providerId: result.providerId, sentAt: new Date().toISOString() });
        delete p.leaseUntil;
        delete p.lastError;
      });
      sent++;
    } catch (error) {
      await mutate((s) => {
        const p = s.whatsappOutbox.find((x) => x.id === job.id);
        p.status = p.attempts >= 4 ? "failed" : "pending";
        p.lastError = error.message;
        p.nextAttempt = new Date(Date.now() + Math.min(3600000, 60000 * 2 ** p.attempts)).toISOString();
        delete p.leaseUntil;
      });
    }
  }
  return { configured: true, sent };
}
