import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { updateSellerApplication } from "@/lib/admin";

export async function PATCH(request) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const body = await request.json();

    const profile = updateSellerApplication({
      adminId: admin.id,
      sellerId: body.sellerId,
      status: body.status,
      rejectedReason: body.rejectedReason
    });

    return jsonOk({ profile });
  } catch (error) {
    return jsonError(error, error.status || 400);
  }
}

