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
