import { getProductById, recordRecentlyViewed } from "@/lib/catalog";
import { getCurrentUser, getOrCreateCartSessionId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const product = getProductById(resolvedParams.id);

    if (!product) {
      return jsonError(new Error("Product not found"), 404);
    }

    const user = await getCurrentUser();
    const sessionId = await getOrCreateCartSessionId();

    recordRecentlyViewed({
      productId: resolvedParams.id,
      userId: user?.id,
      sessionId
    });

    return jsonOk({ product });
  } catch (error) {
    return jsonError(error, 500);
  }
}

