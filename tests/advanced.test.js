import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { estimatePrice, matchRoutes, reserveEquipment } from "../server/advanced.js";
test("estimates require comparable routes and preserve insufficient data", () => {
  const s = {
    users: [],
    shipments: [{ id: "s", origin: "A", destination: "B", weight: 100 }],
    bids: [{ shipmentId: "s", price: 50 }],
  };
  assert.equal(estimatePrice(s, { origin: "A", destination: "B", weight: 200 }).estimate, 100);
  assert.equal(estimatePrice(s, { origin: "A", destination: "C", weight: 100 }).estimate, null);
  assert.throws(() => estimatePrice(s, { weight: -1 }));
});
test("rental dates cannot overlap and cancellation frees equipment", () => {
  const s = {
    flags: { marketplace: true },
    products: [{ id: "p", type: "rental", price: 10, supplierId: "seller" }],
    equipmentBookings: [],
    notifications: [],
  };
  const first = reserveEquipment(
    s,
    { id: "buyer" },
    { productId: "p", start: "2099-01-01", end: "2099-01-03" },
  );
  assert.equal(first.total, 30);
  assert.throws(() =>
    reserveEquipment(s, { id: "buyer" }, { productId: "p", start: "2099-01-03", end: "2099-01-05" }),
  );
  first.status = "cancelled";
  assert.ok(reserveEquipment(s, { id: "buyer" }, { productId: "p", start: "2099-01-03", end: "2099-01-05" }));
  assert.throws(() =>
    reserveEquipment(s, { id: "buyer" }, { productId: "p", start: "2099-02-30", end: "2099-03-01" }),
  );
});
test("matching considers route, date and remaining capacity without duplicate alerts", () => {
  const s = {
      notifications: [],
      groups: [
        { carrierId: "c", origin: " A ", destination: "B", date: "2099-01-01", capacity: 10, booked: 5 },
      ],
    },
    sh = { id: "s", origin: "a", destination: "b", volume: 5, date: "2099-01-03" };
  matchRoutes(s, sh);
  matchRoutes(s, sh);
  assert.equal(s.notifications.length, 1);
  matchRoutes(s, { ...sh, id: "large", volume: 6 });
  assert.equal(s.notifications.length, 1);
});
test("driver links, booking permissions, negotiations, exports and integration keys", async (t) => {
  const port = 3198,
    base = `http://127.0.0.1:${port}`,
    child = spawn(process.execPath, ["server/index.js", "--production"], {
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        DATA_DIR: resolve("tmp", "advanced-tests", randomUUID()),
        DATABASE_URL: "",
        REDIS_URL: "",
        DEMO_MODE: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let logs = "";
  child.stdout.on("data", (x) => (logs += x));
  child.stderr.on("data", (x) => (logs += x));
  t.after(() => child.kill());
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await delay(100);
  }
  const cookies = {};
  async function call(user, path, body, method = body === undefined ? "GET" : "POST", headers = {}) {
    const r = await fetch(base + path, {
      method,
      headers: { cookie: cookies[user] || "", "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  }
  for (const user of ["merchant", "carrier", "supplier", "admin"]) {
    const r = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user }),
    });
    cookies[user] = r.headers.get("set-cookie").split(";")[0];
  }
  const payload = {
    title: "Advanced cargo",
    origin: "A",
    destination: "B",
    hsCode: "010121",
    category: "other",
    originCountry: "TR",
    destinationCountry: "TR",
    transportType: "domesticTR",
    volume: 2,
    weight: 100,
    date: "2099-01-02",
    insuranceRequested: true,
  };
  await call("carrier", "/api/groups", {
    origin: "A",
    destination: "B",
    originCountry: "TR",
    destinationCountry: "TR",
    transportType: "domesticTR",
    capacity: 20,
    pricePerM3: 10,
    date: "2099-01-02",
  });
  const sh = (await call("merchant", "/api/shipments", payload)).body;
  assert.equal(sh.insuranceStatus, "requested");
  assert.ok(
    (await call("carrier", "/api/state")).body.notifications.some(
      (n) => n.shipmentId === sh.id && n.event === "matching_opportunity",
    ),
  );
  await call("carrier", "/api/bids", { shipmentId: sh.id, price: 100, days: 2, note: "Transport" });
  let state = (await call("merchant", "/api/state")).body;
  const bid = state.bids.find((b) => b.shipmentId === sh.id);
  assert.ok(state.notifications.some((n) => n.event === "bid_received"));
  await call("merchant", "/api/shipments/" + sh.id + "/accept", { bidId: bid.id });
  await call("merchant", "/api/shipments/" + sh.id + "/action", { action: "fund" });
  assert.equal(
    (await call("merchant", "/api/driver-links", { shipmentId: sh.id, name: "Wrong" })).status,
    403,
  );
  const link = (await call("carrier", "/api/driver-links", { shipmentId: sh.id, name: "Test Driver" })).body,
    token = link.url.split("#")[1];
  const driverHeaders = { Authorization: "Bearer " + token };
  const task = (await call("none", "/driver-api/task", undefined, "GET", driverHeaders)).body;
  assert.equal(task.shipment.id, sh.id);
  for (const key of ["price", "escrows", "privateDetails", "carrierId", "weight"])
    assert.equal(task.shipment[key], undefined);
  assert.equal((await call("none", "/api/state", undefined, "GET", driverHeaders)).status, 401);
  assert.equal(
    (
      await call(
        "none",
        "/driver-api/update",
        { location: "A city", note: "Departing", action: "confirm" },
        "POST",
        driverHeaders,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "none",
        "/driver-api/update",
        { location: "A city", note: "Departing", action: "dispatch" },
        "POST",
        driverHeaders,
      )
    ).status,
    200,
  );
  state = (await call("carrier", "/api/state")).body;
  assert.ok(!JSON.stringify(state).includes(token));
  assert.ok(!JSON.stringify(state).includes("tokenHash"));
  assert.equal(state.shipments.find((s) => s.id === sh.id).status, "transit");
  await call("carrier", "/api/driver-links/" + link.id, {}, "DELETE");
  assert.equal((await call("none", "/driver-api/task", undefined, "GET", driverHeaders)).status, 401);
  const bookings = await Promise.all([
    call("merchant", "/api/equipment-bookings", { productId: "p3", start: "2099-01-01", end: "2099-01-02" }),
    call("carrier", "/api/equipment-bookings", { productId: "p3", start: "2099-01-02", end: "2099-01-03" }),
  ]);
  assert.deepEqual(bookings.map((b) => b.status).sort(), [201, 400]);
  const own = bookings.find((b) => b.status === 201).body;
  assert.equal((await call("admin", "/api/equipment-bookings/" + own.id, {}, "PATCH")).status, 400);
  await call("supplier", "/api/equipment-bookings/" + own.id, {}, "PATCH");
  assert.equal(
    (
      await call("merchant", "/api/equipment-bookings", {
        productId: "p3",
        start: "2099-01-01",
        end: "2099-01-02",
      })
    ).status,
    201,
  );
  await call("merchant", "/api/shipments/" + sh.id + "/action", { action: "dispute" });
  assert.equal(
    (await call("supplier", "/api/settlements", { shipmentId: sh.id, refundPercent: 20, message: "Delay" }))
      .status,
    400,
  );
  await call("merchant", "/api/settlements", {
    shipmentId: sh.id,
    refundPercent: 20,
    message: "Delay compensation",
  });
  state = (await call("merchant", "/api/state")).body;
  const settlement = state.settlements.find((s) => s.shipmentId === sh.id);
  assert.equal(
    (await call("merchant", "/api/settlements/" + settlement.id + "/respond", { decision: "accepted" }))
      .status,
    400,
  );
  assert.equal(
    (await call("carrier", "/api/settlements/" + settlement.id + "/respond", { decision: "accepted" }))
      .status,
    200,
  );
  assert.equal(
    (await call("carrier", "/api/settlements/" + settlement.id + "/respond", { decision: "accepted" }))
      .status,
    400,
  );
  state = (await call("merchant", "/api/state")).body;
  const escrow = state.escrows.find((e) => e.shipmentId === sh.id);
  assert.equal(escrow.refundAmount, 20);
  assert.equal(escrow.carrierNet, 80);
  assert.equal(escrow.commission, 0);
  const key = (await call("merchant", "/api/integrations/keys", { name: "ERP test" })).body;
  assert.ok(key.token);
  assert.equal((await call("supplier", "/api/integrations/keys", { name: "Wrong" })).status, 403);
  const erpHeaders = { Authorization: "Bearer " + key.token, "Idempotency-Key": "request_12345" };
  const a = await call("none", "/api/v1/shipments", payload, "POST", erpHeaders),
    b = await call("none", "/api/v1/shipments", payload, "POST", erpHeaders);
  assert.equal(a.status, 201);
  assert.equal(a.body.id, b.body.id);
  assert.equal((await call("none", "/api/state", undefined, "GET", erpHeaders)).status, 401);
  state = (await call("merchant", "/api/state")).body;
  assert.ok(!JSON.stringify(state).includes(key.token));
  await call("merchant", "/api/integrations/keys/" + key.id, {}, "DELETE");
  assert.equal((await call("none", "/api/v1/shipments", payload, "POST", erpHeaders)).status, 401);
  const report = await fetch(base + "/api/reports?format=xlsx&kind=invoices&month=2099-01", {
    headers: { cookie: cookies.merchant },
  });
  assert.equal(report.status, 200);
  const buffer = Buffer.from(await report.arrayBuffer());
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets[0].rowCount, 2);
  assert.equal(workbook.worksheets[0].getRow(2).getCell(1).value, sh.id);
  assert.equal(
    (await fetch(base + "/api/reports?format=xlsx", { headers: { cookie: cookies.supplier } })).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/reports?format=print", { headers: { cookie: cookies.merchant } })).status,
    200,
  );
  await call("merchant", "/api/notifications/read", {});
  assert.ok((await call("merchant", "/api/state")).body.notifications.every((n) => n.read));
});
