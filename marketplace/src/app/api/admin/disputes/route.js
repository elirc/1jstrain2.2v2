import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveDispute } from "@/lib/admin";

export async function PATCH(request) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const body = await request.json();

    const dispute = resolveDispute({
      adminId: admin.id,
      disputeId: body.disputeId,
      status: body.status,
      note: body.note
    });

    return jsonOk({ dispute });
  } catch (error) {
    return jsonError(error, error.status || 400);
  }
}

