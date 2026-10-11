import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

// Time-based one-time codes (RFC 6238), compatible with Google Authenticator,
// Microsoft Authenticator, Authy and similar apps.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer) {
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  let bits = 0,
    value = 0;
  const out = [];
  for (const ch of text.replace(/=+$/, "").toUpperCase()) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) throw new Error("Invalid secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(randomBytes(20));

export function totp(secret, time = Date.now(), step = 30) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 1000 / step)));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, "0");
}

// Accepts the current code and one step either side to allow for clock drift.
export function verifyTotp(secret, code, time = Date.now()) {
  const value = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(value)) return false;
  return [-1, 0, 1].some((w) => {
    const expected = Buffer.from(totp(secret, time + w * 30000));
    return timingSafeEqual(expected, Buffer.from(value));
  });
}

const hashCode = (c) => createHash("sha256").update(c.toUpperCase()).digest("hex");

// One-time backup codes for a lost phone; only their hashes are stored.
export function newBackupCodes(count = 8) {
  const codes = Array.from({ length: count }, () =>
    randomBytes(5)
      .toString("hex")
      .toUpperCase()
      .replace(/(.{5})/, "$1-"),
  );
  return { codes, hashes: codes.map(hashCode) };
}

export function useBackupCode(hashes, code) {
  const value = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(value)) return -1;
  return hashes.indexOf(hashCode(value));
}
