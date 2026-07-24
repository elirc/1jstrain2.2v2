import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { upsertStore } from "@/lib/seller";

export async function POST(request) {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const body = await request.json();

    const store = upsertStore({ sellerId: user.id, payload: body });
    return jsonOk({ store });
  } catch (error) {
    return jsonError(error, 400);
  }
}

