import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { hashPassword, nowIso, toCents } from "@/lib/security";

const DB_DIRECTORY = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIRECTORY, "marketplace.db");

let initialized = false;

function initSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('BUYER', 'SELLER', 'ADMIN')),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seller_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      application_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(application_status IN ('PENDING', 'APPROVED', 'REJECTED')),
      bio TEXT DEFAULT '',
      payout_account_ref TEXT DEFAULT '',
      approved_at TEXT,
      rejected_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      theme_json TEXT DEFAULT '{}',
      shipping_speed_days INTEGER NOT NULL DEFAULT 5,
      payout_balance_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      category_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      related_product_ids TEXT DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      option_size TEXT DEFAULT '',
      option_color TEXT DEFAULT '',
      option_material TEXT DEFAULT '',
      price_cents INTEGER NOT NULL,
      inventory INTEGER NOT NULL,
      image_url TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      session_id TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      saved_for_later INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      UNIQUE(cart_id, variant_id, saved_for_later),
      FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT DEFAULT '',
      city TEXT NOT NULL,
      region TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      phone TEXT DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      buyer_id INTEGER,
      seller_id INTEGER NOT NULL,
      address_id INTEGER,
      subtotal_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED' CHECK(status IN ('PLACED','CONFIRMED','SHIPPED','DELIVERED','COMPLETED','CANCELLED','REFUNDED')),
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),
      payment_intent TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(address_id) REFERENCES addresses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      seller_id INTEGER NOT NULL,
      title_snapshot TEXT NOT NULL,
      variant_snapshot TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total_cents INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      title TEXT DEFAULT '',
      body TEXT NOT NULL,
      seller_response TEXT DEFAULT '',
      verified_purchase INTEGER NOT NULL DEFAULT 1,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vote INTEGER NOT NULL CHECK(vote IN (1,-1)),
      created_at TEXT NOT NULL,
      UNIQUE(review_id, user_id),
      FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discount_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('PERCENT', 'FIXED')),
      amount INTEGER NOT NULL,
      min_order_cents INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      uses_count INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','FAILED')),
      created_at TEXT NOT NULL,
      paid_at TEXT,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      seller_id INTEGER,
      buyer_id INTEGER,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      fee_cents INTEGER NOT NULL DEFAULT 0,
      provider TEXT DEFAULT 'SIMULATED',
      provider_ref TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      raised_by INTEGER NOT NULL,
      against_user INTEGER,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_REVIEW','RESOLVED','REJECTED')),
      resolution_note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(raised_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(against_user) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, product_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recently_viewed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      product_id INTEGER NOT NULL,
      viewed_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      meta_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      platform_fee_bps INTEGER NOT NULL DEFAULT 1000,
      featured_collection_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
    CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
  `);
}

function seedCategories(db) {
  const count = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
  if (count > 0) {
    return;
  }

  const categories = [
    { name: "Home", slug: "home", parent: null },
    { name: "Art", slug: "art", parent: null },
    { name: "Fashion", slug: "fashion", parent: null },
    { name: "Furniture", slug: "furniture", parent: "home" },
    { name: "Decor", slug: "decor", parent: "home" },
    { name: "Wall Art", slug: "wall-art", parent: "art" },
    { name: "Accessories", slug: "accessories", parent: "fashion" }
  ];

  const insert = db.prepare("INSERT INTO categories(parent_id, name, slug) VALUES(?, ?, ?)");
  const getIdBySlug = db.prepare("SELECT id FROM categories WHERE slug = ?");

  for (const category of categories) {
    const parentId = category.parent ? getIdBySlug.get(category.parent)?.id ?? null : null;
    insert.run(parentId, category.name, category.slug);
  }
}

function seedData(db) {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount > 0) {
    return;
  }

  const createdAt = nowIso();
  const insertUser = db.prepare(
    "INSERT INTO users(email, password_hash, role, name, created_at) VALUES(?, ?, ?, ?, ?)"
  );

  insertUser.run("admin@market.dev", hashPassword("Admin123!"), "ADMIN", "Marketplace Admin", createdAt);
  insertUser.run("seller@market.dev", hashPassword("Seller123!"), "SELLER", "Maker Seller", createdAt);
  insertUser.run("buyer@market.dev", hashPassword("Buyer123!"), "BUYER", "Demo Buyer", createdAt);

  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@market.dev");
  const seller = db.prepare("SELECT id FROM users WHERE email = ?").get("seller@market.dev");
  const buyer = db.prepare("SELECT id FROM users WHERE email = ?").get("buyer@market.dev");

  db.prepare(
    `INSERT INTO seller_profiles(user_id, application_status, bio, payout_account_ref, approved_at, created_at)
     VALUES(?, 'APPROVED', ?, ?, ?, ?)`
  ).run(seller.id, "Handmade goods and premium craft materials.", "acct_demo_seller", createdAt, createdAt);

  db.prepare(
    `INSERT INTO stores(seller_id, name, slug, description, theme_json, shipping_speed_days, payout_balance_cents, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    seller.id,
    "Maker Studio",
    "maker-studio",
    "Handmade marketplace goods by independent creators.",
    JSON.stringify({ accent: "#1f7a8c", hero: "clean" }),
    3,
    createdAt,
    createdAt
  );

  seedCategories(db);

  const store = db.prepare("SELECT id FROM stores WHERE seller_id = ?").get(seller.id);
  const wallArtCategory = db.prepare("SELECT id FROM categories WHERE slug = ?").get("wall-art");
  const decorCategory = db.prepare("SELECT id FROM categories WHERE slug = ?").get("decor");

  const insertProduct = db.prepare(
    `INSERT INTO products(
      store_id, seller_id, category_id, title, description, status,
      seo_title, seo_description, related_product_ids, featured, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, 'ACTIVE', ?, ?, '[]', ?, ?, ?)`
  );

  const insertVariant = db.prepare(
    `INSERT INTO product_variants(
      product_id, sku, option_size, option_color, option_material,
      price_cents, inventory, image_url, is_active, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );

  const insertImage = db.prepare(
    `INSERT INTO product_images(product_id, url, alt_text, sort_order) VALUES(?, ?, ?, ?)`
  );

  const productDefinitions = [
    {
      title: "Handwoven Wall Tapestry",
      description: "Loom-crafted tapestry with natural cotton and geometric motifs.",
      categoryId: wallArtCategory.id,
      seoTitle: "Handwoven Wall Tapestry",
      seoDescription: "Premium handcrafted tapestry made by an independent artist.",
      featured: 1,
      variants: [
        { sku: "TAP-MED-NAT", size: "Medium", color: "Natural", material: "Cotton", price: 89.99, inventory: 8 },
        { sku: "TAP-LRG-SAND", size: "Large", color: "Sand", material: "Cotton", price: 119.99, inventory: 4 }
      ],
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200"
    },
    {
      title: "Ceramic Pour-Over Set",
      description: "Stoneware dripper and mug set fired at high temperature.",
      categoryId: decorCategory.id,
      seoTitle: "Ceramic Pour Over Coffee Set",
      seoDescription: "Barista-inspired handmade ceramic pour-over kit.",
      featured: 1,
      variants: [
        { sku: "CER-SAGE-1", size: "Standard", color: "Sage", material: "Ceramic", price: 54.5, inventory: 12 },
        { sku: "CER-CHAR-1", size: "Standard", color: "Charcoal", material: "Ceramic", price: 56.0, inventory: 7 }
      ],
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200"
    },
    {
      title: "Linen Table Runner",
      description: "European flax linen table runner with stitched edge.",
      categoryId: decorCategory.id,
      seoTitle: "Linen Table Runner",
      seoDescription: "Minimalist linen table runner for dining and events.",
      featured: 0,
      variants: [
        { sku: "LIN-GLD-140", size: "140cm", color: "Gold", material: "Linen", price: 29.99, inventory: 20 },
        { sku: "LIN-IVO-180", size: "180cm", color: "Ivory", material: "Linen", price: 34.99, inventory: 15 }
      ],
      image: "https://images.unsplash.com/photo-1560180474-e8563fd75bab?w=1200"
    }
  ];

  for (const definition of productDefinitions) {
    const productInsert = insertProduct.run(
      store.id,
      seller.id,
      definition.categoryId,
      definition.title,
      definition.description,
      definition.seoTitle,
      definition.seoDescription,
      definition.featured,
      createdAt,
      createdAt
    );

    const productId = Number(productInsert.lastInsertRowid);
    insertImage.run(productId, definition.image, definition.title, 0);

    definition.variants.forEach((variant) => {
      insertVariant.run(
        productId,
        variant.sku,
        variant.size,
        variant.color,
        variant.material,
        toCents(variant.price),
        variant.inventory,
        definition.image,
        createdAt
      );
    });
  }

  db.prepare(
    "INSERT INTO discount_codes(code, description, type, amount, min_order_cents, max_uses, uses_count, starts_at, expires_at, active) VALUES(?, ?, 'PERCENT', ?, ?, ?, 0, ?, ?, 1)"
  ).run("WELCOME10", "10% off for first-time buyers", 10, 2000, 1000, createdAt, "2099-01-01T00:00:00.000Z");

  db.prepare("INSERT INTO platform_settings(id, platform_fee_bps, featured_collection_json, updated_at) VALUES(1, 1000, '[]', ?)")
    .run(createdAt);

  db.prepare(
    "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, ?, ?, 0, '{}', ?)"
  ).run(
    seller.id,
    "PAYOUT",
    "Your store is approved. Start listing products to earn payouts.",
    createdAt
  );

  db.prepare(
    "INSERT INTO addresses(user_id, full_name, line1, line2, city, region, postal_code, country, phone, is_default, created_at) VALUES(?, ?, ?, '', ?, ?, ?, ?, ?, 1, ?)"
  ).run(
    buyer.id,
    "Demo Buyer",
    "123 Market St",
    "San Francisco",
    "CA",
    "94103",
    "US",
    "+1-415-555-0101",
    createdAt
  );

  db.prepare(
    "INSERT INTO carts(user_id, session_id, created_at, updated_at) VALUES(?, NULL, ?, ?)"
  ).run(buyer.id, createdAt, createdAt);
}

function createConnection() {
  fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  initSchema(db);
  seedData(db);
  return db;
}

export function getDb() {
  if (!globalThis.__marketplaceDb) {
    globalThis.__marketplaceDb = createConnection();
    initialized = true;
  }

  if (!initialized) {
    initSchema(globalThis.__marketplaceDb);
    seedData(globalThis.__marketplaceDb);
    initialized = true;
  }

  return globalThis.__marketplaceDb;
}

export function runInTransaction(callback) {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE TRANSACTION");

  try {
    const result = callback(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

