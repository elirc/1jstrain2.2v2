import { clearSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    await clearSession();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, 500);
  }
}

