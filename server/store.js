import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { initializeVault, encryptDocument, hashPassword } from "./identity.js";
import { cloudEnabled, readCloudState, writeCloudState } from "./cloud-store.js";
const directory = process.env.DATA_DIR
  ? pathToFileURL(resolve(process.env.DATA_DIR) + "/")
  : pathToFileURL(resolve("data") + "/");
const file = new URL("state.json", directory);
export const id = () => randomUUID();
const initial = () => ({
  users: [
    { id: "merchant", role: "merchant", name: "Anatolia Trade", verified: false, plan: "free" },
    { id: "carrier", role: "carrier", name: "Bridge Transport", verified: true, plan: "pro" },
    { id: "admin", role: "admin", name: "LogiBridge Admin", verified: true, plan: "pro" },
    { id: "supplier", role: "supplier", name: "Route Equipment", verified: false, plan: "free" },
  ],
  shipments: [
    {
      id: "s1",
      ownerId: "merchant",
      title: "Textile shipment",
      origin: "Gaziantep",
      destination: "Aleppo",
      category: "textiles",
      volume: 18,
      weight: 2400,
      crossing: "bab",
      date: "2026-10-12",
      status: "open",
      createdAt: new Date().toISOString(),
    },
    {
      id: "s2",
      ownerId: "merchant",
      title: "Packaging materials",
      origin: "Istanbul",
      destination: "Idlib",
      category: "packaging",
      volume: 8,
      weight: 850,
      crossing: "rai",
      date: "2026-10-15",
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ],
  bids: [
    {
      id: "b1",
      shipmentId: "s1",
      carrierId: "carrier",
      price: 680,
      days: 3,
      note: "Door-to-door transport",
      createdAt: new Date().toISOString(),
    },
  ],
  groups: [
    {
      id: "g1",
      origin: "Gaziantep",
      destination: "Aleppo",
      capacity: 60,
      booked: 32,
      pricePerM3: 38,
      date: "2026-10-12",
    },
    {
      id: "g2",
      origin: "Mersin",
      destination: "Idlib",
      capacity: 70,
      booked: 21,
      pricePerM3: 45,
      date: "2026-10-15",
    },
  ],
  reservations: [],
  messages: [],
  kyb: [],
  escrows: [],
  ratings: [],
  notifications: [],
  contracts: [],
  orders: [],
  checklists: {},
  fleets: [],
  products: [
    { id: "p1", title: "Lashing kit", price: 65, type: "sale" },
    { id: "p2", title: "GPS tracker", price: 90, type: "sale" },
    { id: "p3", title: "Container / day", price: 45, type: "rental" },
  ],
  flags: { tracking: true, ratings: true, marketplace: true, contracts: false },
});
let state, pool, cloudEtag;
const listeners = new Set();
export function subscribeState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function initialize() {
  await mkdir(directory, { recursive: true });
  await initializeVault(directory);
  if (cloudEnabled()) {
    const entry = await readCloudState();
    state = entry?.data || initial();
    cloudEtag = entry?.etag;
  } else if (process.env.DATABASE_URL) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      "CREATE TABLE IF NOT EXISTS logibridge_state (id INTEGER PRIMARY KEY, payload JSONB NOT NULL)",
    );
    const result = await pool.query("SELECT payload FROM logibridge_state WHERE id=1");
    state = result.rows[0]?.payload || initial();
  } else {
    await mkdir(directory, { recursive: true });
    try {
      state = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      state = initial();
    }
  }
  state.driverLinks ||= [];
  state.equipmentBookings ||= [];
  state.settlements ||= [];
  state.apiKeys ||= [];
  state.fleets ||= [];
  state.shipmentDocuments ||= [];
  state.trackingEvents ||= [];
  for (const p of state.products) if (["p1", "p2", "p3"].includes(p.id)) p.supplierId ||= "supplier";
  for (const g of state.groups) if (["g1", "g2"].includes(g.id)) g.carrierId ||= "carrier";
  if (!state.users.some((u) => u.id === "supplier"))
    state.users.push({
      id: "supplier",
      role: "supplier",
      name: "Route Equipment",
      verified: false,
      plan: "free",
    });
  if (!state.users.some((u) => u.id === "broker"))
    state.users.push({
      id: "broker",
      role: "broker",
      accountType: "broker",
      name: "Border Clearance Co.",
      verified: true,
      plan: "free",
    });
  if (!state.users.some((u) => u.id === "individual"))
    state.users.push({
      id: "individual",
      role: "merchant",
      accountType: "individual",
      name: "Individual Shipper",
      verified: false,
      plan: "free",
    });
  for (const user of state.users) {
    user.accountType ||= user.role;
    user.demo ??= ["merchant", "carrier", "admin", "supplier", "individual", "broker"].includes(user.id);
    user.verificationStatus ||= user.verified ? "approved" : "not_submitted";
    user.verificationLevel ||= user.verified ? "demo" : "none";
  }
  // Each demo account presents information that fits its own account type.
  const demoProfiles = {
    merchant: {
      email: "merchant.demo@logibridge.example",
      taxId: "1234567890",
      details: {
        phone: "+90 342 000 00 01",
        city: "Gaziantep",
        country: "TR",
        activity: "both",
        products: "Textiles, cotton fabric, home textiles",
      },
      profile: {
        about: "Anatolia Trade imports and exports textiles between Türkiye and Syria since 2012.",
        services: "Fabric export, raw cotton import, consolidated LCL orders",
        location: "Gaziantep, Türkiye",
        website: "",
        contactEmail: "trade@anatolia.example",
        contactPhone: "+90 342 000 10 01",
        companyEmails: true,
      },
    },
    carrier: {
      email: "carrier.demo@logibridge.example",
      taxId: "9876543210",
      details: {
        phone: "+90 342 000 00 02",
        city: "Gaziantep",
        country: "TR",
        license: "C2-DEMO-4471",
        fleetSize: 14,
        routes: "Gaziantep ⇄ Aleppo, Mersin ⇄ Idlib, Istanbul ⇄ Damascus",
      },
      profile: {
        about: "Bridge Transport runs refrigerated and curtain-side trucks across Bab al-Hawa and Kasab.",
        services: "FTL and LCL road freight, customs brokerage, door-to-door delivery",
        location: "Gaziantep, Türkiye",
        website: "",
        contactEmail: "ops@bridge-transport.example",
        contactPhone: "+90 342 000 10 02",
        companyEmails: true,
      },
    },
    supplier: {
      email: "supplier.demo@logibridge.example",
      taxId: "5555555555",
      details: {
        phone: "+90 324 000 00 03",
        city: "Mersin",
        country: "TR",
        equipment: "Containers, lashing kits, GPS trackers, pallets",
        warehouse: "Mersin free zone",
      },
      profile: {
        about: "Route Equipment rents and sells cargo equipment near Mersin port.",
        services: "Container rental, cargo securing kits, GPS trackers",
        location: "Mersin, Türkiye",
        website: "",
        contactEmail: "sales@route-equipment.example",
        contactPhone: "+90 324 000 10 03",
        companyEmails: true,
      },
    },
    individual: {
      email: "person.demo@logibridge.example",
      details: { phone: "+90 555 000 00 04", city: "Istanbul", country: "TR" },
      profile: {
        about: "Sending personal goods and small parcels to family in Aleppo.",
        services: "",
        location: "Istanbul, Türkiye",
        website: "",
        companyEmails: false,
      },
    },
    broker: {
      email: "broker.demo@logibridge.example",
      taxId: "1111111111",
      details: {
        phone: "+90 348 000 00 05",
        city: "Kilis",
        country: "TR",
        license: "GM-DEMO-208",
        crossings: ["salameh", "bab", "rai"],
      },
      profile: {
        about: "Border Clearance Co. handles customs and truck-to-truck transfer at the northern crossings.",
        services: "Customs declarations, transshipment supervision in the customs yard, document checks",
        location: "Kilis, Türkiye",
        website: "",
        contactEmail: "clearance@border-co.example",
        contactPhone: "+90 348 000 10 05",
        companyEmails: true,
      },
    },
    admin: { email: "admin.demo@logibridge.example", details: {}, profile: {} },
  };
  for (const [demoId, info] of Object.entries(demoProfiles)) {
    const u = state.users.find((x) => x.id === demoId && x.demo);
    if (!u) continue;
    u.email ||= info.email;
    if (info.taxId) u.taxId ||= info.taxId;
    u.details = { ...info.details, ...(u.details || {}) };
    if (info.profile.about && (!u.profile?.about || !u.profile.contactEmail)) u.profile = info.profile;
  }
  for (const doc of state.kyb) {
    doc.kind ||= "company";
    if (doc.content) {
      doc.encryptedContent = encryptDocument(doc.content);
      delete doc.content;
    }
  }
  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    !state.users.some((u) => u.id === "platform-admin")
  )
    state.users.push({
      id: "platform-admin",
      role: "admin",
      accountType: "admin",
      name: "Platform Administrator",
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      credential: await hashPassword(process.env.ADMIN_PASSWORD),
      demo: false,
      verified: false,
      verificationStatus: "not_submitted",
      verificationLevel: "none",
      plan: "pro",
    });
  // Demo-only sample records; invisible to registered accounts.
  if (!state.operationsDemoSeeded) {
    state.operationsDemoSeeded = true;
    const now = new Date().toISOString();
    state.users.push({
      id: "demo-review-company",
      role: "supplier",
      accountType: "supplier",
      name: "Demo Equipment Company",
      demo: true,
      verified: false,
      verificationStatus: "pending",
      verificationLevel: "none",
      plan: "free",
    });
    state.kyb.push({
      id: "demo-review-request",
      userId: "demo-review-company",
      kind: "company",
      company: "Demo Equipment Company",
      registration: "DEMO-ONLY-001",
      registry: "Sample registry — not official",
      country: "TR",
      filename: "demo-placeholder.png",
      mime: "image/png",
      encryptedContent: encryptDocument(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXmUAAAAASUVORK5CYII=",
      ),
      status: "pending",
      createdAt: now,
    });
    state.shipments.push({
      id: "demo-tracking",
      ownerId: "merchant",
      carrierId: "carrier",
      title: "Demo shipment in transit",
      origin: "Gaziantep",
      destination: "Aleppo",
      category: "packaging",
      volume: 5,
      weight: 300,
      crossing: "bab",
      date: "2026-10-12",
      status: "transit",
      lastLocation: "Gaziantep",
      createdAt: now,
      demo: true,
    });
    state.escrows.push({
      id: "demo-tracking-escrow",
      shipmentId: "demo-tracking",
      amount: 450,
      commission: 13.5,
      carrierNet: 436.5,
      status: "held",
      simulated: true,
      currency: "USD",
    });
    state.trackingEvents.push({
      id: "demo-tracking-event",
      shipmentId: "demo-tracking",
      actorId: "carrier",
      event: "location_update",
      location: "Gaziantep",
      note: "Sample update only",
      source: "demo",
      createdAt: now,
    });
  }
  // Demo three-stage order (Türkiye → Syria) so visitors can see how a crossing works.
  if (!state.stagedDemoSeeded) {
    state.stagedDemoSeeded = true;
    const now = new Date().toISOString(),
      date = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    const base = {
      ownerId: "merchant",
      title: "Cotton fabric — Gaziantep to Aleppo",
      category: "textiles",
      volume: 12,
      weight: 1800,
      hsCode: "520812",
      date,
      crossing: "salameh",
      createdAt: now,
    };
    const legs = [
      ["origin_leg", "Gaziantep", "Öncüpınar (Kilis)", "TR", "TR", "domesticTR"],
      ["clearance", "Öncüpınar (Kilis)", "Bab al-Salama (Azaz)", "TR", "SY", "clearance"],
      ["destination_leg", "Bab al-Salama (Azaz)", "Aleppo", "SY", "SY", "domesticSY"],
    ].map(([legType, origin, destination, oc, dc, transportType], legIndex) => ({
      ...base,
      id: "demo-order-leg-" + (legIndex + 1),
      parentId: "demo-order",
      legType,
      legIndex,
      origin,
      destination,
      originCountry: oc,
      destinationCountry: dc,
      transportType,
      status: "open",
    }));
    state.shipments.push(
      {
        ...base,
        id: "demo-order",
        isOrder: true,
        legs: legs.map((l) => l.id),
        origin: "Gaziantep",
        destination: "Aleppo",
        originCountry: "TR",
        destinationCountry: "SY",
        transportType: "crossBorder",
        status: "coordinating",
      },
      ...legs,
    );
    state.bids.push(
      {
        id: "demo-bid-leg1",
        shipmentId: "demo-order-leg-1",
        carrierId: "carrier",
        price: 220,
        days: 1,
        note: "Gaziantep pickup, same day to Öncüpınar",
        createdAt: now,
      },
      {
        id: "demo-bid-leg2",
        shipmentId: "demo-order-leg-2",
        carrierId: "broker",
        price: 140,
        days: 1,
        note: "Declaration + yard transfer supervision",
        createdAt: now,
      },
    );
  }
  if (!(await persist(state)) && cloudEnabled()) await refreshState();
}
export async function refreshState() {
  if (cloudEnabled()) {
    const entry = await readCloudState();
    if (!entry) throw new Error("Cloud state unavailable");
    state = entry.data;
    cloudEtag = entry.etag;
  }
}
async function persist(next) {
  if (cloudEnabled()) {
    const result = await writeCloudState(next, cloudEtag);
    if (result.modified) cloudEtag = result.etag;
    return result.modified;
  }
  if (pool)
    await pool.query("INSERT INTO logibridge_state VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET payload=$1", [
      JSON.stringify(next),
    ]);
  else {
    const temp = new URL("state.tmp", directory);
    await writeFile(temp, JSON.stringify(next, null, 2));
    // Windows scanners/watchers can briefly lock the destination during replacement.
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temp, file);
        break;
      } catch (error) {
        if (attempt >= 5 || !["EPERM", "EACCES", "EBUSY"].includes(error.code)) throw error;
        await delay(30 * (attempt + 1));
      }
    }
  }
  return true;
}
let queue = Promise.resolve();
export function readState() {
  return structuredClone(state);
}
export function mutate(fn) {
  const operation = queue.then(async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (cloudEnabled()) await refreshState();
      const next = structuredClone(state);
      const value = await fn(next);
      if (!(await persist(next))) {
        await delay(20 + Math.random() * 80);
        continue;
      }
      state = next;
      for (const listener of listeners) {
        try {
          listener();
        } catch {}
      }
      return value;
    }
    throw Object.assign(new Error("Concurrent update. Please retry."), { status: 409 });
  });
  queue = operation.catch(() => {});
  return operation;
}
