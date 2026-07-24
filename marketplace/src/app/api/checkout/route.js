import { checkout } from "@/lib/orders";
import { getCurrentUser, getOrCreateCartSessionId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request) {
  try {
    const body = await request.json();
    const user = await getCurrentUser();
    const sessionId = await getOrCreateCartSessionId();

    const result = checkout({
      userId: user?.id,
      sessionId,
      payload: body
    });

    return jsonOk({ checkout: result }, 201);
  } catch (error) {
    return jsonError(error, 400);
  }
}

