// Files people download (verification documents, receipts, driver papers) open on any device:
// PDF and JPG are sent as they are, and a PNG is sent as a PDF page.
import { imageAsPdf } from "./watermark.js";

export async function downloadable(bytes, mime) {
  if (mime === "image/png") {
    const pdf = await imageAsPdf(bytes, mime);
    if (pdf) return { bytes: Buffer.from(pdf), mime: "application/pdf", ext: "pdf" };
  }
  const ext = { "application/pdf": "pdf", "image/jpeg": "jpg" }[mime] || "bin";
  return { bytes, mime, ext };
}
