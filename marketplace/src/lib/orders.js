import { getDb, runInTransaction } from "@/lib/db";
import { generateOrderNumber, nowIso, toCents } from "@/lib/security";
import { resolveCartIdentity, getCartItemsRaw } from "@/lib/cart";

const REGION_TAX_RATE = {
  CA: 0.0875,
  NY: 0.088,
  TX: 0.0825,
  WA: 0.065,
  default: 0.06
};

function computeDiscount({ subtotalCents, discountCode }) {
  if (!discountCode) {
    return { discountCents: 0, discountRow: null };
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM discount_codes
       WHERE code = ?
         AND active = 1
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (expires_at IS NULL OR expires_at >= ?)`
    )
    .get(discountCode.toUpperCase(), nowIso(), nowIso());

  if (!row) {
    throw new Error("Discount code not valid");
  }

  if (subtotalCents < row.min_order_cents) {
    throw new Error("Order does not meet discount minimum");
  }

  if (row.max_uses != null && row.uses_count >= row.max_uses) {
    throw new Error("Discount code usage limit reached");
  }

  const discountCents =
    row.type === "PERCENT"
      ? Math.floor(subtotalCents * (row.amount / 100))
      : Math.min(row.amount, subtotalCents);

  return { discountCents, discountRow: row };
}

export function checkout({ userId, sessionId, payload }) {
  return runInTransaction((db) => {
    const cart = resolveCartIdentity({ userId, sessionId });
    const items = getCartItemsRaw(cart.id).filter((item) => !item.savedForLater);

    if (items.length === 0) {
      throw new Error("Cart is empty");
    }

    const groupedBySeller = items.reduce((acc, item) => {
      acc[item.sellerId] = acc[item.sellerId] ?? [];
      acc[item.sellerId].push(item);
      return acc;
    }, {});

    const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const { discountCents, discountRow } = computeDiscount({
      subtotalCents,
      discountCode: payload.discountCode
    });

    const addressCreatedAt = nowIso();
    const addressInsert = db
      .prepare(
        `INSERT INTO addresses(user_id, full_name, line1, line2, city, region, postal_code, country, phone, is_default, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        userId || null,
        payload.address.fullName,
        payload.address.line1,
        payload.address.line2 || "",
        payload.address.city,
        payload.address.region,
        payload.address.postalCode,
        payload.address.country || "US",
        payload.address.phone || "",
        addressCreatedAt
      );

    const addressId = Number(addressInsert.lastInsertRowid);
    const taxRate = REGION_TAX_RATE[payload.address.region] ?? REGION_TAX_RATE.default;
    const settings = db.prepare("SELECT platform_fee_bps FROM platform_settings WHERE id = 1").get() ?? {
      platform_fee_bps: 1000
    };

    const orderIds = [];

    Object.entries(groupedBySeller).forEach(([sellerId, sellerItems]) => {
      const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
      const proportionalDiscount = subtotalCents > 0
        ? Math.floor((sellerSubtotal / subtotalCents) * discountCents)
        : 0;
      const shippingCents = toCents(payload.shippingBySeller?.[sellerId] ?? 7.99);
      const taxCents = Math.floor((sellerSubtotal - proportionalDiscount) * taxRate);
      const totalCents = sellerSubtotal + shippingCents + taxCents - proportionalDiscount;
      const createdAt = nowIso();

      const orderInsert = db
        .prepare(
          `INSERT INTO orders(
             order_number, buyer_id, seller_id, address_id, subtotal_cents, tax_cents,
             shipping_cents, discount_cents, total_cents, status, payment_status,
             payment_intent, created_at, updated_at
           ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLACED', 'PAID', ?, ?, ?)`
        )
        .run(
          generateOrderNumber(),
          userId || null,
          Number(sellerId),
          addressId,
          sellerSubtotal,
          taxCents,
          shippingCents,
          proportionalDiscount,
          totalCents,
          `pay_${Date.now()}_${sellerId}`,
          createdAt,
          createdAt
        );

      const orderId = Number(orderInsert.lastInsertRowid);
      orderIds.push(orderId);

      sellerItems.forEach((item) => {
        const updateInventory = db
          .prepare(
            "UPDATE product_variants SET inventory = inventory - ? WHERE id = ? AND inventory >= ?"
          )
          .run(item.quantity, item.variantId, item.quantity);

        if (updateInventory.changes === 0) {
          throw new Error(`Inventory changed for ${item.productTitle}. Please review your cart.`);
        }

        db.prepare(
          `INSERT INTO order_items(
             order_id, product_id, variant_id, seller_id, title_snapshot, variant_snapshot,
             unit_price_cents, quantity, line_total_cents
           ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          orderId,
          item.productId,
          item.variantId,
          item.sellerId,
          item.productTitle,
          item.variantLabel,
          item.priceCents,
          item.quantity,
          item.priceCents * item.quantity
        );
      });

      db.prepare(
        "INSERT INTO order_status_history(order_id, status, note, created_by, created_at) VALUES(?, 'PLACED', ?, ?, ?)"
      ).run(orderId, "Order created at checkout", userId || null, createdAt);

      const platformFee = Math.floor((sellerSubtotal * settings.platform_fee_bps) / 10000);

      db.prepare(
        `INSERT INTO transactions(order_id, seller_id, buyer_id, type, amount_cents, fee_cents, provider, provider_ref, created_at)
         VALUES(?, ?, ?, 'ORDER_CHARGE', ?, ?, 'SIMULATED', ?, ?)`
      ).run(orderId, Number(sellerId), userId || null, totalCents, platformFee, `txn_${orderId}`, createdAt);

      db.prepare(
        `INSERT INTO payouts(seller_id, amount_cents, status, created_at)
         VALUES(?, ?, 'PENDING', ?)`
      ).run(Number(sellerId), Math.max(0, sellerSubtotal - platformFee), createdAt);

      db.prepare("UPDATE stores SET payout_balance_cents = payout_balance_cents + ?, updated_at = ? WHERE seller_id = ?")
        .run(Math.max(0, sellerSubtotal - platformFee), createdAt, Number(sellerId));

      db.prepare(
        "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'ORDER_PLACED', ?, 0, ?, ?)"
      ).run(Number(sellerId), `New order received: #${orderId}`, JSON.stringify({ orderId }), createdAt);
    });

    if (discountRow) {
      db.prepare("UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = ?").run(discountRow.id);
    }

    db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND saved_for_later = 0").run(cart.id);
    db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(nowIso(), cart.id);

    if (userId) {
      db.prepare(
        "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'ORDER_CONFIRMED', ?, 0, ?, ?)"
      ).run(
        userId,
        `Your order${orderIds.length > 1 ? "s are" : " is"} confirmed`,
        JSON.stringify({ orderIds }),
        nowIso()
      );
    }

    return {
      orderIds,
      subtotal: subtotalCents / 100,
      discount: discountCents / 100
    };
  });
}

export function listOrdersForBuyer(userId) {
  const db = getDb();
  const orders = db
    .prepare(
      `SELECT o.*, s.name as seller_name
       FROM orders o
       JOIN stores s ON s.seller_id = o.seller_id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(userId);

  return orders.map((order) => ({
    ...order,
    subtotal: order.subtotal_cents / 100,
    tax: order.tax_cents / 100,
    shipping: order.shipping_cents / 100,
    discount: order.discount_cents / 100,
    total: order.total_cents / 100,
    items: db
      .prepare(
        "SELECT id, product_id, title_snapshot, variant_snapshot, unit_price_cents, quantity, line_total_cents FROM order_items WHERE order_id = ?"
      )
      .all(order.id)
      .map((item) => ({
        ...item,
        unitPrice: item.unit_price_cents / 100,
        lineTotal: item.line_total_cents / 100
      }))
  }));
}

export function listOrdersForSeller(sellerId) {
  const db = getDb();
  const orders = db
    .prepare(
      `SELECT o.*, u.name as buyer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.buyer_id
       WHERE o.seller_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(sellerId);

  return orders.map((order) => ({
    ...order,
    total: order.total_cents / 100,
    items: db
      .prepare("SELECT title_snapshot, variant_snapshot, quantity FROM order_items WHERE order_id = ?")
      .all(order.id)
  }));
}

export function updateOrderStatus({ sellerId, orderId, status, trackingNumber }) {
  const db = getDb();
  const allowedStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND seller_id = ?").get(Number(orderId), sellerId);
  if (!order) {
    throw new Error("Order not found");
  }

  const updatedAt = nowIso();
  db.prepare("UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = ? WHERE id = ?")
    .run(status, trackingNumber || null, updatedAt, order.id);

  db.prepare(
    "INSERT INTO order_status_history(order_id, status, note, created_by, created_at) VALUES(?, ?, ?, ?, ?)"
  ).run(order.id, status, `Updated by seller to ${status}`, sellerId, updatedAt);

  if (order.buyer_id) {
    db.prepare(
      "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'ORDER_STATUS', ?, 0, ?, ?)"
    ).run(order.buyer_id, `Order #${order.order_number} is now ${status}`, JSON.stringify({ orderId: order.id }), updatedAt);
  }

  return db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
}

