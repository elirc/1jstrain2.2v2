import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { createSession, setSessionCookie } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    const role = body.role === "SELLER" ? "SELLER" : "BUYER";

    if (!email || !password || !name) {
      return jsonError(new Error("name, email, and password are required"), 400);
    }

    if (password.length < 8) {
      return jsonError(new Error("Password must be at least 8 characters"), 400);
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

    if (existing) {
      return jsonError(new Error("Email already exists"), 409);
    }

    const createdAt = new Date().toISOString();
    const userInsert = db
      .prepare("INSERT INTO users(email, password_hash, role, name, created_at) VALUES(?, ?, ?, ?, ?)")
      .run(email, hashPassword(password), role, name, createdAt);

    const userId = Number(userInsert.lastInsertRowid);

    if (role === "SELLER") {
      db.prepare(
        `INSERT INTO seller_profiles(user_id, application_status, bio, payout_account_ref, created_at)
         VALUES(?, 'PENDING', '', '', ?)`
      ).run(userId, createdAt);
    }

    const session = createSession(userId);
    await setSessionCookie(session.token, session.expiresAt);

    return jsonOk({
      user: { id: userId, email, name, role }
    }, 201);
  } catch (error) {
    return jsonError(error, 500);
  }
}

