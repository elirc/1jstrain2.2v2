import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createReview } from "@/lib/engagement";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return jsonError(new Error("productId is required"), 400);
    }

    const db = getDb();
    const reviews = db
      .prepare(
        `SELECT r.id, r.rating, r.title, r.body, r.seller_response, r.helpful_count, r.created_at, u.name as buyer_name
         FROM reviews r
         JOIN users u ON u.id = r.buyer_id
         WHERE r.product_id = ?
         ORDER BY r.created_at DESC`
      )
      .all(Number(productId));

    return jsonOk({ reviews });
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser(["BUYER", "ADMIN", "SELLER"]);
    const body = await request.json();

    const review = createReview({
      userId: user.id,
      payload: body
    });

    return jsonOk({ review }, 201);
  } catch (error) {
    return jsonError(error, error.status || 400);
  }
}

