import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSellerDashboard } from "@/lib/seller";

export async function GET() {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const dashboard = getSellerDashboard(user.id);
    return jsonOk({ dashboard });
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

