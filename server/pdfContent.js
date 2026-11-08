// Checks that an uploaded PDF actually has something on its first pages (text or an image).
// A PDF printed from a page that did not load is blank, and the reviewer would see an empty file.
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream, PDFArray } from "pdf-lib";

const drawsContent = /\b(Tj|TJ|Do)\b/;

function streamText(context, ref) {
  const obj = context.lookup(ref);
  if (!(obj instanceof PDFRawStream)) return "";
  const data = obj.contents;
  const filter = obj.dict.get(PDFName.of("Filter"));
  if (filter && String(filter).includes("FlateDecode")) {
    try {
      return zlib.inflateSync(Buffer.from(data)).toString("latin1");
    } catch {
      return "";
    }
  }
  return Buffer.from(data).toString("latin1");
}

export async function pdfHasContent(bytes) {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = pdf.getPages().slice(0, 5);
    if (!pages.length) return false;
    for (const page of pages) {
      const contents = page.node.get(PDFName.of("Contents"));
      if (!contents) continue;
      const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
      for (const ref of refs) {
        if (drawsContent.test(streamText(pdf.context, ref))) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
