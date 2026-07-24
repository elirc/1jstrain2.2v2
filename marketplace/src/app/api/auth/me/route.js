import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return jsonOk({ user });
  } catch (error) {
    return jsonError(error, 500);
  }
}

