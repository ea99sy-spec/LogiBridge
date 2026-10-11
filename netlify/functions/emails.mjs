import { setEnvironmentContext } from "@netlify/blobs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.LOGIBRIDGE_STORAGE = "netlify";
process.env.DATA_DIR = join(tmpdir(), "logibridge-emails");
export async function handler(event) {
  const blobs = JSON.parse(Buffer.from(event.blobs, "base64").toString("utf8"));
  setEnvironmentContext({
    siteID: event.headers["x-nf-site-id"],
    token: blobs.token,
    edgeURL: blobs.url,
    uncachedEdgeURL: blobs.url_uncached,
  });
  const { mailConfigured, flushEmails } = await import("../../server/email.js");
  const { whatsappConfigured, flushWhatsApp } = await import("../../server/whatsapp.js");
  if (!mailConfigured() && !whatsappConfigured())
    return { statusCode: 200, body: JSON.stringify({ configured: false, sent: 0 }) };
  const { initialize } = await import("../../server/store.js");
  await initialize();
  const email = await flushEmails(1);
  const whatsapp = await flushWhatsApp(2);
  return { statusCode: 200, body: JSON.stringify({ email, whatsapp }) };
}
