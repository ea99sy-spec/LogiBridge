import { SALES_TERMS_VERSION } from "../shared/legal.js";
import express from "express";
import { createHmac, randomBytes } from "node:crypto";
import { readState, mutate } from "./store.js";
import { pricingOf, subscriptionOf } from "../shared/subscription.js";
import { grantPaidMonths } from "./operations.js";
import { requiresApproval } from "../shared/access.js";

// Online subscription payment with PayTR (iFrame API). Nothing works until the three settings
// below exist in the hosting environment (never in the code):
//   PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT   (PayTR merchant panel)
//   PAYTR_TEST_MODE = "1" while testing (optional)
// PayTR calls /api/payments/paytr/callback; set that address as the notification URL in PayTR.
export const paytrConfigured = () =>
  !!(process.env.PAYTR_MERCHANT_ID && process.env.PAYTR_MERCHANT_KEY && process.env.PAYTR_MERCHANT_SALT);
const hmac = (text) => createHmac("sha256", process.env.PAYTR_MERCHANT_KEY).update(text).digest("base64");
const kindOf = (u) => (u.accountType === "individual" ? "individual" : u.role);
export const planAmount = (s, u, months) =>
  Math.round((Number(pricingOf(s).prices[kindOf(u)]) || 0) * (months === 12 ? 10 : months) * 100) / 100;
const ascii = (v, max) =>
  String(v || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, max);

export function paytrPublicRoutes(app) {
  // PayTR's server-to-server notice. Only the first notice for an order counts; always answer OK.
  app.post("/api/payments/paytr/callback", express.urlencoded({ extended: false }), async (req, res) => {
    if (!paytrConfigured()) return res.status(404).end();
    const b = req.body || {};
    const expected = hmac(`${b.merchant_oid}${process.env.PAYTR_MERCHANT_SALT}${b.status}${b.total_amount}`);
    if (!b.hash || b.hash !== expected)
      return res.status(400).type("text").send("PAYTR notification failed: bad hash");
    await mutate((s) => {
      const order = (s.subscriptionOrders || []).find((o) => o.id === b.merchant_oid);
      if (!order || order.status !== "pending") return;
      order.status = b.status === "success" ? "paid" : "failed";
      order.completedAt = new Date().toISOString();
      if (order.status === "failed") {
        order.failure = String(b.failed_reason_msg || b.failed_reason_code || "").slice(0, 200);
        return;
      }
      order.totalAmount = Number(b.total_amount) / 100;
      const u = s.users.find((x) => x.id === order.userId);
      if (u) grantPaidMonths(s, u, order.months, order.amount, { method: "paytr", orderId: order.id });
    });
    res.type("text").send("OK");
  });
}

export function paytrRoutes(app) {
  app.get("/api/subscription/online", (req, res) => {
    const s = readState();
    res.json({
      enabled: paytrConfigured() && !req.user.demo,
      prices: { 1: planAmount(s, req.user, 1), 12: planAmount(s, req.user, 12) },
      currency: "USD",
    });
  });
  app.post("/api/subscription/checkout", async (req, res) => {
    if (!paytrConfigured()) throw new Error("Online payment is not available yet");
    const months = Number(req.body?.months);
    if (![1, 3, 6, 12].includes(months)) throw new Error("Invalid request");
    // Distance sales: the buyer must accept the pre-information and the contract (/sales-terms).
    if (req.body?.acceptSales !== true) throw new Error("Please accept the sales terms");
    const s = readState();
    const u = s.users.find((x) => x.id === req.user.id);
    if (!u || u.demo || u.role === "admin" || requiresApproval(u)) throw new Error("Account unavailable");
    if (subscriptionOf(s, u).status === "none") throw new Error("Account unavailable");
    const amount = planAmount(s, u, months);
    if (!(amount > 0)) throw new Error("Nothing to pay for this account");
    const oid = "LB" + randomBytes(12).toString("hex").toUpperCase();
    const basket = Buffer.from(
      JSON.stringify([[`LogiBridge subscription ${months} month(s)`, amount.toFixed(2), 1]]),
    ).toString("base64");
    const ip = String(req.get("x-nf-client-connection-ip") || req.ip || "")
      .replace(/^::ffff:/, "")
      .slice(0, 39);
    const f = {
      merchant_id: process.env.PAYTR_MERCHANT_ID,
      user_ip: ip,
      merchant_oid: oid,
      email: ascii(u.email, 100),
      payment_amount: String(Math.round(amount * 100)),
      user_basket: basket,
      no_installment: "1",
      max_installment: "0",
      currency: "USD",
      test_mode: process.env.PAYTR_TEST_MODE === "1" ? "1" : "0",
    };
    const token = hmac(
      f.merchant_id +
        f.user_ip +
        f.merchant_oid +
        f.email +
        f.payment_amount +
        f.user_basket +
        f.no_installment +
        f.max_installment +
        f.currency +
        f.test_mode +
        process.env.PAYTR_MERCHANT_SALT,
    );
    const origin = `${req.protocol}://${req.get("host")}`;
    const body = new URLSearchParams({
      ...f,
      paytr_token: token,
      user_name: ascii(u.name, 60) || "LogiBridge customer",
      user_address: ascii(`${u.details?.city || ""} ${u.details?.country || ""}`, 400) || "N/A",
      user_phone: ascii(u.details?.phone, 20) || "0",
      merchant_ok_url: `${origin}/workspace/dashboard?payment=ok`,
      merchant_fail_url: `${origin}/workspace/dashboard?payment=failed`,
      timeout_limit: "30",
      debug_on: "0",
      lang: ["tr", "en"].includes(req.body?.lang) ? req.body.lang : "en",
    });
    const r = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const v = await r.json().catch(() => ({}));
    if (v.status !== "success" || !v.token) throw new Error("Payment service unavailable, try again later");
    await mutate((s2) => {
      (s2.subscriptionOrders ||= []).push({
        id: oid,
        userId: u.id,
        months,
        amount,
        currency: "USD",
        status: "pending",
        salesTermsAcceptedAt: new Date().toISOString(),
        salesTermsVersion: SALES_TERMS_VERSION,
        createdAt: new Date().toISOString(),
      });
      if (s2.subscriptionOrders.length > 5000) s2.subscriptionOrders = s2.subscriptionOrders.slice(-5000);
    });
    res.json({ ok: true, token: v.token });
  });
}
