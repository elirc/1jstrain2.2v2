import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/security";

function resolveCart({ userId, sessionId }) {
  const db = getDb();

  if (!userId && !sessionId) {
    throw new Error("Cart identity missing");
  }

  let cart = null;

  if (userId) {
    cart = db.prepare("SELECT * FROM carts WHERE user_id = ?").get(userId);
  }

  if (!cart && sessionId) {
    cart = db.prepare("SELECT * FROM carts WHERE session_id = ?").get(sessionId);
  }

  if (!cart) {
    const createdAt = nowIso();
    const insert = db
      .prepare("INSERT INTO carts(user_id, session_id, created_at, updated_at) VALUES(?, ?, ?, ?)")
      .run(userId || null, sessionId || null, createdAt, createdAt);
    cart = db.prepare("SELECT * FROM carts WHERE id = ?").get(Number(insert.lastInsertRowid));
  } else if (userId && !cart.user_id) {
    db.prepare("UPDATE carts SET user_id = ?, updated_at = ? WHERE id = ?").run(userId, nowIso(), cart.id);
    cart.user_id = userId;
  }

  return cart;
}

function getCartItemsByCartId(cartId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         ci.id,
         ci.quantity,
         ci.saved_for_later,
         ci.variant_id,
         ci.product_id,
         p.title AS product_title,
         p.status AS product_status,
         s.id AS seller_id,
         s.name AS seller_name,
         s.shipping_speed_days,
         v.price_cents,
         v.inventory,
         v.option_size,
         v.option_color,
         v.option_material,
         pi.url AS image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN stores s ON s.id = p.store_id
       JOIN product_variants v ON v.id = ci.variant_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE ci.cart_id = ?
       GROUP BY ci.id
       ORDER BY ci.added_at DESC`
    )
    .all(cartId)
    .map((row) => ({
      id: row.id,
      quantity: row.quantity,
      savedForLater: Boolean(row.saved_for_later),
      variantId: row.variant_id,
      productId: row.product_id,
      productTitle: row.product_title,
      productStatus: row.product_status,
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      shippingSpeedDays: row.shipping_speed_days,
      priceCents: row.price_cents,
      inventory: row.inventory,
      variantLabel: [row.option_size, row.option_color, row.option_material].filter(Boolean).join(" / "),
      imageUrl: row.image_url || ""
    }));
}

function buildCartSummary(cart, items) {
  const activeItems = items.filter((item) => !item.savedForLater);
  const savedItems = items.filter((item) => item.savedForLater);

  const groupedBySeller = activeItems.reduce((acc, item) => {
    const key = item.sellerId;
    acc[key] = acc[key] || {
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      shippingSpeedDays: item.shippingSpeedDays,
      items: []
    };
    acc[key].items.push(item);
    return acc;
  }, {});

  const sellers = Object.values(groupedBySeller).map((group) => {
    const subtotalCents = group.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    return {
      ...group,
      subtotalCents,
      subtotal: subtotalCents / 100
    };
  });

  const subtotalCents = activeItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return {
    id: cart.id,
    updatedAt: cart.updated_at,
    itemCount: activeItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents,
    subtotal: subtotalCents / 100,
    sellers,
    items: activeItems,
    savedForLater: savedItems
  };
}

export function getCart({ userId, sessionId }) {
  const cart = resolveCart({ userId, sessionId });
  const items = getCartItemsByCartId(cart.id);
  return buildCartSummary(cart, items);
}

export function addCartItem({ userId, sessionId, productId, variantId, quantity = 1 }) {
  const db = getDb();
  const cart = resolveCart({ userId, sessionId });
  const product = db.prepare("SELECT id, seller_id FROM products WHERE id = ?").get(Number(productId));

  if (!product) {
    throw new Error("Product not found");
  }

  const variant = db
    .prepare("SELECT id, inventory FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1")
    .get(Number(variantId), Number(productId));

  if (!variant) {
    throw new Error("Variant not found");
  }

  const requestedQuantity = Math.max(1, Math.min(99, Number(quantity)));

  if (variant.inventory < requestedQuantity) {
    throw new Error("Not enough inventory for this variant");
  }

  const existing = db
    .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND saved_for_later = 0")
    .get(cart.id, Number(variantId));

  const addedAt = nowIso();

  if (existing) {
    const nextQuantity = Math.min(existing.quantity + requestedQuantity, variant.inventory);
    db.prepare("UPDATE cart_items SET quantity = ?, added_at = ? WHERE id = ?").run(nextQuantity, addedAt, existing.id);
  } else {
    db.prepare(
      `INSERT INTO cart_items(cart_id, product_id, variant_id, seller_id, quantity, saved_for_later, added_at)
       VALUES(?, ?, ?, ?, ?, 0, ?)`
    ).run(cart.id, Number(productId), Number(variantId), product.seller_id, requestedQuantity, addedAt);
  }

  db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(addedAt, cart.id);

  return getCart({ userId, sessionId });
}

export function updateCartItem({ userId, sessionId, itemId, quantity, savedForLater }) {
  const db = getDb();
  const cart = resolveCart({ userId, sessionId });
  const item = db.prepare("SELECT * FROM cart_items WHERE id = ? AND cart_id = ?").get(Number(itemId), cart.id);

  if (!item) {
    throw new Error("Cart item not found");
  }

  const nextQuantity = quantity != null ? Math.max(1, Math.min(99, Number(quantity))) : item.quantity;
  const nextSaved = savedForLater == null ? item.saved_for_later : (savedForLater ? 1 : 0);

  const variant = db.prepare("SELECT inventory FROM product_variants WHERE id = ?").get(item.variant_id);
  if (!variant || variant.inventory < nextQuantity) {
    throw new Error("Requested quantity exceeds inventory");
  }

  db.prepare("UPDATE cart_items SET quantity = ?, saved_for_later = ?, added_at = ? WHERE id = ?").run(
    nextQuantity,
    nextSaved,
    nowIso(),
    item.id
  );

  db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(nowIso(), cart.id);

  return getCart({ userId, sessionId });
}

export function removeCartItem({ userId, sessionId, itemId }) {
  const db = getDb();
  const cart = resolveCart({ userId, sessionId });

  db.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(Number(itemId), cart.id);
  db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(nowIso(), cart.id);

  return getCart({ userId, sessionId });
}

export function resolveCartIdentity({ userId, sessionId }) {
  return resolveCart({ userId, sessionId });
}

export function getCartItemsRaw(cartId) {
  return getCartItemsByCartId(cartId);
}

