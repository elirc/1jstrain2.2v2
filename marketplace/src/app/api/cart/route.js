import { getCurrentUser, getOrCreateCartSessionId } from "@/lib/auth";
import { addCartItem, getCart, removeCartItem, updateCartItem } from "@/lib/cart";
import { jsonError, jsonOk } from "@/lib/http";

async function resolveIdentity() {
  const user = await getCurrentUser();
  const sessionId = await getOrCreateCartSessionId();

  return {
    userId: user?.id,
    sessionId
  };
}

export async function GET() {
  try {
    const identity = await resolveIdentity();
    const cart = getCart(identity);
    return jsonOk({ cart });
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identity = await resolveIdentity();

    const cart = addCartItem({
      ...identity,
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity
    });

    return jsonOk({ cart });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const identity = await resolveIdentity();

    const cart = updateCartItem({
      ...identity,
      itemId: body.itemId,
      quantity: body.quantity,
      savedForLater: body.savedForLater
    });

    return jsonOk({ cart });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const identity = await resolveIdentity();
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return jsonError(new Error("itemId is required"), 400);
    }

    const cart = removeCartItem({
      ...identity,
      itemId
    });

    return jsonOk({ cart });
  } catch (error) {
    return jsonError(error, 400);
  }
}

