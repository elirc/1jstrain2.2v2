import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listOrdersForSeller, updateOrderStatus } from "@/lib/orders";

export async function GET() {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const orders = listOrdersForSeller(user.id);
    return jsonOk({ orders });
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser(["SELLER", "ADMIN"]);
    const body = await request.json();

    const order = updateOrderStatus({
      sellerId: user.id,
      orderId: body.orderId,
      status: body.status,
      trackingNumber: body.trackingNumber
    });

    return jsonOk({ order });
  } catch (error) {
    return jsonError(error, error.status || 400);
  }
}

