import test from "node:test";
import assert from "node:assert/strict";
test("Netlify handler persists cloud sessions and retries conflicting shipment writes", async () => {
  // Demo sign-in is opt-in; this test uses the demo merchant to exercise the handler.
  process.env.DEMO_MODE = "true";
  const original = globalThis.fetch,
    entries = new Map();
  let version = 0,
    conflict = false,
    conflicts = 0;
  globalThis.fetch = async (url, options = {}) => {
    assert.ok(String(url).startsWith("https://blobs.test/"));
    const key = new URL(url).pathname,
      method = (options.method || "GET").toUpperCase(),
      headers = new Headers(options.headers),
      old = entries.get(key);
    if (method === "GET")
      return old
        ? new Response(old.data, { status: 200, headers: { etag: old.etag } })
        : new Response(null, { status: 404 });
    if (method === "DELETE") {
      entries.delete(key);
      return new Response(null, { status: 204 });
    }
    assert.equal(method, "PUT");
    if (conflict && key.endsWith("/state") && headers.has("if-match")) {
      conflict = false;
      conflicts++;
      entries.set(key, { ...old, etag: String(++version) });
      return new Response(null, { status: 412 });
    }
    if (
      (headers.get("if-none-match") === "*" && old) ||
      (headers.has("if-match") && headers.get("if-match") !== old?.etag)
    )
      return new Response(null, { status: 412 });
    const data = typeof options.body === "string" ? Buffer.from(options.body) : Buffer.from(options.body),
      etag = String(++version);
    entries.set(key, { data, etag });
    return new Response(null, { status: 200, headers: { etag } });
  };
  try {
    const { handler } = await import("../netlify/functions/api.mjs");
    async function call(path, body, cookie) {
      return handler(
        {
          path: "/.netlify/functions/api" + path,
          httpMethod: body === undefined ? "GET" : "POST",
          headers: {
            host: "logibridge.test",
            "x-nf-site-id": "test-site",
            "x-nf-deploy-id": "test-deploy",
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          body: body === undefined ? "" : JSON.stringify(body),
          isBase64Encoded: false,
          blobs: Buffer.from(
            JSON.stringify({
              url: "https://blobs.test/",
              url_uncached: "https://blobs.test/",
              token: "test-token",
            }),
          ).toString("base64"),
        },
        {},
      );
    }
    let response = await call("/api/health");
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).storage, "netlify-blobs");
    response = await call("/api/login", { userId: "merchant" });
    assert.equal(response.statusCode, 200);
    const cookieHeader = [
        ...Object.entries(response.headers || {}),
        ...Object.entries(response.multiValueHeaders || {}),
      ].find(([k]) => k.toLowerCase() === "set-cookie")?.[1],
      cookieValue = response.cookies?.[0] || (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader);
    assert.ok(cookieValue);
    const cookie = cookieValue.split(";")[0];
    assert.match(cookieValue, /Secure/);
    assert.ok([...entries.keys()].some((k) => k.includes("logibridge-sessions")));
    response = await call("/api/state", undefined, cookie);
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).realtime, false);
    conflict = true;
    response = await call(
      "/api/shipments",
      {
        title: "Cloud domestic shipment",
        origin: "Istanbul",
        destination: "Ankara",
        originCountry: "TR",
        destinationCountry: "TR",
        transportType: "domesticTR",
        hsCode: "010121",
        category: "other",
        volume: 2,
        weight: 100,
        date: "2099-01-01",
      },
      cookie,
    );
    assert.equal(response.statusCode, 201);
    assert.equal(conflicts, 1);
    const shipment = JSON.parse(response.body);
    response = await call("/api/state", undefined, cookie);
    assert.equal(JSON.parse(response.body).shipments.filter((s) => s.id === shipment.id).length, 1);
    response = await call("/api/events", undefined, cookie);
    assert.equal(response.statusCode, 204);
    response = await call("/api/logout", {}, cookie);
    assert.equal(response.statusCode, 200);
    response = await call("/api/state", undefined, cookie);
    assert.equal(response.statusCode, 401);
  } finally {
    globalThis.fetch = original;
  }
});
