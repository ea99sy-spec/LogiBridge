import test from "node:test";
import assert from "node:assert/strict";
import { memberBlocked } from "../server/team.js";
import { nextOf, recurringWatch } from "../server/recurring.js";
import { monthlyReport, lastMonth } from "../server/monthlyReport.js";
import { cityKey, corridors, corridorBySlug, nearestCrossings } from "../shared/corridors.js";
import { companySlug, corridorDeals, publicCompanies } from "../server/publicPages.js";
import { workspaceModules } from "../shared/workspaces.js";

test("team roles limit what an employee can change", () => {
  const viewer = { teamRole: "viewer" },
    ops = { teamRole: "operations" },
    manager = { teamRole: "manager" };
  assert.equal(memberBlocked(viewer, "GET", "/state"), false);
  assert.equal(memberBlocked(viewer, "POST", "/bids"), true);
  assert.equal(memberBlocked(viewer, "POST", "/notifications/read"), false);
  assert.equal(memberBlocked(ops, "POST", "/bids"), false);
  assert.equal(memberBlocked(ops, "PUT", "/profile"), true);
  assert.equal(memberBlocked(ops, "POST", "/subscription/checkout"), true);
  assert.equal(memberBlocked(manager, "PUT", "/profile"), false);
  assert.equal(memberBlocked(manager, "POST", "/team"), true);
  assert.equal(memberBlocked(manager, "GET", "/team"), true);
  assert.equal(memberBlocked(manager, "POST", "/account/password"), true);
  assert.equal(memberBlocked(null, "POST", "/team"), false);
  const company = {
    id: "x",
    role: "merchant",
    accountType: "merchant",
    verified: true,
    verificationStatus: "approved",
  };
  assert.ok(workspaceModules(company).includes("team"));
  const asMember = workspaceModules({ ...company, member: { teamRole: "operations" } });
  assert.ok(!asMember.includes("team") && !asMember.includes("security") && !asMember.includes("kyb"));
});

test("recurring dates and publication", () => {
  assert.equal(nextOf("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextOf("2026-10-20", "weekly"), "2026-10-27");
  assert.equal(nextOf("2026-10-20", "biweekly"), "2026-11-03");
  const s = {
    users: [
      { id: "m", role: "merchant", name: "M", accountType: "merchant", demo: true },
      { id: "c", role: "carrier", name: "C" },
    ],
    shipments: [],
    trackingEvents: [],
    bids: [],
    settings: {},
    notifications: [],
    groups: [],
    recurring: [
      {
        id: "r1",
        ownerId: "m",
        active: true,
        every: "weekly",
        leadDays: 3,
        nextDate: "2026-10-21",
        preferredCarrierId: "c",
        agreedPrice: 800,
        template: {
          title: "Oil",
          origin: "Mersin",
          destination: "Ankara",
          originCountry: "TR",
          destinationCountry: "TR",
          hsCode: "150910",
          category: "food",
          volume: 5,
          weight: 1000,
        },
      },
    ],
  };
  // Too early: nothing happens.
  assert.equal(recurringWatch(s, "2026-10-17"), false);
  assert.equal(s.shipments.length, 0);
  // Three days before: published once, next date moves a week ahead.
  assert.equal(recurringWatch(s, "2026-10-18"), true);
  assert.equal(s.shipments.length, 1);
  assert.equal(s.shipments[0].date, "2026-10-21");
  assert.equal(s.shipments[0].recurringId, "r1");
  assert.equal(s.recurring[0].nextDate, "2026-10-28");
  assert.ok(s.notifications.some((n) => n.userId === "c" && n.event === "recurring_invite"));
  assert.equal(recurringWatch(s, "2026-10-18"), false);
});

test("monthly report counts only that month", () => {
  const s = {
    users: [{ id: "c", role: "carrier" }],
    bids: [
      { id: "b1", carrierId: "c", price: 700, days: 3, createdAt: "2026-09-02T10:00:00Z" },
      { id: "b2", carrierId: "c", price: 500, days: 3, createdAt: "2026-08-02T10:00:00Z" },
    ],
    shipments: [
      {
        id: "s1",
        ownerId: "m",
        carrierId: "c",
        bidId: "b1",
        origin: "A",
        destination: "B",
        status: "delivered",
        date: "2026-09-03",
        acceptedAt: "2026-09-02T12:00:00Z",
        arrivedAt: "2026-09-04T12:00:00Z",
        completedAt: "2026-09-04T13:00:00Z",
      },
      {
        id: "s2",
        ownerId: "m",
        carrierId: "c",
        bidId: "b2",
        status: "delivered",
        acceptedAt: "2026-08-02T12:00:00Z",
      },
    ],
  };
  const r = monthlyReport(s, { id: "c" }, "2026-09");
  assert.equal(r.won, 1);
  assert.equal(r.earned, 700);
  assert.equal(r.jobsDone, 1);
  assert.equal(r.onTimePct, 100);
  assert.equal(r.offersSent, 1);
  assert.equal(lastMonth(new Date("2026-01-05T00:00:00Z")), "2025-12");
});

test("public routes and company pages", () => {
  assert.equal(corridors().length, 120);
  assert.equal(cityKey("Antep"), "gaziantep");
  assert.equal(cityKey("حلب"), "aleppo");
  assert.equal(cityKey("Paris"), null);
  assert.equal(corridorBySlug("aleppo-idlib"), null);
  assert.deepEqual(corridorBySlug("gaziantep-aleppo"), {
    from: "gaziantep",
    to: "aleppo",
    slug: "gaziantep-aleppo",
  });
  assert.equal(nearestCrossings("hatay", "idlib")[0], "bab");
  const u = {
    id: "4a4f542f-3db9-4e3f",
    name: "Öz Nakliyat",
    role: "carrier",
    accountType: "carrier",
    verified: true,
    verificationStatus: "approved",
    profile: { about: "x" },
  };
  assert.equal(companySlug(u), "oz-nakliyat-4a4f542f");
  const s = {
    users: [u, { ...u, id: "b", profile: { about: "x", publicPage: false } }, { ...u, id: "c", demo: true }],
    bids: [1, 2, 3].map((i) => ({ id: "b" + i, price: 1000 * i, days: 2 })),
    shipments: [1, 2, 3].map((i) => ({
      id: "s" + i,
      ownerId: "4a4f542f-3db9-4e3f",
      origin: "Gaziantep",
      destination: "Halep",
      bidId: "b" + i,
      status: "delivered",
    })),
  };
  assert.deepEqual(
    publicCompanies(s).map((x) => x.id),
    ["4a4f542f-3db9-4e3f"],
  );
  assert.equal(corridorDeals(s, "gaziantep", "aleppo").length, 3);
});

test("documents opened by others get a watermark", async () => {
  const { PDFDocument } = await import("pdf-lib");
  const { watermarkDocument, watermarkText } = await import("../server/watermark.js");
  const d = await PDFDocument.create();
  d.addPage([300, 300]);
  const text = watermarkText({ name: "شركة Öz", email: "a@b.test" }, new Date("2026-10-17T10:00:00Z"));
  assert.equal(text, "Oz - a@b.test | 2026-10-17 13:00 (UTC+3) | LogiBridge");
  const out = await watermarkDocument(Buffer.from(await d.save()), "application/pdf", text);
  assert.ok(out && out.subarray(0, 5).toString() === "%PDF-");
  assert.equal(await watermarkDocument(Buffer.from("not a pdf"), "application/pdf", text), null);
});
