import { getCurrentUser } from "@/lib/auth";
import { getWishlist, toggleWishlist } from "@/lib/engagement";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonOk({ items: [] });
    }

    const items = getWishlist(user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError(new Error("Login required"), 401);
    }

    const body = await request.json();
    const result = toggleWishlist({ userId: user.id, productId: body.productId });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}

