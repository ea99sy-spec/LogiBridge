import test from "node:test";
import assert from "node:assert/strict";
import { queueEmail, deliverEmail } from "../server/email.js";
import { announceCompany } from "../server/profiles.js";
import { workspaceModules } from "../shared/workspaces.js";
test("every unapproved registered account has only onboarding modules", () => {
  assert.deepEqual(
    workspaceModules({ role: "carrier", accountType: "carrier", demo: false, verified: false }),
    ["dashboard", "guide", "profile", "kyb", "security"],
  );
  const person = workspaceModules({
    role: "merchant",
    accountType: "individual",
    demo: false,
    verified: false,
  });
  assert.deepEqual(person, ["dashboard", "guide", "profile", "kyb", "security"]);
  const approved = workspaceModules({
    role: "merchant",
    accountType: "individual",
    demo: false,
    verified: true,
  });
  assert.ok(approved.includes("newShipment") && approved.includes("directory"));
});
test("email queue deduplicates events and honors company announcement preferences", () => {
  const owner = {
      id: "new",
      name: "New company",
      email: "new@test.local",
      accountType: "carrier",
      verified: true,
      demo: false,
      profile: { about: "About", services: "Freight" },
    },
    s = {
      users: [
        owner,
        {
          id: "existing",
          name: "Existing company",
          email: "existing@test.local",
          accountType: "merchant",
          verified: true,
          demo: false,
        },
        {
          id: "optout",
          name: "Opted out",
          email: "out@test.local",
          accountType: "merchant",
          verified: true,
          demo: false,
          profile: { companyEmails: false },
        },
        { id: "pending", email: "pending@test.local", accountType: "carrier", demo: false, verified: false },
        { id: "demo", demo: true },
      ],
    };
  queueEmail(s, "new", "approved", {}, "review/1");
  queueEmail(s, "new", "approved", {}, "review/1");
  announceCompany(s, owner);
  announceCompany(s, owner);
  assert.equal(s.emailOutbox.length, 2);
  assert.equal(s.emailOutbox.find((e) => e.event === "company_joined").userId, "existing");
  assert.ok(s.emailOutbox.every((e) => e.status === "pending"));
  assert.ok(!s.emailOutbox.some((e) => e.userId === "pending" || e.userId === "optout"));
});
test("sending requires configuration and sends only server-owned recipient with idempotency", async () => {
  const before = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM };
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    assert.deepEqual(await deliverEmail({}), { configured: false });
    process.env.RESEND_API_KEY = "TEST-ONLY";
    process.env.MAIL_FROM = "sender@test.local";
    const job = { id: "email-test", to: "receiver@test.local", subject: "Test", text: "Test text" };
    let request;
    const result = await deliverEmail(job, async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "provider-test" }) };
    });
    assert.equal(result.providerId, "provider-test");
    assert.equal(request.options.headers["Idempotency-Key"], "logibridge/email-test");
    assert.equal(JSON.parse(request.options.body).to[0], job.to);
    await assert.rejects(() => deliverEmail(job, async () => ({ ok: false, status: 503 })), /503/);
  } finally {
    if (before.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = before.key;
    if (before.from === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = before.from;
  }
});
