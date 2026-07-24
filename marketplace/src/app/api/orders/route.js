import { getCurrentUser, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { listOrdersForBuyer, listOrdersForSeller } from "@/lib/orders";
import { nowIso } from "@/lib/security";

export async function GET(request) {
  try {
    const user = await requireUser(["BUYER", "SELLER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "buyer";

    if (view === "seller") {
      if (!["SELLER", "ADMIN"].includes(user.role)) {
        return jsonError(new Error("Forbidden"), 403);
      }
      return jsonOk({ orders: listOrdersForSeller(user.id) });
    }

    return jsonOk({ orders: listOrdersForBuyer(user.id) });
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser(["BUYER", "SELLER", "ADMIN"]);
    const body = await request.json();

    if (!body.orderId || !body.reason) {
      return jsonError(new Error("orderId and reason are required"), 400);
    }

    const db = getDb();
    const order = db.prepare("SELECT id, buyer_id, seller_id FROM orders WHERE id = ?").get(Number(body.orderId));

    if (!order) {
      return jsonError(new Error("Order not found"), 404);
    }

    if (user.role === "BUYER" && order.buyer_id !== user.id) {
      return jsonError(new Error("Forbidden"), 403);
    }

    const disputeInsert = db
      .prepare(
        `INSERT INTO disputes(order_id, raised_by, against_user, reason, status, resolution_note, created_at, updated_at)
         VALUES(?, ?, ?, ?, 'OPEN', '', ?, ?)`
      )
      .run(order.id, user.id, order.seller_id, body.reason, nowIso(), nowIso());

    return jsonOk({ disputeId: Number(disputeInsert.lastInsertRowid) }, 201);
  } catch (error) {
    return jsonError(error, error.status || 500);
  }
}

