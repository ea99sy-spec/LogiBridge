import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";

test("HTTP workflows, permissions, validation, feature flags and persistence", async (t) => {
  const port = 3197,
    base = `http://127.0.0.1:${port}/api`,
    directory = resolve("tmp", "api-tests", randomUUID());
  let child;
  async function start() {
    child = spawn(process.execPath, ["server/index.js", "--production"], {
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        DATA_DIR: directory,
        DEMO_MODE: "true",
        DATABASE_URL: "",
        REDIS_URL: "",
        AI_SERVICE_URL: "",
        ADMIN_EMAIL: "admin@test.local",
        ADMIN_PASSWORD: "Test-only-admin-password-2026",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (x) => (output += x));
    child.stderr.on("data", (x) => (output += x));
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try {
        if ((await fetch(base + "/health")).ok) return;
      } catch {}
      await delay(100);
    }
    throw new Error("Server did not start: " + output);
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
  }
  t.after(stop);
  await start();
  const cookies = {};
  async function call(user, path, body, method = "POST") {
    const res = await fetch(base + path, {
      method: body === undefined ? "GET" : method,
      headers: {
        ...(cookies[user] ? { cookie: cookies[user] } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await res.json();
    return { status: res.status, body: result };
  }
  async function login(user) {
    const res = await fetch(base + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user }),
    });
    assert.equal(res.status, 200);
    cookies[user] = res.headers.get("set-cookie").split(";")[0];
  }
  assert.equal((await call("none", "/state")).status, 401);
  for (const u of ["merchant", "carrier", "admin", "supplier"]) await login(u);
  assert.equal((await call("merchant", "/flags", { tracking: false }, "PATCH")).status, 403);
  assert.equal((await call("carrier", "/shipments", { title: "bad" })).status, 403);
  assert.equal((await call("merchant", "/shipments", { title: "bad", volume: -1 })).status, 400);
  const shipment = (
    await call("merchant", "/shipments", {
      title: "Integration cargo",
      origin: "Gaziantep",
      destination: "Istanbul",
      originCountry: "TR",
      destinationCountry: "TR",
      transportType: "domesticTR",
      description: "Cargo test",
      hsCode: "010121",
      senderName: "Test Sender",
      recipientName: "Test Recipient",
      phone: "TEST-ONLY-PHONE",
      destinationAddress: "Test delivery address",
      category: "textiles",
      volume: 7,
      weight: 500,
      date: "2099-01-01",
    })
  ).body;
  assert.ok(shipment.id);
  for (const [country, type] of [
    ["TR", "domesticTR"],
    ["SY", "domesticSY"],
  ]) {
    const domestic = await call("merchant", "/shipments", {
      title: "Domestic cargo",
      origin: "City A",
      destination: "City B",
      originCountry: country,
      destinationCountry: country,
      transportType: type,
      hsCode: "010121",
      category: "other",
      volume: 1,
      weight: 100,
      date: "2099-01-01",
    });
    assert.equal(domestic.status, 201);
    assert.equal(domestic.body.crossing, null);
    assert.equal(domestic.body.transportType, type);
  }
  // A Türkiye⇄Syria shipment needs a border crossing.
  assert.equal(
    (
      await call("merchant", "/shipments", {
        ...shipment,
        originCountry: "TR",
        destinationCountry: "SY",
        transportType: "crossBorder",
        crossing: null,
      })
    ).status,
    400,
  );
  assert.equal(shipment.hsCode, "010121");
  assert.equal(
    (await call("merchant", "/state")).body.shipments.find((s) => s.id === shipment.id).hsCode,
    "010121",
  );
  assert.equal((await call("merchant", "/shipments", { ...shipment, hsCode: "12ABC3" })).status, 400);
  assert.equal((await call("merchant", "/shipments", { ...shipment, hsCode: "" })).status, 400);
  assert.equal((await call("merchant", "/shipments", { ...shipment, hsCode: undefined })).status, 400);
  assert.equal(
    (await call("carrier", "/state")).body.shipments.find((s) => s.id === shipment.id).privateDetails,
    undefined,
  );
  assert.equal(
    (await call("carrier", "/bids", { shipmentId: shipment.id, price: 400, days: 2, note: "Test offer" }))
      .status,
    201,
  );
  assert.equal(
    (await call("carrier", "/bids", { shipmentId: shipment.id, price: 500, days: 2, note: "Duplicate" }))
      .status,
    400,
  );
  const bid = (await call("merchant", "/state")).body.bids.find((x) => x.shipmentId === shipment.id);
  assert.ok(bid);
  assert.equal((await call("merchant", `/shipments/${shipment.id}/accept`, { bidId: bid.id })).status, 200);
  assert.equal(
    (await call("carrier", "/state")).body.shipments.find((s) => s.id === shipment.id).privateDetails.phone,
    "TEST-ONLY-PHONE",
  );
  assert.equal((await call("merchant", `/shipments/${shipment.id}/accept`, { bidId: bid.id })).status, 400);
  assert.equal((await call("carrier", `/shipments/${shipment.id}/action`, { action: "fund" })).status, 400);
  for (const [user, action] of [
    ["merchant", "fund"],
    ["carrier", "dispatch"],
    ["carrier", "arrive"],
    ["merchant", "confirm"],
  ]) {
    const result = await call(user, `/shipments/${shipment.id}/action`, { action });
    assert.equal(result.status, 200, `${action}: ${JSON.stringify(result.body)}`);
    if (action === "dispatch") {
      assert.equal(
        (
          await call("merchant", `/shipments/${shipment.id}/location`, {
            location: "Border",
            note: "Test location",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("carrier", `/shipments/${shipment.id}/location`, {
            location: "Border",
            note: "Test location",
          })
        ).status,
        200,
      );
    }
  }
  let state = (await call("merchant", "/state")).body;
  assert.equal(state.shipments.find((s) => s.id === shipment.id).lastLocation, "Border");
  assert.ok(state.trackingEvents.some((e) => e.shipmentId === shipment.id && e.event === "confirm"));
  assert.equal(
    (await call("supplier", "/state")).body.trackingEvents.some((e) => e.shipmentId === shipment.id),
    false,
  );
  const escrow = state.escrows.find((e) => e.shipmentId === shipment.id);
  assert.equal(escrow.status, "released");
  assert.equal(escrow.commission, 0);
  assert.equal(escrow.carrierNet, 400);
  const rating = { shipmentId: shipment.id, score: 5, comment: "Delivered safely" };
  assert.equal((await call("merchant", "/ratings", rating)).status, 200);
  assert.equal((await call("merchant", "/ratings", rating)).status, 400);
  assert.equal((await call("carrier", "/ratings", { ...rating, score: 4 })).status, 200);
  const group = state.groups[0];
  const results = await Promise.all([
    call("merchant", `/groups/${group.id}/reserve`, { volume: 20 }),
    call("merchant", `/groups/${group.id}/reserve`, { volume: 20 }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal((await call("carrier", "/fleets", { name: "Truck", capacity: 60 })).status, 200);
  assert.equal(
    (
      await call("carrier", "/groups", {
        origin: "Mersin",
        destination: "Aleppo",
        capacity: 50,
        pricePerM3: 40,
        date: "2099-01-01",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("merchant", "/checklist", { crossing: "bab", key: "invoice", checked: true })).status,
    200,
  );
  assert.equal(
    (await call("merchant", "/messages", { recipientId: "carrier", text: "Hello", targetLanguage: "tr" }))
      .status,
    200,
  );
  const carrierState = (await call("carrier", "/state")).body;
  assert.equal(carrierState.messages[0].text, "Hello");
  assert.equal(carrierState.messages[0].translationMode, "unavailable");
  assert.equal((await call("supplier", "/state")).body.messages.length, 0);
  const advisory = (await call("merchant", "/customs", { description: "Cotton textiles", language: "ar" }))
    .body;
  assert.equal(advisory.mode, "demo");
  assert.equal(advisory.hsCode, null);
  assert.equal(
    (
      await call("merchant", "/kyb", {
        company: "Test",
        registration: "123",
        filename: "bad.pdf",
        mime: "application/pdf",
        content: Buffer.from("Not a PDF").toString("base64"),
      })
    ).status,
    400,
  );
  const document = {
    company: "Test Company",
    registration: "123",
    filename: "registration.pdf",
    mime: "application/pdf",
    content: Buffer.from("%PDF-1.4\nDemo file header").toString("base64"),
  };
  const shippingDoc = { ...document, shipmentId: shipment.id, kind: "invoice" };
  assert.equal((await call("supplier", "/shipment-documents", shippingDoc)).status, 400);
  assert.equal((await call("merchant", "/shipment-documents", shippingDoc)).status, 201);
  const attached = (await call("merchant", "/state")).body.shipmentDocuments.find(
    (d) => d.shipmentId === shipment.id,
  );
  assert.equal(attached.encryptedContent, undefined);
  assert.equal(
    (await fetch(base + `/shipment-documents/${attached.id}`, { headers: { cookie: cookies.carrier } }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(base + `/shipment-documents/${attached.id}`, { headers: { cookie: cookies.supplier } }))
      .status,
    403,
  );
  assert.equal(
    (await call("supplier", "/state")).body.shipmentDocuments.some((d) => d.id === attached.id),
    false,
  );
  assert.equal((await call("merchant", "/admin/accounts")).status, 403);
  assert.ok(
    (await call("admin", "/admin/accounts")).body.some(
      (a) => a.id === "demo-review-company" && a.applicationCount === 1,
    ),
  );
  assert.equal((await call("merchant", "/kyb", document)).status, 200);
  state = (await call("merchant", "/state")).body;
  const doc = state.kyb[0];
  assert.equal(doc.content, undefined);
  assert.equal((await call("carrier", "/state")).body.kyb.length, 0);
  assert.equal((await call("admin", `/kyb/${doc.id}/review`, { status: "approved" })).status, 200);
  assert.equal((await call("merchant", "/state")).body.user.verified, true);
  assert.equal(
    (await call("supplier", "/products", { title: "Temperature sensor", price: 55, type: "sale" })).status,
    200,
  );
  assert.equal((await call("merchant", "/orders", { productId: "p1", quantity: 2 })).body.total, 130);
  const sellerState = (await call("supplier", "/state")).body;
  assert.equal(sellerState.shipments.length, 0);
  const sellerOrder = sellerState.orders.find((o) => o.productId === "p1");
  assert.ok(sellerOrder);
  assert.equal(
    (await call("merchant", `/orders/${sellerOrder.id}/status`, { status: "confirmed" }, "PATCH")).status,
    403,
  );
  assert.equal(
    (await call("supplier", `/orders/${sellerOrder.id}/status`, { status: "completed" }, "PATCH")).status,
    400,
  );
  assert.equal(
    (await call("supplier", `/orders/${sellerOrder.id}/status`, { status: "confirmed" }, "PATCH")).status,
    200,
  );
  assert.equal(
    (await call("supplier", `/orders/${sellerOrder.id}/status`, { status: "completed" }, "PATCH")).status,
    200,
  );
  assert.equal((await call("supplier", "/orders", { productId: "p1", quantity: 1 })).status, 403);
  assert.equal(
    (await call("supplier", "/customs", { description: "Test cargo", language: "ar" })).status,
    403,
  );
  // Platform switches are global, so a demo administrator may not change them.
  assert.equal((await call("admin", "/flags", { marketplace: false }, "PATCH")).status, 403);
  {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.local", password: "Test-only-admin-password-2026" }),
    });
    assert.equal(r.status, 200);
    cookies.flagAdmin = r.headers.get("set-cookie").split(";")[0];
  }
  assert.equal((await call("flagAdmin", "/flags", { marketplace: false }, "PATCH")).status, 200);
  assert.equal((await call("merchant", "/orders", { productId: "p1", quantity: 1 })).status, 400);
  assert.equal((await call("flagAdmin", "/flags", { contracts: true }, "PATCH")).status, 200);
  assert.equal(
    (await call("merchant", "/contracts", { shipmentId: shipment.id, name: "Demo Merchant" })).status,
    200,
  );
  assert.equal((await call("merchant", "/plan", { plan: "pro" })).status, 200);
  const password = "Test-only-account-password-2026";
  async function register(accountType, key) {
    const r = await fetch(base + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType,
        email: key + "@test.local",
        password,
        taxId: accountType === "individual" ? undefined : "TEST-TAX-123",
        name: "Test " + key,
        acceptTerms: true,
        phone: "+963 11 000 0000",
        country: "SY",
        city: "Aleppo",
        activity: "import",
        products: "Test goods",
        license: "TEST-LICENSE",
        fleetSize: 3,
        routes: "Test route",
        equipment: "Test equipment",
      }),
    });
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    cookies[key] = r.headers.get("set-cookie").split(";")[0];
    return body.user;
  }
  async function signIn(email, accountType, key, pass = password) {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, accountType }),
    });
    if (r.ok) cookies[key] = r.headers.get("set-cookie").split(";")[0];
    return r;
  }
  const business = await register("merchant", "business"),
    person = await register("individual", "person");
  assert.equal(business.taxId, "TESTTAX123");
  assert.equal(
    (
      await call("none", "/auth/register", {
        accountType: "merchant",
        email: "taxless@test.local",
        password,
        name: "No tax",
        acceptTerms: true,
        phone: "+963 11 000 0000",
        country: "SY",
        city: "Aleppo",
        activity: "import",
        products: "Test goods",
      })
    ).status,
    400,
  );
  assert.equal((await call("business", "/state")).body.approvalRequired, true);
  assert.equal((await call("business", "/shipments", { ...shipment })).status, 403);
  assert.equal((await call("business", "/orders", { productId: "p1", quantity: 1 })).status, 403);
  assert.equal(
    (
      await call(
        "business",
        "/profile",
        {
          about: "Test company introduction",
          services: "Cargo transport",
          website: "https://example.com",
          location: "TR",
          contactEmail: "contact@example.com",
          companyEmails: true,
        },
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal((await call("business", "/state")).body.emailOutbox, undefined);
  assert.equal(business.verified, false);
  assert.equal(person.accountType, "individual");
  assert.equal(
    (
      await call("none", "/auth/register", {
        accountType: "admin",
        email: "bad@test.local",
        password,
        name: "Bad",
      })
    ).status,
    400,
  );
  assert.equal((await call("none", "/login", { userId: business.id })).status, 400);
  // Signing in from another account page still opens the account's own workspace.
  {
    const r = await signIn("business@test.local", "carrier", "otherPage");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).user.accountType, "merchant");
  }
  assert.equal((await signIn("business@test.local", "merchant", "wrong", "incorrect")).status, 401);
  assert.equal((await signIn("business@test.local", "merchant", "business")).status, 200);
  assert.equal(
    (await signIn("admin@test.local", "admin", "realAdmin", "Test-only-admin-password-2026")).status,
    200,
  );
  assert.equal((await call("business", `/admin/accounts/${business.id}`)).status, 403);
  assert.equal((await call("admin", `/admin/accounts/${business.id}`)).status, 403);
  assert.equal(
    (await call("realAdmin", "/admin/contact", { email: "support@test.local" }, "PUT")).status,
    200,
  );
  assert.equal((await call("none", "/health")).body.supportEmail, "support@test.local");
  assert.equal((await call("realAdmin", "/admin/email-status")).body.configured, false);
  const detail = (await call("realAdmin", `/admin/accounts/${business.id}`)).body;
  assert.equal(detail.account.taxId, "TESTTAX123");
  assert.equal(detail.account.credential, undefined);
  const companyDoc = { ...document, country: "TR", taxId: "TEST-TAX-123", registry: "Test trade registry" };
  assert.equal((await call("business", "/kyb", companyDoc)).status, 200);
  const realDoc = (await call("business", "/state")).body.kyb[0];
  assert.equal(
    (await call("realAdmin", `/admin/accounts/${business.id}`)).body.applications[0].encryptedContent,
    undefined,
  );
  assert.equal(realDoc.encryptedContent, undefined);
  assert.equal(
    (await call("admin", "/state")).body.kyb.some((d) => d.id === realDoc.id),
    false,
  );
  assert.equal((await call("admin", `/kyb/${realDoc.id}/review`, { status: "approved" })).status, 403);
  assert.equal((await call("realAdmin", `/kyb/${realDoc.id}/review`, { status: "approved" })).status, 400);
  assert.equal(
    (
      await call("realAdmin", `/kyb/${realDoc.id}/review`, {
        status: "approved",
        documentMatches: true,
        registryMatches: true,
        businessActive: true,
        reference: "Test reference only; not an actual registry result",
      })
    ).status,
    200,
  );
  assert.equal((await call("business", "/state")).body.user.verificationLevel, "manual_review");
  const passport = {
    ...document,
    country: "SY",
    fullName: "Test Person",
    passportNumber: "TEST-PASSPORT-1234",
    expiry: "2000-01-01",
  };
  assert.equal((await call("person", "/kyb", passport)).status, 400);
  passport.expiry = "2099-01-01";
  assert.equal((await call("person", "/kyb", passport)).status, 200);
  const personDoc = (await call("person", "/state")).body.kyb[0];
  assert.equal(personDoc.kind, "person");
  assert.equal(personDoc.passportLast4, "1234");
  assert.equal(
    (await call("realAdmin", `/kyb/${personDoc.id}/review`, { status: "approved", documentMatches: true }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("realAdmin", `/kyb/${personDoc.id}/review`, {
        status: "approved",
        documentMatches: true,
        passportMatches: true,
      })
    ).status,
    200,
  );
  await register("carrier", "realCarrier");
  assert.equal(
    (
      await call(
        "realCarrier",
        "/profile",
        {
          about: "Carrier intro",
          services: "Road freight",
          contactEmail: "ops@carrier.test",
          companyEmails: true,
        },
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call("realCarrier", "/kyb", {
        ...document,
        country: "TR",
        taxId: "TEST-TAX-123",
        registry: "Test carrier registry",
      })
    ).status,
    200,
  );
  const carrierDoc = (await call("realCarrier", "/state")).body.kyb[0];
  assert.equal(
    (
      await call("realAdmin", `/kyb/${carrierDoc.id}/review`, {
        status: "approved",
        documentMatches: true,
        registryMatches: true,
        businessActive: true,
        reference: "Test carrier approval",
      })
    ).status,
    200,
  );
  const bank = {
    enabled: true,
    beneficiary: "Test beneficiary",
    bank: "Test bank",
    accountNumber: "TEST-ACCOUNT-ONLY",
    swift: "TESTSWIFT",
    currency: "USD",
  };
  assert.equal((await call("admin", "/payments/bank-account", bank, "PUT")).status, 403);
  assert.equal((await call("realAdmin", "/payments/bank-account", bank, "PUT")).status, 200);
  const paidShipment = (await call("business", "/shipments", { ...shipment, title: "Bank transfer cargo" }))
    .body;
  assert.equal(
    (
      await call("realCarrier", "/bids", {
        shipmentId: paidShipment.id,
        price: 77,
        days: 2,
        note: "Real account test",
      })
    ).status,
    201,
  );
  assert.equal((await call("business", `/shipments/${paidShipment.id}/submit`, {})).status, 400);
  assert.equal(
    (
      await call("business", "/shipment-documents", {
        ...document,
        kind: "invoice",
        shipmentId: paidShipment.id,
      })
    ).status,
    201,
  );
  // Still incomplete: packing list and certificate of origin are required too.
  assert.equal((await call("business", `/shipments/${paidShipment.id}/submit`, {})).status, 400);
  for (const kind of ["packing", "origin"])
    assert.equal(
      (await call("business", "/shipment-documents", { ...document, kind, shipmentId: paidShipment.id }))
        .status,
      201,
    );
  // Only people working on the shipment can request documents (the carrier has only bid so far).
  assert.equal(
    (await call("realCarrier", "/document-requests", { shipmentId: paidShipment.id, kind: "customs" }))
      .status,
    400,
  );
  assert.equal((await call("business", `/shipments/${paidShipment.id}/submit`, {})).body.completed, true);
  assert.equal((await call("business", `/shipments/${paidShipment.id}/submit`, {})).status, 200);
  const paidBid = (await call("business", "/state")).body.bids.find((b) => b.shipmentId === paidShipment.id);
  await call("business", `/shipments/${paidShipment.id}/accept`, { bidId: paidBid.id });
  // Now assigned, the carrier asks the owner for a document; the owner's upload answers it.
  assert.equal(
    (
      await call("realCarrier", "/document-requests", {
        shipmentId: paidShipment.id,
        kind: "other",
        title: "Driver authorisation letter",
      })
    ).status,
    201,
  );
  const askedFor = (await call("business", "/state")).body.documentRequests.find(
    (r) => r.shipmentId === paidShipment.id,
  );
  assert.equal(askedFor.status, "open");
  assert.equal(
    (
      await call("business", "/shipment-documents", {
        ...document,
        kind: "other",
        shipmentId: paidShipment.id,
        requestId: askedFor.id,
      })
    ).status,
    201,
  );
  assert.equal(
    (await call("realCarrier", "/state")).body.documentRequests.find((r) => r.id === askedFor.id).status,
    "done",
  );
  assert.equal(
    (await call("business", `/shipments/${paidShipment.id}/action`, { action: "fund" })).status,
    400,
  );
  const proof = { ...document, shipmentId: paidShipment.id, reference: "TEST-BANK-TRANSFER", amount: 1 };
  assert.equal((await call("person", "/payments/receipts", proof)).status, 400);
  assert.equal((await call("business", "/payments/receipts", proof)).status, 201);
  assert.equal((await call("business", "/payments/receipts", proof)).status, 400);
  const payment = (await call("business", "/state")).body.payments[0];
  assert.equal(payment.amount, 77);
  assert.equal(payment.encryptedContent, undefined);
  assert.equal((await call("person", "/state")).body.payments.length, 0);
  assert.equal((await call("admin", "/state")).body.payments.length, 0);
  assert.equal(
    (await fetch(base + `/payments/${payment.id}/document`, { headers: { cookie: cookies.person } })).status,
    403,
  );
  assert.equal(
    (await fetch(base + `/payments/${payment.id}/document`, { headers: { cookie: cookies.realAdmin } }))
      .status,
    200,
  );
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/review`, {
        status: "approved",
        note: "Test bank statement reference",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/review`, {
        status: "approved",
        bankReceived: true,
        note: "Test bank statement reference",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/review`, {
        status: "approved",
        bankReceived: true,
        note: "Duplicate",
      })
    ).status,
    400,
  );
  for (const [who, action] of [
    ["realCarrier", "dispatch"],
    ["realCarrier", "arrive"],
    ["business", "confirm"],
  ])
    assert.equal((await call(who, `/shipments/${paidShipment.id}/action`, { action })).status, 200);
  const paidEscrow = (await call("business", "/state")).body.escrows.find(
    (e) => e.shipmentId === paidShipment.id,
  );
  assert.equal(paidEscrow.simulated, false);
  assert.equal(paidEscrow.status, "payout_pending");
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/transfer`, {
        ...document,
        reference: "TEST-PAYOUT",
        sent: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/transfer`, {
        ...document,
        reference: "TEST-PAYOUT",
        sent: true,
      })
    ).status,
    200,
  );
  const finalPayment = (await call("business", "/state")).body.payments[0];
  assert.equal(finalPayment.transfer.amount, 77, "no commission: the carrier gets the full price");
  assert.equal(finalPayment.transferContent, undefined);
  assert.equal(
    (
      await call("realAdmin", `/payments/${payment.id}/transfer`, {
        ...document,
        reference: "TEST-PAYOUT",
        sent: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("business", "/state")).body.escrows.find((e) => e.shipmentId === paidShipment.id).status,
    "released",
  );
  const list = (await call("supplier", "/state")).body.users;
  assert.ok(list.every((u) => !u.credential && !u.email));
  assert.equal(
    (
      await call("person", "/messages", {
        recipientId: business.id,
        text: "Test reply",
        targetLanguage: "en",
      })
    ).status,
    200,
  );
  const accountsDirectory = (await call("person", "/directory")).body;
  assert.ok(accountsDirectory.some((u) => u.id === business.id && u.profile.services === "Cargo transport"));
  assert.ok(accountsDirectory.every((u) => !u.email && !u.taxId && !u.credential));
  const saved = await readFile(resolve(directory, "state.json"), "utf8");
  assert.ok(!saved.includes(passport.passportNumber));
  assert.ok(!saved.includes(document.content));
  assert.ok(!saved.includes(password));
  const outbox = JSON.parse(saved).emailOutbox;
  assert.ok(outbox.some((e) => e.event === "registered" && e.userId === business.id));
  assert.ok(outbox.some((e) => e.event === "login"));
  assert.ok(outbox.some((e) => e.event === "approved" && e.userId === business.id));
  assert.equal(outbox.filter((e) => e.event === "shipment_submitted" && e.userId === business.id).length, 1);
  assert.ok(outbox.some((e) => e.event === "bid_received"));
  assert.ok(outbox.some((e) => e.event === "message_received"));
  assert.equal((await call("realAdmin", "/admin/email-status")).body.counts.pending, outbox.length);
  const download = await fetch(base + `/kyb/${personDoc.id}/document`, {
    headers: { cookie: cookies.realAdmin },
  });
  assert.equal(download.status, 200);
  assert.equal(
    Buffer.from(await download.arrayBuffer()).toString(),
    Buffer.from(document.content, "base64").toString(),
  );
  assert.equal(
    (await fetch(base + `/kyb/${personDoc.id}/document`, { headers: { cookie: cookies.admin } })).status,
    403,
  );
  for (const account of ["merchant", "carrier", "supplier", "individual", "admin"])
    assert.equal((await fetch(`http://127.0.0.1:${port}/login/${account}`)).status, 200);
  for (const path of [
    "/",
    "/accounts",
    "/workspace/dashboard",
    "/workspace/kyb",
    "/workspace/admin",
    "/workspace/newShipment",
    "/workspace/documents",
    "/workspace/tracking",
    "/workspace/companies",
    "/register/individual",
  ])
    assert.equal((await fetch(`http://127.0.0.1:${port}${path}`)).status, 200);
  assert.equal((await call("business", "/kyb", { ...companyDoc, country: "XX" })).status, 400);
  assert.equal(
    (await call("business", "/kyb", { ...companyDoc, country: "DE", registry: "Test German registry" }))
      .status,
    200,
  );
  assert.equal((await call("business", "/state")).body.kyb.at(-1).country, "DE");
  const secondDoc = (await call("business", "/state")).body.kyb.at(-1);
  assert.equal(
    (
      await call("business", "/messages", {
        recipientId: person.id,
        text: "Blocked pending company",
        targetLanguage: "en",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("realAdmin", `/kyb/${secondDoc.id}/review`, {
        status: "rejected",
        reason: "Test missing registry match",
      })
    ).status,
    200,
  );
  assert.equal((await call("business", "/state")).body.approvalRequired, true);
  assert.ok(
    JSON.parse(await readFile(resolve(directory, "state.json"), "utf8")).emailOutbox.some(
      (e) => e.event === "rejected" && e.text.includes("Test missing registry match"),
    ),
  );
  await stop();
  await start();
  await login("merchant");
  state = (await call("merchant", "/state")).body;
  assert.equal(state.shipments.find((s) => s.id === shipment.id).status, "delivered");
  assert.equal(state.checklists["bab:invoice"], true);
  assert.equal(state.flags.marketplace, false);
  assert.equal(state.user.plan, "pro");
});
