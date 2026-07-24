import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getAdminDashboard } from "@/lib/admin";

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    const dashboard = getAdminDashboard();
    return jsonOk({ dashboard });
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

