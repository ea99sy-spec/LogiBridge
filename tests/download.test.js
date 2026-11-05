import { test } from "node:test";
import assert from "node:assert/strict";
import { imageAsPdf } from "../server/watermark.js";

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("a PNG original is delivered as a PDF", async () => {
  const pdf = await imageAsPdf(PNG, "image/png");
  assert.ok(pdf, "conversion produced a file");
  assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), "%PDF-");
});

test("unsupported types are not converted", async () => {
  assert.equal(await imageAsPdf(PNG, "text/plain"), null);
});

test("downloads keep PDF and JPG, and turn PNG into PDF", async () => {
  const { downloadable } = await import("../server/fileOutput.js");
  const pdf = await downloadable(Buffer.from("%PDF-1.4 x"), "application/pdf");
  assert.equal(pdf.mime, "application/pdf");
  assert.equal(pdf.ext, "pdf");
  const jpg = await downloadable(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg");
  assert.equal(jpg.mime, "image/jpeg");
  assert.equal(jpg.ext, "jpg");
  const png = await downloadable(PNG, "image/png");
  assert.equal(png.mime, "application/pdf");
  assert.equal(Buffer.from(png.bytes).subarray(0, 5).toString(), "%PDF-");
});
