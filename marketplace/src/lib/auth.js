import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { generateToken, nowIso } from "@/lib/security";

const SESSION_COOKIE = "market_session";
const CART_SESSION_COOKIE = "market_cart_session";
const SESSION_TTL_DAYS = 14;

function sessionExpiryIso() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt.toISOString();
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getCartSessionCookieName() {
  return CART_SESSION_COOKIE;
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.name, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name
  };
}

export async function requireUser(allowedRoles = []) {
  const user = await getCurrentUser();

  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  return user;
}

export function createSession(userId) {
  const db = getDb();
  const token = generateToken(24);
  const createdAt = nowIso();
  const expiresAt = sessionExpiryIso();

  db.prepare("INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)").run(
    token,
    userId,
    expiresAt,
    createdAt
  );

  return { token, expiresAt };
}

export async function setSessionCookie(token, expiresAt) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }

  store.delete(SESSION_COOKIE);
}

export async function getOrCreateCartSessionId() {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  const token = generateToken(16);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  store.set(CART_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });

  return token;
}

