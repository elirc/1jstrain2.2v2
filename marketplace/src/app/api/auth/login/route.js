import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/security";
import { createSession, setSessionCookie } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return jsonError(new Error("email and password are required"), 400);
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, email, password_hash, role, name FROM users WHERE email = ?")
      .get(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return jsonError(new Error("Invalid credentials"), 401);
    }

    const session = createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    return jsonError(error, 500);
  }
}

