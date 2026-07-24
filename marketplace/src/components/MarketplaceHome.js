"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/client-api";

const DEFAULT_FILTERS = {
  q: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  shipping: "",
  sort: "relevance"
};

function buildQuery(filters, cursor) {
  const params = new URLSearchParams({ cursor: String(cursor), limit: "12" });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "") {
      params.set(key, value);
    }
  });

  return params.toString();
}

export default function MarketplaceHome() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState({ categories: {}, shipping: {}, priceBuckets: {} });
  const [cursor, setCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  async function loadCatalog(next = 0, append = false) {
    setLoading(true);
    setError("");

    try {
      const query = buildQuery(filters, next);
      const data = await apiRequest(`/api/catalog?${query}`);

      setProducts((current) => (append ? [...current, ...data.products] : data.products));
      setCursor(next);
      setNextCursor(data.nextCursor);
      setCategories(data.categories || []);
      setFacets(data.facets || { categories: {}, shipping: {}, priceBuckets: {} });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog(0, false);
  }, [filters]);

  useEffect(() => {
    apiRequest("/api/recently-viewed")
      .then((data) => setRecentlyViewed(data.items || []))
      .catch(() => setRecentlyViewed([]));
  }, []);

  const flatCategories = useMemo(() => {
    const flatten = (nodes, prefix = "") =>
      nodes.flatMap((node) => {
        const label = prefix ? `${prefix} / ${node.name}` : node.name;
        return [{ value: node.slug, label }, ...flatten(node.children || [], label)];
      });

    return flatten(categories);
  }, [categories]);

  function onFilterChange(field, value) {
    setFilters((current) => Object.fromEntries(Object.entries(current).map(([k, v]) => [k, k === field ? value : v])));
  }

  return (
    <section className="stack">
      <div>
        <h1>Multi-Vendor Marketplace</h1>
        <p>
          Browse products, filter by facets, and checkout across multiple stores in one cart.
        </p>
      </div>

      <div className="card">
        <div className="filters">
          <div>
            <label htmlFor="q">Search</label>
            <input id="q" value={filters.q} onChange={(event) => onFilterChange("q", event.target.value)} placeholder="tapestry, ceramic, linen" />
          </div>
          <div>
            <label htmlFor="category">Category</label>
            <select id="category" value={filters.category} onChange={(event) => onFilterChange("category", event.target.value)}>
              <option value="">All</option>
              {flatCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="minPrice">Min Price</label>
            <input id="minPrice" type="number" min="0" value={filters.minPrice} onChange={(event) => onFilterChange("minPrice", event.target.value)} />
          </div>
          <div>
            <label htmlFor="maxPrice">Max Price</label>
            <input id="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={(event) => onFilterChange("maxPrice", event.target.value)} />
          </div>
          <div>
            <label htmlFor="rating">Min Rating</label>
            <select id="rating" value={filters.minRating} onChange={(event) => onFilterChange("minRating", event.target.value)}>
              <option value="">Any</option>
              <option value="4">4+</option>
              <option value="3">3+</option>
              <option value="2">2+</option>
            </select>
          </div>
          <div>
            <label htmlFor="shipping">Shipping Speed (days)</label>
            <select id="shipping" value={filters.shipping} onChange={(event) => onFilterChange("shipping", event.target.value)}>
              <option value="">Any</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort">Sort</label>
            <select id="sort" value={filters.sort} onChange={(event) => onFilterChange("sort", event.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price low-high</option>
              <option value="price_desc">Price high-low</option>
              <option value="newest">Newest</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>

        <div className="row muted" style={{ fontSize: "0.88rem" }}>
          <span>Category facets: {Object.entries(facets.categories || {}).map(([key, count]) => `${key} (${count})`).join(" | ") || "none"}</span>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="grid products">
        {products.map((product) => (
          <article key={product.id} className="card product-card">
            <img src={product.image || "https://via.placeholder.com/640x360?text=Product"} alt={product.title} />
            <h3>{product.title}</h3>
            <p>{product.store.name}</p>
            <div className="spread" style={{ marginTop: "0.7rem" }}>
              <strong>${product.minPrice.toFixed(2)}</strong>
              <span className="muted">{product.rating.toFixed(1)}?</span>
            </div>
            <div className="row" style={{ marginTop: "0.8rem" }}>
              <Link className="button" href={`/product/${product.id}`}>
                View Product
              </Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && products.length === 0 ? <div className="card">No products matched your filters.</div> : null}

      <div className="row">
        {loading ? <span className="muted">Loading...</span> : null}
        {!loading && nextCursor != null ? (
          <button type="button" onClick={() => loadCatalog(nextCursor, true)}>
            Load More
          </button>
        ) : null}
      </div>

      <div className="card stack">
        <h2>Recently Viewed</h2>
        {recentlyViewed.length === 0 ? (
          <p>No recently viewed products yet.</p>
        ) : (
          recentlyViewed.map((item) => (
            <Link key={`${item.productId}-${item.viewedAt}`} href={`/product/${item.productId}`} className="spread">
              <span>{item.title}</span>
              <strong>${item.minPrice.toFixed(2)}</strong>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

