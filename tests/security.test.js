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
const personFields = { phone: "+90 555 000 0000", country: "TR", city: "Istanbul", acceptTerms: true };
const shipment = {
  title: "Security test cargo",
  origin: "Gaziantep",
  destination: "Aleppo",
  category: "textiles",
  volume: 2,
  weight: 300,
  hsCode: "520812",
  originCountry: "TR",
  destinationCountry: "TR",
  transportType: "domesticTR",
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
        ...personFields,
      })
    ).status,
    200,
  );
  // Every registered account waits for the administrator's approval.
  assert.equal((await call("person", "/shipments", shipment)).status, 403);
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  const personId = (await call("person", "/state")).body.user.id;
  assert.equal(
    (await call("owner", `/admin/accounts/${personId}/review`, { status: "rejected" })).status,
    400,
    "a rejection needs a reason",
  );
  assert.equal(
    (await call("owner", `/admin/accounts/${personId}/review`, { status: "approved" })).status,
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
  // Direct payment: the carrier confirms receipt, then the operation runs to completion.
  const direct = (await call("merchant", "/shipments", shipment)).body;
  await call("carrier", "/bids", { shipmentId: direct.id, price: 50, days: 1 });
  const directBid = (await call("merchant", "/state")).body.bids.find((b) => b.shipmentId === direct.id);
  await call("merchant", `/shipments/${direct.id}/accept`, { bidId: directBid.id });
  assert.equal((await call("carrier", `/shipments/${direct.id}/action`, { action: "dispatch" })).status, 400);
  assert.equal(
    (await call("merchant", `/shipments/${direct.id}/action`, { action: "pay_direct" })).status,
    200,
  );
  assert.equal(
    (await call("merchant", `/shipments/${direct.id}/action`, { action: "confirm_payment" })).status,
    400,
  );
  assert.equal(
    (await call("carrier", `/shipments/${direct.id}/action`, { action: "confirm_payment" })).status,
    200,
  );
  for (const [who, a] of [
    ["carrier", "dispatch"],
    ["carrier", "arrive"],
    ["merchant", "confirm"],
  ])
    assert.equal((await call(who, `/shipments/${direct.id}/action`, { action: a })).status, 200, a);
  const closed = (await call("merchant", "/state")).body.shipments.find((s) => s.id === direct.id);
  assert.equal(closed.status, "delivered");
  assert.ok(closed.completedAt);
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
    ...personFields,
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

test("tax numbers are checked and the administrator controls demo sign-in", async (t) => {
  const { validTurkishTckn, validTurkishVkn, checkTaxFormat } = await import("../shared/tax.js");
  assert.equal(validTurkishTckn("10000000146"), true);
  assert.equal(validTurkishTckn("10000000147"), false);
  // Build a valid VKN from its own check digit, then break it.
  const base = "123456789";
  const valid = [...Array(10).keys()].map((d) => base + d).find(validTurkishVkn);
  assert.ok(valid);
  assert.equal(validTurkishVkn(base + ((Number(valid[9]) + 1) % 10)), false);
  assert.equal(checkTaxFormat("TR", "12345").status, "invalid");
  assert.equal(checkTaxFormat("SY", "SY-778899").status, "format_ok");

  const server = await startServer(3215, { DEMO_MODE: "" });
  t.after(server.stop);
  const { call } = server;
  const company = {
    accountType: "carrier",
    name: "Tax Test Carrier",
    password,
    ...personFields,
    license: "L-1",
    fleetSize: 2,
    routes: "Istanbul - Aleppo",
  };
  const wrong = valid.slice(0, 9) + ((Number(valid[9]) + 1) % 10);
  const rejected = await call("bad2", "/auth/register", {
    ...company,
    email: "bad2@test.local",
    taxId: wrong,
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error, "Invalid company tax number");
  // Carriers must give their licence and fleet size.
  assert.equal(
    (await call("x", "/auth/register", { ...company, email: "x@test.local", taxId: valid, fleetSize: "" }))
      .status,
    400,
  );
  const ok = await call("good", "/auth/register", { ...company, email: "good@test.local", taxId: valid });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.taxCheck.status, "valid");
  assert.equal(ok.body.user.details.license, "L-1");

  // Demo sign-in is hidden until the administrator turns it on.
  assert.equal((await call("demo", "/login", { userId: "merchant" })).status, 503);
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  assert.equal((await call("good", "/admin/settings", { demoLogin: true }, "PUT")).status, 403);
  assert.equal((await call("owner", "/admin/settings", { demoLogin: true }, "PUT")).status, 200);
  assert.equal((await call("none", "/health")).body.demo, true);
  assert.equal((await call("demo", "/login", { userId: "carrier" })).status, 200);
  const demoUser = (await call("demo", "/state")).body.user;
  assert.equal(demoUser.details.license.length > 0, true, "demo carrier has carrier details");
  assert.equal((await call("owner", "/admin/settings", { demoLogin: false }, "PUT")).status, 200);
  assert.equal((await call("demo", "/state")).status, 401, "hiding demo ends demo sessions");
});

test("two-step sign-in, GCC tax rules, GPS sharing and email confirmation", async (t) => {
  const { totp, base32Encode } = await import("../server/totp.js");
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(totp(secret, 59000), "287082", "RFC 6238 test vector");
  const { checkTaxFormat, taxField } = await import("../shared/tax.js");
  assert.equal(checkTaxFormat("SA", "300000000000003").status, "format_ok");
  assert.equal(checkTaxFormat("SA", "100000000000003").status, "invalid");
  assert.equal(checkTaxFormat("AE", "100123456700003").status, "format_ok");
  assert.equal(checkTaxFormat("AE", "12345").status, "invalid");
  assert.equal(taxField("QA").label, "taxField_CR");

  const server = await startServer(3216, {
    DEMO_MODE: "",
    RESEND_API_KEY: "test-key-not-real",
    MAIL_FROM: "LogiBridge <test@example.invalid>",
  });
  t.after(server.stop);
  const { call } = server;
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  // Two-step sign-in for the administrator.
  const setup = await call("owner", "/account/2fa/setup", { password: "Owner-test-password-2026" });
  assert.equal(setup.status, 200);
  assert.match(setup.body.qr, /^data:image\/png;base64,/);
  assert.equal((await call("owner", "/account/2fa/enable", { code: "000000" })).status, 400);
  const enabled = await call("owner", "/account/2fa/enable", { code: totp(setup.body.secret) });
  assert.equal(enabled.status, 200);
  assert.equal(enabled.body.backupCodes.length, 8);
  const noCode = await call("o2", "/auth/login", {
    email: "owner@test.local",
    password: "Owner-test-password-2026",
  });
  assert.equal(noCode.status, 401);
  assert.equal(noCode.body.twoFactor, true);
  assert.equal(
    (
      await call("o2", "/auth/login", {
        email: "owner@test.local",
        password: "Owner-test-password-2026",
        code: "123456",
      })
    ).status,
    401,
  );
  const backup = enabled.body.backupCodes[0];
  const login = { email: "owner@test.local", password: "Owner-test-password-2026", code: backup };
  assert.equal((await call("o2", "/auth/login", login)).status, 200, "backup code works once");
  assert.equal((await call("o3", "/auth/login", login)).status, 401, "and not twice");
  assert.equal((await call("o2", "/state")).body.user.backupCodesLeft, 7);

  // Email confirmation is optional until the administrator requires it.
  await call("p", "/auth/register", {
    accountType: "individual",
    name: "Mail Person",
    email: "mail@test.local",
    password,
    ...personFields,
  });
  const me = (await call("p", "/state")).body.user;
  assert.equal(me.emailVerified, false);
  await call("o2", `/admin/accounts/${me.id}/review`, { status: "approved" });
  assert.equal((await call("p", "/shipments", shipment)).status, 201);
  assert.equal((await call("o2", "/admin/settings", { requireEmailVerification: true }, "PUT")).status, 200);
  const blocked = await call("p", "/shipments", shipment);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error, "Email verification required");
  await delay(200);
  const stateFile = JSON.parse(await readFile(resolve(server.directory, "state.json"), "utf8"));
  const mail = stateFile.emailOutbox.filter((m) => m.event === "verify_email").at(-1);
  const token = mail.text.match(/verify-email#([a-f0-9]{64})/)[1];
  assert.equal((await call("anon", "/auth/verify-email", { token })).status, 200);
  assert.equal((await call("p", "/state")).body.user.emailVerified, true);
  const created = await call("p", "/shipments", shipment);
  assert.equal(created.status, 201);

  // GPS positions are validated and stored on the shipment for the owner only.
  const carrier = {
    accountType: "carrier",
    name: "GPS Carrier",
    email: "gps@test.local",
    password,
    ...personFields,
    taxId: "1234567890",
    license: "L",
    fleetSize: 1,
    routes: "R",
  };
  await call("c", "/auth/register", carrier);
  const cid = (await call("c", "/state")).body.user.id;
  await call("o2", `/admin/accounts/${cid}/review`, { status: "approved" });
  await call("o2", "/admin/settings", { requireEmailVerification: false }, "PUT");
  await call("c", "/bids", { shipmentId: created.body.id, price: 10, days: 1 });
  const bid = (await call("p", "/state")).body.bids.find((b) => b.shipmentId === created.body.id);
  await call("p", `/shipments/${created.body.id}/accept`, { bidId: bid.id });
  assert.equal(
    (await call("c", `/shipments/${created.body.id}/location`, { lat: 200, lng: 10 })).status,
    400,
  );
  assert.equal(
    (await call("c", `/shipments/${created.body.id}/location`, { lat: 36.2021, lng: 37.1343, accuracy: 12 }))
      .status,
    200,
  );
  const tracked = (await call("p", "/state")).body.shipments.find((s) => s.id === created.body.id);
  assert.equal(tracked.lastPosition.lat, 36.2021);
  assert.match(tracked.lastLocation, /^GPS /);
  // Directory shows reputation numbers.
  const dir = (await call("p", "/directory")).body;
  assert.ok(Array.isArray(dir));
});

test("company profile pages are for approved members and show contact details", async (t) => {
  const server = await startServer(3217, { DEMO_MODE: "" });
  t.after(server.stop);
  const { call } = server;
  const company = {
    accountType: "supplier",
    name: "Profile Supplier",
    email: "sup@test.local",
    password,
    ...personFields,
    taxId: "1234567890",
    equipment: "Containers",
  };
  await call("sup", "/auth/register", company);
  // Documents need a complete profile with a contact email first.
  const doc = await call("sup", "/kyb", {
    content: "JVBERi0xLjQK",
    mime: "application/pdf",
    filename: "r.pdf",
  });
  assert.equal(doc.body.error, "Complete your company profile first");
  assert.equal(
    (
      await call(
        "sup",
        "/profile",
        { about: "We rent containers", services: "Rental", companyEmails: true },
        "PUT",
      )
    ).body.error,
    "Contact email required",
  );
  assert.equal(
    (
      await call(
        "sup",
        "/profile",
        {
          about: "We rent containers",
          services: "Rental",
          contactEmail: "info@supplier.test",
          contactPhone: "+90 324 111 22 33",
          companyEmails: true,
          logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXmUAAAAASUVORK5CYII=",
        },
        "PUT",
      )
    ).status,
    200,
  );
  const sid = (await call("sup", "/state")).body.user.id;
  // A second member, not yet approved, cannot open profile pages.
  await call("buyer", "/auth/register", {
    accountType: "individual",
    name: "Buyer",
    email: "buyer@test.local",
    password,
    ...personFields,
  });
  assert.equal((await call("buyer", `/companies/${sid}`)).status, 403);
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  const bid = (await call("buyer", "/state")).body.user.id;
  await call("owner", `/admin/accounts/${bid}/review`, { status: "approved" });
  assert.equal((await call("buyer", `/companies/${sid}`)).status, 404, "unapproved companies are hidden");
  await call("owner", `/admin/accounts/${sid}/review`, { status: "approved" });
  const page = await call("buyer", `/companies/${sid}`);
  assert.equal(page.status, 200);
  assert.equal(page.body.profile.contactEmail, "info@supplier.test");
  assert.match(page.body.logo, /^data:image\/png/);
  assert.equal(page.body.details.equipment, "Containers");
  assert.equal(JSON.stringify(page.body).includes("1234567890"), false, "tax number stays private");
  assert.equal(JSON.stringify(page.body).includes("sup@test.local"), false, "login email stays private");
  assert.ok((await call("buyer", "/directory")).body.some((u) => u.id === sid));
  // Anonymous visitors cannot see profiles.
  assert.equal((await call("anon", `/companies/${sid}`)).status, 401);
});

test("Türkiye⇄Syria orders run as three stages with the right providers", async (t) => {
  const server = await startServer(3218, { DEMO_MODE: "true" });
  t.after(server.stop);
  const { call } = server;
  for (const who of ["merchant", "carrier", "broker"]) await call(who, "/login", { userId: who });
  const order = (
    await call("merchant", "/shipments", {
      ...shipment,
      origin: "Gaziantep",
      destination: "Aleppo",
      originCountry: "TR",
      destinationCountry: "SY",
      transportType: "crossBorder",
      crossing: "salameh",
    })
  ).body;
  assert.equal(order.isOrder, true);
  assert.equal(order.legs.length, 3);
  const state = (await call("merchant", "/state")).body;
  const legs = order.legs.map((id) => state.shipments.find((s) => s.id === id));
  assert.deepEqual(
    legs.map((l) => l.legType),
    ["origin_leg", "clearance", "destination_leg"],
  );
  assert.equal(legs[0].destination, "Öncüpınar (Kilis)");
  assert.equal(legs[2].origin, "Bab al-Salama (Azaz)");
  // Carriers see transport stages, brokers see clearance; nobody bids on the order itself.
  const carrierSees = (await call("carrier", "/state")).body.shipments.map((s) => s.id);
  assert.ok(
    carrierSees.includes(legs[0].id) && !carrierSees.includes(legs[1].id) && !carrierSees.includes(order.id),
  );
  assert.ok((await call("broker", "/state")).body.shipments.some((s) => s.id === legs[1].id));
  assert.equal((await call("carrier", "/bids", { shipmentId: legs[1].id, price: 50, days: 1 })).status, 400);
  assert.equal((await call("broker", "/bids", { shipmentId: legs[0].id, price: 50, days: 1 })).status, 400);
  assert.equal((await call("carrier", "/bids", { shipmentId: order.id, price: 50, days: 1 })).status, 400);
  // Assign the three stages and pay each directly.
  const providers = ["carrier", "broker", "carrier"];
  for (const [i, leg] of legs.entries()) {
    assert.equal(
      (await call(providers[i], "/bids", { shipmentId: leg.id, price: 100 + i, days: 1 })).status,
      201,
    );
    const bid = (await call("merchant", "/state")).body.bids.find((b) => b.shipmentId === leg.id);
    assert.equal((await call("merchant", `/shipments/${leg.id}/accept`, { bidId: bid.id })).status, 200);
    await call("merchant", `/shipments/${leg.id}/action`, { action: "pay_direct" });
    await call(providers[i], `/shipments/${leg.id}/action`, { action: "confirm_payment" });
  }
  const act = (who, leg, action) => call(who, `/shipments/${leg.id}/action`, { action });
  // Clearance cannot start before goods reach the crossing.
  assert.equal((await act("broker", legs[1], "dispatch")).body.error, "Previous stage not finished");
  for (const [i, leg] of legs.entries()) {
    assert.equal((await act(providers[i], leg, "dispatch")).status, 200);
    assert.equal((await act(providers[i], leg, "arrive")).status, 200);
    assert.equal((await act("merchant", leg, "confirm")).status, 200);
  }
  const done = (await call("merchant", "/state")).body.shipments.find((s) => s.id === order.id);
  assert.equal(done.status, "delivered");
  // A fresh order can be cancelled as a whole before anything started.
  const second = (
    await call("merchant", "/shipments", {
      ...shipment,
      originCountry: "SY",
      destinationCountry: "TR",
      transportType: "crossBorder",
      crossing: "bab",
    })
  ).body;
  assert.equal((await call("merchant", `/shipments/${second.id}/action`, { action: "cancel" })).status, 200);
  const after = (await call("merchant", "/state")).body.shipments.filter((s) => s.parentId === second.id);
  assert.ok(after.every((s) => s.status === "cancelled"));
});

test("border notices, WhatsApp alerts and rejection reasons", async (t) => {
  const { waNumber, waLink } = await import("../shared/wa.js");
  assert.equal(waNumber("+90 532 000 11 22"), "905320001122");
  assert.equal(waNumber("00963 944 123 456"), "963944123456");
  assert.equal(waNumber("0532 000 11 22"), "", "local numbers need the country code");
  assert.equal(waLink("", "a b"), "https://wa.me/?text=a%20b");

  const server = await startServer(3219, { DEMO_MODE: "" });
  t.after(server.stop);
  const { call } = server;
  const broker = {
    accountType: "broker",
    name: "Gate Clearance",
    email: "gate@test.local",
    password,
    ...personFields,
    taxId: "1234567890",
    license: "GM-77",
  };
  assert.equal((await call("b", "/auth/register", broker)).body.error, "Choose your crossings");
  assert.equal((await call("b", "/auth/register", { ...broker, crossings: "bab,nowhere" })).status, 400);
  const reg = await call("b", "/auth/register", { ...broker, crossings: "bab,salameh" });
  assert.equal(reg.status, 200);
  assert.deepEqual(reg.body.user.details.crossings, ["bab", "salameh"]);
  const bid = reg.body.user.id;
  assert.equal(
    (
      await call(
        "b",
        "/profile",
        {
          about: "Clearance at Bab al-Hawa",
          services: "Clearance",
          contactEmail: "ops@gate.test",
          companyEmails: true,
          whatsappNotify: true,
        },
        "PUT",
      )
    ).status,
    200,
  );

  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  // WhatsApp number for admin alerts must be international.
  assert.equal((await call("owner", "/admin/settings", { adminWhatsapp: "0532" }, "PUT")).status, 400);
  assert.equal(
    (await call("owner", "/admin/settings", { adminWhatsapp: "+90 532 000 11 22" }, "PUT")).status,
    200,
  );
  // New sign-ups now also alert the administrator on WhatsApp.
  await call("s", "/auth/register", { ...broker, email: "second@test.local", crossings: "rai" });
  // Border notices: only the administrator posts; everyone can read them.
  const notice = {
    date: "2026-10-12",
    title: "Queue at Öncüpınar",
    body: "Expect delays",
    crossing: "salameh",
  };
  assert.equal((await call("b", "/admin/border-notices", notice)).status, 403);
  assert.equal((await call("owner", "/admin/border-notices", { ...notice, date: "12/10" })).status, 400);
  assert.equal((await call("owner", "/admin/border-notices", notice)).status, 200);
  const published = (await call("anon", "/border")).body.notices;
  assert.equal(published[0].title, "Queue at Öncüpınar");

  // Rejecting needs a reason; the company sees it in its notifications and by email/WhatsApp.
  assert.equal((await call("owner", `/admin/accounts/${bid}/review`, { status: "rejected" })).status, 400);
  assert.equal(
    (await call("owner", `/admin/accounts/${bid}/review`, { status: "rejected", reason: "Licence expired" }))
      .status,
    200,
  );
  const mine = (await call("b", "/state")).body;
  assert.equal(mine.notifications.find((n) => n.event === "verification_rejected").detail, "Licence expired");
  assert.equal(mine.settings, undefined, "platform settings stay private");
  assert.equal(mine.whatsappOutbox, undefined);
  assert.equal(mine.borderNotices[0].title, "Queue at Öncüpınar");
  const listed = (await call("owner", "/admin/accounts")).body.find((a) => a.id === bid);
  assert.equal(listed.rejectionReason, "Licence expired");
  const saved = JSON.parse(await readFile(resolve(server.directory, "state.json"), "utf8"));
  const wa = saved.whatsappOutbox.find((x) => x.to === "905550000000");
  assert.ok(wa && wa.text.includes("Licence expired") && !/\n/.test(wa.text));
  assert.ok(
    saved.whatsappOutbox.some((x) => x.to === "905320001122"),
    "admin alert queued",
  );

  const id = published[0].id;
  assert.equal((await call("owner", `/admin/border-notices/${id}`, {}, "DELETE")).status, 200);
  assert.equal((await call("anon", "/border")).body.notices.length, 0);
});

test("one sign-in form, international phones, border alerts and queue reports", async (t) => {
  const server = await startServer(3220, { DEMO_MODE: "" });
  t.after(server.stop);
  const { call } = server;
  const merchant = {
    accountType: "merchant",
    name: "Alert Trader",
    email: "trader@test.local",
    password,
    ...personFields,
    taxId: "1234567890",
    activity: "import",
    products: "Textiles",
  };
  const local = await call("m", "/auth/register", { ...merchant, phone: "0532 000 11 22" });
  assert.equal(local.body.error, "Phone must be international");
  const m = (await call("m", "/auth/register", merchant)).body.user;
  const c = (
    await call("c", "/auth/register", {
      ...merchant,
      accountType: "carrier",
      email: "haul@test.local",
      name: "Alert Haulage",
      license: "L-9",
      fleetSize: 3,
      routes: "Gaziantep - Aleppo",
    })
  ).body.user;
  // Sign-in needs only email and password; the account type comes from registration.
  assert.equal(
    (await call("c2", "/auth/login", { email: "haul@test.local", password })).body.user.role,
    "carrier",
  );
  await call("owner", "/auth/login", { email: "owner@test.local", password: "Owner-test-password-2026" });
  for (const u of [m, c])
    assert.equal((await call("owner", `/admin/accounts/${u.id}/review`, { status: "approved" })).status, 200);
  await call("owner", "/admin/border-notices", {
    date: "2026-10-12",
    title: "Eid closure",
    body: "Crossings closed for two days",
  });
  const notes = (await call("m", "/state")).body.notifications;
  assert.equal(notes.find((n) => n.event === "border_notice").detail, "Eid closure");
  // Only carriers and brokers report queues; reports are public without the reporter.
  assert.equal((await call("m", "/crossing-reports", { crossing: "bab", level: 2 })).status, 403);
  assert.equal((await call("c", "/crossing-reports", { crossing: "bab", level: 9 })).status, 400);
  assert.equal(
    (await call("c", "/crossing-reports", { crossing: "bab", level: 3, note: "Yard full" })).status,
    201,
  );
  const report = (await call("anon", "/border")).body.reports[0];
  assert.equal(report.level, 3);
  assert.equal(report.note, "Yard full");
  assert.equal(report.userId, undefined);
});

test("truck tracking: crossing detection, receiver link, photos and proof of delivery", async (t) => {
  const { trackingWatch } = await import("../server/tracking.js");
  const { estimateArrival, parsePoint } = await import("../shared/geo.js");
  // Silent trucks raise one alert for the owner and the carrier.
  const old = new Date(Date.now() - 7 * 3600000).toISOString();
  const fake = {
    users: [],
    notifications: [],
    trackingEvents: [],
    shipments: [
      { id: "x", ownerId: "o", carrierId: "c", status: "transit", lastPosition: { lat: 1, lng: 1, at: old } },
    ],
  };
  assert.equal(trackingWatch(fake), true);
  assert.equal(trackingWatch(fake), false, "no repeated alert");
  assert.deepEqual(fake.notifications.map((n) => n.userId).sort(), ["c", "o"]);
  assert.ok(
    estimateArrival({ lat: 37.06, lng: 37.38, at: new Date().toISOString() }, { lat: 36.64, lng: 37.08 }).km >
      50,
  );
  assert.deepEqual(parsePoint("https://www.google.com/maps/@36.2,37.1,14z"), { lat: 36.2, lng: 37.1 });

  const server = await startServer(3221, { DEMO_MODE: "true" });
  t.after(server.stop);
  const { call } = server;
  for (const who of ["merchant", "carrier"]) await call(who, "/login", { userId: who });
  const order = (
    await call("merchant", "/shipments", {
      ...shipment,
      destination: "Aleppo",
      originCountry: "TR",
      destinationCountry: "SY",
      transportType: "crossBorder",
      crossing: "salameh",
    })
  ).body;
  const legId = order.legs[0];
  await call("carrier", "/bids", { shipmentId: legId, price: 150, days: 1 });
  const bid = (await call("merchant", "/state")).body.bids.find((b) => b.shipmentId === legId);
  await call("merchant", `/shipments/${legId}/accept`, { bidId: bid.id });
  await call("merchant", `/shipments/${legId}/action`, { action: "pay_direct" });
  await call("carrier", `/shipments/${legId}/action`, { action: "confirm_payment" });
  assert.equal((await call("carrier", `/shipments/${legId}/action`, { action: "dispatch" })).status, 200);
  const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
  // Gaziantep → Öncüpınar gate (wait two hours) → away from the crossing.
  const sent = await call("carrier", `/shipments/${legId}/positions`, {
    positions: [
      { lat: 37.06, lng: 37.38, at: ago(3) },
      { lat: 36.645, lng: 37.08, at: ago(2) },
      { lat: 36.642, lng: 37.084, at: ago(1) },
      { lat: 36.7, lng: 37.2, at: ago(0) },
    ],
  });
  assert.equal(sent.status, 200);
  assert.equal(
    (await call("carrier", `/shipments/${legId}/positions`, { positions: [{ lat: 500 }] })).status,
    400,
  );
  let mine = (await call("merchant", "/state")).body;
  const leg = mine.shipments.find((s) => s.id === legId);
  assert.equal(leg.track.length, 4);
  assert.ok(leg.crossingArrivedAt && leg.crossingLeftAt);
  assert.ok(mine.notifications.some((n) => n.event === "crossing_arrived"));
  assert.ok(mine.crossingReports.some((r) => r.role === "gps" && r.crossing === "salameh" && r.level === 2));
  // The delivery code and receiver link stay with the owner.
  const carrierView = (await call("carrier", "/state")).body.shipments.find((s) => s.id === legId);
  assert.equal(carrierView.deliveryCode, undefined);
  assert.match(leg.deliveryCode, /^\d{6}$/);
  assert.equal((await call("carrier", `/shipments/${order.id}/public-link`, {})).status, 403);
  const { token } = (await call("merchant", `/shipments/${order.id}/public-link`, {})).body;
  const view = (await call("anon", `/public/track/${token}`)).body;
  assert.equal(view.isOrder, true);
  assert.equal(view.position.lat, 36.7);
  assert.equal(JSON.stringify(view).includes(leg.deliveryCode), false);
  assert.ok(view.events.some((e) => e.event === "crossing_left"));
  // Photos and proof of delivery.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]).toString("base64");
  const png = Buffer.from("89504e470d0a1a0a0102030405", "hex").toString("base64");
  assert.equal(
    (
      await call("carrier", `/shipments/${legId}/photos`, {
        stage: "sealed",
        mime: "image/jpeg",
        content: jpeg,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call("carrier", `/shipments/${legId}/photos`, {
        stage: "selfie",
        mime: "image/jpeg",
        content: jpeg,
      })
    ).status,
    400,
  );
  const proof = { recipient: "Border Clearance Co.", mime: "image/png", content: png };
  assert.equal(
    (
      await call("carrier", `/shipments/${legId}/proof`, {
        ...proof,
        code: "000000" === leg.deliveryCode ? "111111" : "000000",
      })
    ).body.error,
    "Wrong delivery code",
  );
  assert.equal(
    (await call("carrier", `/shipments/${legId}/proof`, { ...proof, code: leg.deliveryCode })).status,
    201,
  );
  mine = (await call("merchant", "/state")).body;
  const done = mine.shipments.find((s) => s.id === legId);
  assert.equal(done.status, "arrived");
  assert.equal(done.pod.codeVerified, true);
  assert.equal(
    mine.shipmentDocuments.filter((d) => d.shipmentId === legId && d.kind.startsWith("photo_")).length,
    2,
  );
  // Turning the link off hides the page.
  await call("merchant", `/shipments/${order.id}/public-link`, { enabled: false });
  assert.equal((await call("anon", `/public/track/${token}`)).status, 404);
});

test("changing ADMIN_EMAIL moves the administrator's sign-in email", async (t) => {
  const first = await startServer(3222, { DEMO_MODE: "" });
  const login = (server, email, pass = "Owner-test-password-2026") =>
    server.call("o", "/auth/login", { email, password: pass });
  assert.equal((await login(first, "owner@test.local")).status, 200);
  await first.stop();
  const second = await startServer(3222, {
    DEMO_MODE: "",
    DATA_DIR: first.directory,
    ADMIN_EMAIL: "new-owner@test.local",
  });
  t.after(second.stop);
  assert.equal((await login(second, "new-owner@test.local")).status, 200);
  assert.notEqual((await login(second, "owner@test.local")).status, 200);
});
