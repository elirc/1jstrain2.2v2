import { getCurrentUser, getOrCreateCartSessionId } from "@/lib/auth";
import { getRecentlyViewed } from "@/lib/engagement";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const sessionId = await getOrCreateCartSessionId();

    const items = getRecentlyViewed({
      userId: user?.id,
      sessionId
    });

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error, 500);
  }
}

