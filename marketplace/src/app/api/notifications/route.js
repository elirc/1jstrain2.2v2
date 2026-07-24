import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonOk({ notifications: [] });
    }

    const db = getDb();
    const notifications = db
      .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
      .all(user.id);

    return jsonOk({ notifications });
  } catch (error) {
    return jsonError(error, 500);
  }
}

