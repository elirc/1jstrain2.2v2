import { getDb } from "@/lib/db";
import { toCents, nowIso } from "@/lib/security";
import { numeric, parseJson } from "@/lib/utils";

function getProductBaseRows() {
  const db = getDb();

  return db
    .prepare(
      `SELECT
        p.id,
        p.title,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        p.featured,
        p.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        s.id AS store_id,
        s.name AS store_name,
        s.slug AS store_slug,
        s.shipping_speed_days,
        MIN(v.price_cents) AS min_price_cents,
        MAX(v.price_cents) AS max_price_cents,
        SUM(v.inventory) AS inventory_total,
        AVG(r.rating) AS rating_avg,
        COUNT(DISTINCT r.id) AS rating_count
      FROM products p
      JOIN stores s ON s.id = p.store_id
      LEFT JOIN categories c ON c.id = p.category_id
      JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id`
    )
    .all();
}

function getProductPrimaryImages(productIds) {
  if (productIds.length === 0) {
    return {};
  }

  const db = getDb();
  const placeholders = productIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT product_id, url
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`
    )
    .all(...productIds);

  return rows.reduce((acc, row) => {
    if (!acc[row.product_id]) {
      acc[row.product_id] = row.url;
    }
    return acc;
  }, {});
}

export function getCategoryTree() {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, parent_id, name, slug FROM categories ORDER BY name ASC")
    .all();

  const byParent = rows.reduce((acc, category) => {
    const key = category.parent_id ?? "root";
    acc[key] = acc[key] ?? [];
    acc[key].push({ ...category, children: [] });
    return acc;
  }, {});

  function build(parentId) {
    const key = parentId ?? "root";
    return (byParent[key] ?? []).map((category) => ({
      ...category,
      children: build(category.id)
    }));
  }

  return build(null);
}

export function getCatalog({
  query = "",
  category = "",
  minPrice = "",
  maxPrice = "",
  minRating = "",
  shippingSpeed = "",
  seller = "",
  sort = "relevance",
  cursor = "0",
  pageSize = 12
}) {
  const rawRows = getProductBaseRows();

  const searchableQuery = query.trim().toLowerCase();
  const minPriceCents = minPrice ? toCents(minPrice) : 0;
  const maxPriceCents = maxPrice ? toCents(maxPrice) : Number.MAX_SAFE_INTEGER;
  const minRatingValue = minRating ? numeric(minRating, 0) : 0;
  const shippingDaysCap = shippingSpeed ? numeric(shippingSpeed, 365) : null;
  const cursorValue = numeric(cursor, 0);

  const productsWithRelevance = rawRows
    .map((product) => {
      const title = product.title.toLowerCase();
      const desc = product.description.toLowerCase();
      const sellerName = (product.store_name || "").toLowerCase();

      let relevanceScore = 0;
      if (searchableQuery) {
        if (title.includes(searchableQuery)) {
          relevanceScore += 5;
        }
        if (desc.includes(searchableQuery)) {
          relevanceScore += 2;
        }
        if (sellerName.includes(searchableQuery)) {
          relevanceScore += 1;
        }
      }

      return {
        ...product,
        relevanceScore,
        rating_avg: numeric(product.rating_avg, 0),
        rating_count: numeric(product.rating_count, 0),
        min_price_cents: numeric(product.min_price_cents, 0),
        max_price_cents: numeric(product.max_price_cents, 0),
        inventory_total: numeric(product.inventory_total, 0)
      };
    })
    .filter((product) => {
      const matchesQuery = !searchableQuery || product.relevanceScore > 0;
      const matchesCategory = !category || product.category_slug === category || String(product.category_id) === category;
      const matchesPrice =
        product.min_price_cents >= minPriceCents &&
        product.min_price_cents <= maxPriceCents;
      const matchesRating = product.rating_avg >= minRatingValue;
      const matchesShipping = shippingDaysCap == null || numeric(product.shipping_speed_days, 99) <= shippingDaysCap;
      const matchesSeller = !seller || product.store_slug === seller || String(product.store_id) === seller;
      const inStock = product.inventory_total > 0;

      return (
        matchesQuery &&
        matchesCategory &&
        matchesPrice &&
        matchesRating &&
        matchesShipping &&
        matchesSeller &&
        inStock
      );
    });

  const sorted = productsWithRelevance.sort((a, b) => {
    if (sort === "price_asc") {
      return a.min_price_cents - b.min_price_cents;
    }
    if (sort === "price_desc") {
      return b.min_price_cents - a.min_price_cents;
    }
    if (sort === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sort === "rating") {
      return b.rating_avg - a.rating_avg || b.rating_count - a.rating_count;
    }

    return b.relevanceScore - a.relevanceScore || b.rating_avg - a.rating_avg;
  });

  const page = sorted.slice(cursorValue, cursorValue + pageSize);
  const productIds = page.map((product) => product.id);
  const images = getProductPrimaryImages(productIds);

  const products = page.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    category: {
      id: product.category_id,
      slug: product.category_slug,
      name: product.category_name
    },
    store: {
      id: product.store_id,
      slug: product.store_slug,
      name: product.store_name,
      shippingSpeedDays: product.shipping_speed_days
    },
    featured: Boolean(product.featured),
    minPrice: product.min_price_cents / 100,
    maxPrice: product.max_price_cents / 100,
    rating: Number(product.rating_avg.toFixed(2)),
    ratingCount: product.rating_count,
    inventory: product.inventory_total,
    image: images[product.id] || ""
  }));

  const facets = sorted.reduce(
    (acc, product) => {
      const categoryKey = product.category_slug || "uncategorized";
      const shippingKey = `${product.shipping_speed_days}d`;
      const priceBucket =
        product.min_price_cents < 2500 ? "under_25" :
          product.min_price_cents < 5000 ? "25_50" :
            product.min_price_cents < 10000 ? "50_100" : "100_plus";

      acc.categories[categoryKey] = (acc.categories[categoryKey] || 0) + 1;
      acc.shipping[shippingKey] = (acc.shipping[shippingKey] || 0) + 1;
      acc.priceBuckets[priceBucket] = (acc.priceBuckets[priceBucket] || 0) + 1;
      return acc;
    },
    { categories: {}, shipping: {}, priceBuckets: {} }
  );

  return {
    products,
    total: sorted.length,
    nextCursor: cursorValue + page.length < sorted.length ? cursorValue + page.length : null,
    facets,
    categories: getCategoryTree()
  };
}

export function getProductById(productId) {
  const db = getDb();
  const id = Number(productId);

  const product = db
    .prepare(
      `SELECT
        p.*, c.name AS category_name, c.slug AS category_slug,
        s.name AS store_name, s.slug AS store_slug, s.shipping_speed_days
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       JOIN stores s ON s.id = p.store_id
       WHERE p.id = ?`
    )
    .get(id);

  if (!product) {
    return null;
  }

  const variants = db
    .prepare(
      `SELECT id, sku, option_size, option_color, option_material, price_cents, inventory, image_url
       FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY id ASC`
    )
    .all(id)
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.option_size,
      color: variant.option_color,
      material: variant.option_material,
      price: variant.price_cents / 100,
      inventory: variant.inventory,
      image: variant.image_url
    }));

  const images = db
    .prepare(
      `SELECT id, url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC`
    )
    .all(id);

  const reviews = db
    .prepare(
      `SELECT r.id, r.rating, r.title, r.body, r.seller_response, r.verified_purchase, r.helpful_count,
              r.created_at, u.name AS buyer_name
       FROM reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(id)
    .map((review) => ({
      ...review,
      images: db
        .prepare("SELECT url FROM review_images WHERE review_id = ? ORDER BY id ASC")
        .all(review.id)
        .map((row) => row.url)
    }));

  const ratingsHistogram = [5, 4, 3, 2, 1].reduce((acc, star) => {
    acc[star] = reviews.filter((review) => review.rating === star).length;
    return acc;
  }, {});

  const ratingAverage =
    reviews.length === 0 ? 0 : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  const relatedIds = parseJson(product.related_product_ids, []);
  const relatedProducts = relatedIds.length
    ? db
      .prepare(
        `SELECT p.id, p.title, MIN(v.price_cents) AS min_price_cents
         FROM products p
         JOIN product_variants v ON v.product_id = p.id
         WHERE p.id IN (${relatedIds.map(() => "?").join(",")})
         GROUP BY p.id`
      )
      .all(...relatedIds)
      .map((row) => ({ id: row.id, title: row.title, minPrice: row.min_price_cents / 100 }))
    : [];

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    seoTitle: product.seo_title,
    seoDescription: product.seo_description,
    status: product.status,
    category: {
      id: product.category_id,
      name: product.category_name,
      slug: product.category_slug
    },
    store: {
      id: product.store_id,
      name: product.store_name,
      slug: product.store_slug,
      shippingSpeedDays: product.shipping_speed_days
    },
    variants,
    images,
    reviews,
    ratingAverage: Number(ratingAverage.toFixed(2)),
    ratingsHistogram,
    relatedProducts,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

export function recordRecentlyViewed({ productId, userId, sessionId }) {
  const db = getDb();
  const viewedAt = nowIso();

  db.prepare(
    "INSERT INTO recently_viewed(user_id, session_id, product_id, viewed_at) VALUES(?, ?, ?, ?)"
  ).run(userId || null, sessionId || null, Number(productId), viewedAt);

  if (userId) {
    db.prepare(
      `DELETE FROM recently_viewed
       WHERE user_id = ?
         AND id NOT IN (
           SELECT id FROM recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 20
         )`
    ).run(userId, userId);
  }
}

