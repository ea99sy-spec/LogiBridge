import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// Every copy of a company document opened by someone other than its uploader carries a faint
// watermark with who opened it and when. A screenshot or a forwarded file then shows its source.
// Standard PDF fonts have no Arabic letters, so only Latin text is written (the email always is).

const latin = (v) =>
  String(v || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function watermarkText(viewer, now = new Date()) {
  // Border local time (UTC+3), the time the parties use.
  const local = new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 16).replace("T", " ");
  const who = [latin(viewer.name), latin(viewer.email)].filter(Boolean).join(" - ");
  return `${who || "LogiBridge user"} | ${local} (UTC+3) | LogiBridge`;
}

function stamp(page, font, text) {
  const { width, height } = page.getSize();
  const size = Math.max(9, Math.min(14, width / 50));
  const w = font.widthOfTextAtSize(text, size);
  const stepX = w + 60,
    stepY = size * 6.5;
  // A diagonal grid of faint lines across the whole page.
  for (let y = -height; y < height * 2; y += stepY)
    for (let x = -width; x < width * 2; x += stepX)
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color: rgb(0.45, 0.45, 0.45),
        opacity: 0.2,
        rotate: degrees(30),
      });
  // And one clear line at the bottom.
  const foot = `Copy viewed by: ${text}`;
  page.drawRectangle({ x: 0, y: 0, width, height: size + 8, color: rgb(1, 1, 1), opacity: 0.85 });
  page.drawText(foot.slice(0, 160), { x: 6, y: 4, size: size * 0.8, font, color: rgb(0.2, 0.2, 0.2) });
}

// Returns a watermarked PDF (images are placed on a PDF page), or null if the file cannot be read.
export async function watermarkDocument(bytes, mime, text) {
  try {
    let pdf;
    if (mime === "application/pdf") {
      pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    } else if (mime === "image/png" || mime === "image/jpeg") {
      pdf = await PDFDocument.create();
      const img = mime === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      // Fit on an A4-sized page keeping the proportions.
      const max = [595, 842];
      const scale = Math.min(max[0] / img.width, max[1] / img.height, 1.5);
      const w = Math.max(200, img.width * scale),
        h = Math.max(200, img.height * scale);
      const page = pdf.addPage([w, h + 22]);
      page.drawImage(img, { x: 0, y: 22, width: w, height: h });
    } else return null;
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const page of pdf.getPages()) stamp(page, font, text);
    pdf.setProducer("LogiBridge");
    return Buffer.from(await pdf.save());
  } catch {
    return null;
  }
}
