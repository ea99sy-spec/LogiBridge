import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

async function startServer(port, env) {
  const directory = resolve("tmp", "security-tests", randomUUID());
  const child = spawn(process.execPath, ["server/index.js", "--production"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: directory,
      DATABASE_URL: "",
      REDIS_URL: "",
      AI_SERVICE_URL: "",
      ADMIN_EMAIL: "owner@test.local",
      ADMIN_PASSWORD: "Owner-test-password-2026",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (x) => (output += x));
  child.stderr.on("data", (x) => (output += x));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await delay(100);
  }
  const cookies = {};
  async function call(who, path, body, method = "POST") {
    const res = await fetch(base + "/api" + path, {
      method: body === undefined ? "GET" : method,
      headers: {
        ...(cookies[who] ? { cookie: cookies[who] } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie?.startsWith("lb_session=") && !setCookie.startsWith("lb_session=;"))
      cookies[who] = setCookie.split(";")[0];
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }
  const stop = () =>
    new Promise((r) => {
      if (child.exitCode !== null) return r();
      child.once("exit", r);
      child.kill();
    });
  return { call, cookies, stop, directory, base };
}

const password = "Security-test-password-2026";
const shipment = {
  title: "Security test cargo",
  origin: "Gaziantep",
  destination: "Aleppo",
  category: "textiles",
  volume: 2,
  weight: 300,
  hsCode: "520812",
  crossing: "bab",
  date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
};

test("demo sign-in is off unless DEMO_MODE=true", async (t) => {
  const server = await startServer(3211, { DEMO_MODE: "" });
  t.after(server.stop);
  assert.equal((await server.call("none", "/health")).body.demo, false);
  assert.equal((await server.call("x", "/login", { userId: "admin" })).status, 503);
  // Unknown API routes answer with JSON, and app pages fall back to the SPA.
  const missing = await server.call("none", "/does-not-exist");
  assert.equal(missing.status, 401);
  assert.equal(typeof missing.body, "object");
  const page = await fetch(server.base + "/reset-password");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<div id="root">/);
});

test("demo visitors are isolated from registered accounts", async (t) => {
  const server = await startServer(3212, { DEMO_MODE: "true" });
  t.after(server.stop);
  const { call } = server;
  // A registered individual (no approval needed) posts a private shipment.
  assert.equal(
    (
      await call("person", "/auth/register", {
        accountType: "individual",
        name: "Real Person",
        email: "person@test.local",
        password,
      })
    ).status,
    200,
  );
  const created = await call("person", "/shipments", {
    ...shipment,
    senderName: "Real Sender",
    recipientName: "Real Recipient",
    phone: "+90 555 000 0000",
    destinationAddress: "Private street 1",
  });
  assert.equal(created.status, 201);
  const realId = created.body.id;

  for (const who of ["admin", "carrier", "merchant"]) await call(who, "/login", { userId: who });
  // The demo administrator must not see registered shipments or their private details.
  const demoAdminState = (await call("admin", "/state")).body;
  assert.equal(
    demoAdminState.shipments.some((s) => s.id === realId),
    false,
  );
  assert.equal(JSON.stringify(demoAdminState).includes("Private street 1"), false);
  assert.equal(
    demoAdminState.users.some((u) => u.id === created.body.ownerId),
    false,
  );
  // A demo carrier can neither see nor bid on it.
  assert.equal(
    (await call("carrier", "/state")).body.shipments.some((s) => s.id === realId),
    false,
  );
  assert.equal(
    (await call("carrier", "/bids", { shipmentId: realId, price: 10, days: 2, note: "x" })).status,
    400,
  );
  // Demo accounts cannot message registered accounts.
  assert.equal(
    (
      await call("merchant", "/messages", {
        recipientId: created.body.ownerId,
        text: "hello",
        targetLanguage: "en",
      })
    ).status,
    400,
  );
  // Demo administrator cannot switch global features or touch registered disputes.
  assert.equal((await call("admin", "/flags", { ratings: false }, "PATCH")).status, 403);
  assert.equal((await call("admin", `/shipments/${realId}/action`, { action: "refund" })).status, 400);
  // The registered person never sees demo shipments either.
  const personState = (await call("person", "/state")).body;
  assert.ok(personState.shipments.every((s) => s.ownerId === created.body.ownerId));
  assert.equal(
    personState.users.some((u) => u.demo),
    false,
  );
  // Fleets are private to their carrier.
  await call("carrier", "/fleets", { name: "Private truck", capacity: 30 });
  assert.equal((await call("merchant", "/state")).body.fleets.length, 0);
  // Real accounts cannot self-upgrade a plan.
  assert.equal((await call("person", "/plan", { plan: "pro" })).status, 403);
});

test("shipment owners can cancel and carriers can withdraw offers", async (t) => {
  const server = await startServer(3213, { DEMO_MODE: "true" });
  t.after(server.stop);
  const { call } = server;
  for (const who of ["merchant", "carrier"]) await call(who, "/login", { userId: who });
  const first = (await call("merchant", "/shipments", shipment)).body;
  assert.equal((await call("carrier", "/bids", { shipmentId: first.id, price: 100, days: 2 })).status, 201);
  const bid = (await call("carrier", "/state")).body.bids.find((b) => b.shipmentId === first.id);
  assert.equal((await call("carrier", `/bids/${bid.id}`, {}, "DELETE")).status, 200);
  assert.equal(
    (await call("merchant", "/state")).body.bids.some((b) => b.id === bid.id),
    false,
  );
  // Only the owner may cancel, and only before payment.
  assert.equal((await call("carrier", `/shipments/${first.id}/action`, { action: "cancel" })).status, 400);
  assert.equal((await call("merchant", `/shipments/${first.id}/action`, { action: "cancel" })).status, 200);
  const cancelled = (await call("merchant", "/state")).body.shipments.find((s) => s.id === first.id);
  assert.equal(cancelled.status, "cancelled");
  assert.equal((await call("carrier", "/bids", { shipmentId: first.id, price: 90, days: 2 })).status, 400);
  // Days must be a whole number.
  const second = (await call("merchant", "/shipments", shipment)).body;
  assert.equal((await call("carrier", "/bids", { shipmentId: second.id, price: 90, days: 1.5 })).status, 400);
});

test("password change, reset links and account suspension", async (t) => {
  const server = await startServer(3214, {
    DEMO_MODE: "",
    RESEND_API_KEY: "test-key-not-real",
    MAIL_FROM: "LogiBridge <test@example.invalid>",
    SITE_URL: "https://example.invalid",
  });
  t.after(server.stop);
  const { call, cookies } = server;
  await call("me", "/auth/register", {
    accountType: "individual",
    name: "Pass Owner",
    email: "pass@test.local",
    password,
  });
  // A second device signed in to the same account.
  await call("laptop", "/auth/login", { email: "pass@test.local", password });
  assert.equal((await call("laptop", "/state")).status, 200);

  assert.equal(
    (
      await call("me", "/account/password", {
        currentPassword: "wrong-password-123",
        newPassword: password + "x",
      })
    ).status,
    400,
  );
  const changed = await call("me", "/account/password", {
    currentPassword: password,
    newPassword: password + "-new",
  });
  assert.equal(changed.status, 200);
  assert.equal((await call("me", "/state")).status, 200, "current device stays signed in");
  assert.equal((await call("laptop", "/state")).status, 401, "other devices are signed out");
  assert.equal((await call("old", "/auth/login", { email: "pass@test.local", password })).status, 401);

  // Forgot password always answers the same way.
  assert.equal((await call("anon", "/auth/forgot", { email: "nobody@test.local" })).status, 200);
  assert.equal((await call("anon", "/auth/forgot", { email: "pass@test.local" })).status, 200);
  await delay(300);
  const state = JSON.parse(await readFile(resolve(server.directory, "state.json"), "utf8"));
  const mail = state.emailOutbox.find((m) => m.event === "password_reset");
  assert.ok(mail, "reset email queued");
  assert.equal(JSON.stringify(state).includes("nobody@test.local"), false);
  const token = mail.text.match(/reset-password#([a-f0-9]{64})/)[1];
  assert.equal((await call("anon", "/auth/reset", { token, password: "short" })).status, 400);
  assert.equal(
    (await call("anon", "/auth/reset", { token, password: "Brand-new-password-2026" })).status,
    200,
  );
  assert.equal(
    (await call("anon", "/auth/reset", { token, password: "Another-password-2026" })).status,
    400,
    "a reset link works once",
  );
  assert.equal((await call("me", "/state")).status, 401, "reset signs out every device");
  assert.equal(
    (await call("me", "/auth/login", { email: "pass@test.local", password: "Brand-new-password-2026" }))
      .status,
    200,
  );

  // A registered administrator can suspend the account.
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  const me = (await call("me", "/state")).body.user;
  assert.equal((await call("owner", `/admin/accounts/${me.id}/status`, { disabled: true })).status, 200);
  assert.equal((await call("me", "/state")).status, 401);
  assert.equal(
    (await call("me2", "/auth/login", { email: "pass@test.local", password: "Brand-new-password-2026" }))
      .status,
    403,
  );
  assert.ok(cookies.owner);
});
