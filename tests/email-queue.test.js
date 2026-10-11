import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
process.env.DATA_DIR = resolve("tmp", "email-tests", randomUUID());
process.env.LOGIBRIDGE_STORAGE = "";
process.env.DATABASE_URL = "";
process.env.ADMIN_EMAIL = "";
process.env.ADMIN_PASSWORD = "";
const { initialize, readState, mutate } = await import("../server/store.js");
const { queueEmail, flushEmails } = await import("../server/email.js");
test("durable email queue records provider acceptance, retries failures, and isolates private content", async () => {
  await initialize();
  await mutate((s) => {
    s.users.push({ id: "email-user", name: "Test User", email: "user@test.local", demo: false });
    queueEmail(s, "email-user", "registered");
    queueEmail(s, "email-user", "login");
  });
  const original = globalThis.fetch;
  process.env.RESEND_API_KEY = "TEST-ONLY";
  process.env.MAIL_FROM = "sender@test.local";
  let sent = 0;
  try {
    globalThis.fetch = async () => {
      sent++;
      return { ok: true, json: async () => ({ id: "provider-" + sent }) };
    };
    assert.equal((await flushEmails(1)).sent, 1);
    let jobs = readState().emailOutbox;
    assert.equal(jobs[0].status, "sent");
    assert.equal(jobs[0].providerId, "provider-1");
    assert.equal(jobs[1].status, "pending");
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    assert.equal((await flushEmails(1)).sent, 0);
    jobs = readState().emailOutbox;
    assert.equal(jobs[1].status, "pending");
    assert.equal(jobs[1].attempts, 1);
    assert.ok(jobs[1].nextAttempt);
    assert.equal(jobs[1].lastError, "Email provider returned 503");
    await mutate((s) => {
      s.emailOutbox[1].nextAttempt = new Date(0).toISOString();
    });
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: "provider-retry" }) });
    assert.equal((await flushEmails(1)).sent, 1);
    assert.ok(readState().emailOutbox.every((x) => x.status === "sent"));
    assert.equal((await flushEmails(1)).sent, 0);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  }
});
