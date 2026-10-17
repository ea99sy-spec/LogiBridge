import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Every copy of a company document opened by someone other than its uploader carries a faint
// watermark with who opened it and when. A screenshot or a forwarded file then shows its source.
// Latin text uses a standard PDF font; the Arabic part of a name uses Noto Sans Arabic (shaped
// and right-to-left), loaded from server/fonts.

const latin = (v) =>
  String(v || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

let arabicFont;
function arabicFontBytes() {
  if (arabicFont !== undefined) return arabicFont;
  const candidates = [join(process.cwd(), "server/fonts/NotoSansArabic.woff")];
  try {
    candidates.push(fileURLToPath(new URL("./fonts/NotoSansArabic.woff", import.meta.url)));
  } catch {}
  const file = candidates.find((f) => existsSync(f));
  arabicFont = file ? readFileSync(file) : null;
  return arabicFont;
}
// The Arabic letters of a name (the Latin part is already in the main line).
export const arabicPart = (name) =>
  String(name || "")
    .replace(/[^\u0600-\u06FF\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

export function watermarkText(viewer, now = new Date()) {
  // Border local time (UTC+3), the time the parties use.
  const local = new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 16).replace("T", " ");
  const who = [latin(viewer.name), latin(viewer.email)].filter(Boolean).join(" - ");
  return `${who || "LogiBridge user"} | ${local} (UTC+3) | LogiBridge`;
}

function stamp(page, font, text, arFont, arName) {
  const { width, height } = page.getSize();
  const size = Math.max(9, Math.min(14, width / 50));
  const w = font.widthOfTextAtSize(text, size);
  const stepX = w + 60,
    stepY = size * 6.5;
  // A diagonal grid of faint lines across the whole page.
  let row = 0;
  for (let y = -height; y < height * 2; y += stepY, row++)
    for (let x = -width; x < width * 2; x += stepX)
      // Every other row shows the Arabic name, when there is one.
      if (arFont && arName && row % 2)
        page.drawText(arName, {
          x,
          y,
          size: size * 1.3,
          font: arFont,
          color: rgb(0.45, 0.45, 0.45),
          opacity: 0.2,
          rotate: degrees(30),
        });
      else
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
  if (arFont && arName) {
    const w2 = arFont.widthOfTextAtSize(arName, size * 0.85);
    page.drawRectangle({
      x: width - w2 - 14,
      y: size + 8,
      width: w2 + 14,
      height: size + 8,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });
    page.drawText(arName, {
      x: width - w2 - 6,
      y: size + 11,
      size: size * 0.85,
      font: arFont,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
}

// Returns a watermarked PDF (images are placed on a PDF page), or null if the file cannot be read.
export async function watermarkDocument(bytes, mime, text, arName = "") {
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
    let arFont = null;
    if (arName && arabicFontBytes()) {
      try {
        pdf.registerFontkit(fontkit);
        arFont = await pdf.embedFont(arabicFontBytes(), { subset: true });
      } catch {
        arFont = null;
      }
    }
    for (const page of pdf.getPages()) stamp(page, font, text, arFont, arName);
    pdf.setProducer("LogiBridge");
    return Buffer.from(await pdf.save());
  } catch {
    return null;
  }
}
