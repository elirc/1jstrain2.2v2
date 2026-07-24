import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/security";
import { numeric } from "@/lib/utils";

export function createReview({ userId, payload }) {
  const db = getDb();
  const orderItem = db
    .prepare(
      `SELECT oi.*, o.status, o.buyer_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ?`
    )
    .get(Number(payload.orderItemId));

  if (!orderItem) {
    throw new Error("Order item not found");
  }

  if (orderItem.buyer_id !== userId) {
    throw new Error("You can only review your own purchases");
  }

  if (!["DELIVERED", "COMPLETED"].includes(orderItem.status)) {
    throw new Error("Review is allowed only after delivery");
  }

  const createdAt = nowIso();
  const reviewInsert = db
    .prepare(
      `INSERT INTO reviews(order_item_id, product_id, buyer_id, rating, title, body, seller_response, verified_purchase, helpful_count, created_at)
       VALUES(?, ?, ?, ?, ?, ?, '', 1, 0, ?)`
    )
    .run(orderItem.id, orderItem.product_id, userId, numeric(payload.rating, 5), payload.title || "", payload.body, createdAt);

  const reviewId = Number(reviewInsert.lastInsertRowid);
  (payload.images || []).forEach((url) => {
    if (url) {
      db.prepare("INSERT INTO review_images(review_id, url) VALUES(?, ?)").run(reviewId, url);
    }
  });

  return db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId);
}

export function voteReview({ userId, reviewId, vote }) {
  const db = getDb();
  const normalizedVote = vote >= 0 ? 1 : -1;
  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO review_votes(review_id, user_id, vote, created_at)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(review_id, user_id)
     DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at`
  ).run(Number(reviewId), userId, normalizedVote, createdAt);

  const helpful = db.prepare("SELECT COALESCE(SUM(vote), 0) AS score FROM review_votes WHERE review_id = ?").get(Number(reviewId));
  db.prepare("UPDATE reviews SET helpful_count = ? WHERE id = ?").run(helpful.score, Number(reviewId));

  return { reviewId: Number(reviewId), helpfulCount: helpful.score };
}

export function toggleWishlist({ userId, productId }) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?").get(userId, Number(productId));

  if (existing) {
    db.prepare("DELETE FROM wishlist_items WHERE id = ?").run(existing.id);
    return { wished: false };
  }

  db.prepare("INSERT INTO wishlist_items(user_id, product_id, created_at) VALUES(?, ?, ?)").run(
    userId,
    Number(productId),
    nowIso()
  );

  return { wished: true };
}

export function getWishlist(userId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT w.id, w.product_id, p.title, MIN(v.price_cents) AS min_price_cents
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       JOIN product_variants v ON v.product_id = p.id
       WHERE w.user_id = ?
       GROUP BY w.id
       ORDER BY w.created_at DESC`
    )
    .all(userId)
    .map((item) => ({
      id: item.id,
      productId: item.product_id,
      title: item.title,
      minPrice: item.min_price_cents / 100
    }));
}

export function getRecentlyViewed({ userId, sessionId }) {
  const db = getDb();

  const rows = userId
    ? db
      .prepare(
        `SELECT rv.product_id, p.title, MIN(v.price_cents) AS min_price_cents, MAX(rv.viewed_at) as viewed_at
         FROM recently_viewed rv
         JOIN products p ON p.id = rv.product_id
         JOIN product_variants v ON v.product_id = p.id
         WHERE rv.user_id = ?
         GROUP BY rv.product_id
         ORDER BY viewed_at DESC
         LIMIT 20`
      )
      .all(userId)
    : db
      .prepare(
        `SELECT rv.product_id, p.title, MIN(v.price_cents) AS min_price_cents, MAX(rv.viewed_at) as viewed_at
         FROM recently_viewed rv
         JOIN products p ON p.id = rv.product_id
         JOIN product_variants v ON v.product_id = p.id
         WHERE rv.session_id = ?
         GROUP BY rv.product_id
         ORDER BY viewed_at DESC
         LIMIT 20`
      )
      .all(sessionId);

  return rows.map((row) => ({
    productId: row.product_id,
    title: row.title,
    minPrice: row.min_price_cents / 100,
    viewedAt: row.viewed_at
  }));
}

