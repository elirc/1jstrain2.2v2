import { getDb } from "@/lib/db";
import { nowIso, toCents } from "@/lib/security";
import { numeric, parseJson } from "@/lib/utils";
import { getProductById } from "@/lib/catalog";
import { listOrdersForSeller } from "@/lib/orders";

export function createProduct({ sellerId, payload }) {
  const db = getDb();
  const store = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);

  if (!store) {
    throw new Error("Create your store profile before adding products");
  }

  const now = nowIso();
  const insert = db
    .prepare(
      `INSERT INTO products(
         store_id, seller_id, category_id, title, description, status,
         seo_title, seo_description, related_product_ids, featured, created_at, updated_at
       ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      store.id,
      sellerId,
      payload.categoryId || null,
      payload.title,
      payload.description,
      payload.status || "DRAFT",
      payload.seoTitle || payload.title,
      payload.seoDescription || payload.description.slice(0, 150),
      JSON.stringify(payload.relatedProductIds || []),
      payload.featured ? 1 : 0,
      now,
      now
    );

  const productId = Number(insert.lastInsertRowid);

  const variants = (payload.variants || []).flatMap((variant) => {
    if (!variant.sku) {
      return [];
    }

    return [
      {
        productId,
        sku: variant.sku,
        optionSize: variant.size || "",
        optionColor: variant.color || "",
        optionMaterial: variant.material || "",
        priceCents: toCents(variant.price || 0),
        inventory: numeric(variant.inventory, 0),
        imageUrl: variant.imageUrl || ""
      }
    ];
  });

  if (variants.length === 0) {
    throw new Error("At least one variant is required");
  }

  const insertVariant = db.prepare(
    `INSERT INTO product_variants(
       product_id, sku, option_size, option_color, option_material,
       price_cents, inventory, image_url, is_active, created_at
     ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );

  variants.forEach((variant) => {
    insertVariant.run(
      variant.productId,
      variant.sku,
      variant.optionSize,
      variant.optionColor,
      variant.optionMaterial,
      variant.priceCents,
      variant.inventory,
      variant.imageUrl,
      now
    );
  });

  const insertImage = db.prepare(
    "INSERT INTO product_images(product_id, url, alt_text, sort_order) VALUES(?, ?, ?, ?)"
  );

  (payload.images || []).forEach((url, index) => {
    if (url) {
      insertImage.run(productId, url, payload.title, index);
    }
  });

  return getProductById(productId);
}

export function updateProduct({ sellerId, productId, payload }) {
  const db = getDb();
  const product = db.prepare("SELECT * FROM products WHERE id = ? AND seller_id = ?").get(Number(productId), sellerId);

  if (!product) {
    throw new Error("Product not found");
  }

  db.prepare(
    `UPDATE products
     SET title = ?, description = ?, status = ?, category_id = ?, seo_title = ?, seo_description = ?,
         related_product_ids = ?, featured = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    payload.title || product.title,
    payload.description || product.description,
    payload.status || product.status,
    payload.categoryId || product.category_id,
    payload.seoTitle || product.seo_title,
    payload.seoDescription || product.seo_description,
    JSON.stringify(payload.relatedProductIds || parseJson(product.related_product_ids, [])),
    payload.featured != null ? (payload.featured ? 1 : 0) : product.featured,
    nowIso(),
    product.id
  );

  if (Array.isArray(payload.variants)) {
    payload.variants.forEach((variant) => {
      if (!variant.id) {
        return;
      }
      db.prepare(
        `UPDATE product_variants
         SET price_cents = ?, inventory = ?, option_size = ?, option_color = ?, option_material = ?, image_url = ?
         WHERE id = ? AND product_id = ?`
      ).run(
        toCents(variant.price),
        numeric(variant.inventory, 0),
        variant.size || "",
        variant.color || "",
        variant.material || "",
        variant.imageUrl || "",
        variant.id,
        product.id
      );
    });
  }

  return getProductById(product.id);
}

export function listSellerProducts(sellerId) {
  const db = getDb();
  const products = db
    .prepare(
      `SELECT p.id, p.title, p.status, p.created_at,
              MIN(v.price_cents) AS min_price_cents,
              SUM(v.inventory) AS inventory_total
       FROM products p
       JOIN product_variants v ON v.product_id = p.id
       WHERE p.seller_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    )
    .all(sellerId);

  return products.map((product) => ({
    ...product,
    minPrice: product.min_price_cents / 100,
    inventory: product.inventory_total
  }));
}

export function upsertStore({ sellerId, payload }) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
  const now = nowIso();

  if (existing) {
    db.prepare(
      `UPDATE stores SET name = ?, slug = ?, description = ?, theme_json = ?, shipping_speed_days = ?, updated_at = ?
       WHERE seller_id = ?`
    ).run(
      payload.name || existing.name,
      payload.slug || existing.slug,
      payload.description || existing.description,
      JSON.stringify(payload.theme || parseJson(existing.theme_json, {})),
      payload.shippingSpeedDays || existing.shipping_speed_days,
      now,
      sellerId
    );
  } else {
    db.prepare(
      `INSERT INTO stores(seller_id, name, slug, description, theme_json, shipping_speed_days, payout_balance_cents, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      sellerId,
      payload.name,
      payload.slug,
      payload.description || "",
      JSON.stringify(payload.theme || {}),
      payload.shippingSpeedDays || 5,
      now,
      now
    );

    db.prepare(
      `INSERT INTO seller_profiles(user_id, application_status, bio, payout_account_ref, created_at)
       VALUES(?, 'PENDING', ?, '', ?)
       ON CONFLICT(user_id) DO UPDATE SET bio = excluded.bio`
    ).run(sellerId, payload.bio || "", now);
  }

  return db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
}

export function getSellerDashboard(sellerId) {
  const db = getDb();
  const store = db.prepare("SELECT * FROM stores WHERE seller_id = ?").get(sellerId);
  const profile = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(sellerId);

  const metrics = db
    .prepare(
      `SELECT
         COUNT(DISTINCT o.id) AS orders_count,
         COALESCE(SUM(o.total_cents), 0) AS revenue_cents,
         COALESCE(SUM(t.fee_cents), 0) AS fees_cents
       FROM orders o
       LEFT JOIN transactions t ON t.order_id = o.id
       WHERE o.seller_id = ? AND o.payment_status = 'PAID'`
    )
    .get(sellerId);

  const lowInventory = db
    .prepare(
      `SELECT p.title, v.sku, v.inventory
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE p.seller_id = ? AND v.inventory <= 3
       ORDER BY v.inventory ASC`
    )
    .all(sellerId);

  return {
    store,
    profile,
    metrics: {
      orders: metrics.orders_count,
      revenue: metrics.revenue_cents / 100,
      fees: metrics.fees_cents / 100,
      payoutBalance: (store?.payout_balance_cents || 0) / 100
    },
    lowInventory,
    products: listSellerProducts(sellerId),
    recentOrders: listOrdersForSeller(sellerId).slice(0, 10)
  };
}

export function importProductsFromCsv({ sellerId, csvText }) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row");
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const required = ["title", "description", "sku", "price", "inventory"];
  required.forEach((column) => {
    if (!headers.includes(column)) {
      throw new Error(`Missing required CSV column: ${column}`);
    }
  });

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, (cols[index] || "").trim()]));
  });

  const created = [];
  rows.forEach((row) => {
    const product = createProduct({
      sellerId,
      payload: {
        title: row.title,
        description: row.description,
        status: row.status || "ACTIVE",
        seoTitle: row.seo_title || row.title,
        seoDescription: row.seo_description || row.description,
        variants: [
          {
            sku: row.sku,
            price: row.price,
            inventory: numeric(row.inventory, 0),
            size: row.size || "",
            color: row.color || "",
            material: row.material || "",
            imageUrl: row.image_url || ""
          }
        ],
        images: row.image_url ? [row.image_url] : []
      }
    });
    created.push(product.id);
  });

  return { createdCount: created.length, productIds: created };
}

