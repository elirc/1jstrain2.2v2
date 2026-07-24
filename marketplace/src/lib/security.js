import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(":")) {
    return false;
  }

  const [salt, storedHash] = storedValue.split(":");
  const computedHash = scryptSync(password, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedBuffer);
}

export function generateToken(size = 48) {
  return randomBytes(size).toString("hex");
}

export function toCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
}

export function centsToMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

export function generateOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  const entropy = randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${stamp}-${entropy}`;
}

export function nowIso() {
  return new Date().toISOString();
}

