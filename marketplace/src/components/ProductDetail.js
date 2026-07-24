"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";

export default function ProductDetail({ productId }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reviewVoteLoading, setReviewVoteLoading] = useState(null);

  async function loadProduct() {
    try {
      setError("");
      const data = await apiRequest(`/api/products/${productId}`);
      setProduct(data.product);
      setSelectedVariantId(String(data.product.variants?.[0]?.id || ""));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => String(variant.id) === String(selectedVariantId)),
    [product, selectedVariantId]
  );

  async function addToCart() {
    if (!selectedVariantId) {
      setError("Pick a variant first");
      return;
    }

    try {
      setError("");
      setMessage("");
      await apiRequest("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          productId,
          variantId: Number(selectedVariantId),
          quantity
        })
      });
      setMessage("Added to cart.");
      router.refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleWishlist() {
    try {
      await apiRequest("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId: Number(productId) })
      });
      setMessage("Wishlist updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function voteReview(reviewId, vote) {
    try {
      setReviewVoteLoading(reviewId);
      await apiRequest("/api/reviews/vote", {
        method: "POST",
        body: JSON.stringify({ reviewId, vote })
      });
      await loadProduct();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReviewVoteLoading(null);
    }
  }

  if (error && !product) {
    return <div className="alert error">{error}</div>;
  }

  if (!product) {
    return <div className="card">Loading product...</div>;
  }

  return (
    <section className="stack">
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="cols-2">
        <div className="card stack">
          <img
            src={product.images?.[0]?.url || selectedVariant?.image || "https://via.placeholder.com/960x720?text=Product"}
            alt={product.title}
            style={{ width: "100%", borderRadius: "0.8rem", maxHeight: "420px", objectFit: "cover" }}
          />
          <div className="row" style={{ flexWrap: "wrap" }}>
            {(product.images || []).map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.alt_text || product.title}
                style={{ width: "72px", height: "72px", borderRadius: "0.5rem", objectFit: "cover" }}
              />
            ))}
          </div>
        </div>

        <div className="card stack">
          <h1>{product.title}</h1>
          <p>{product.description}</p>
          <p>
            Sold by <strong>{product.store.name}</strong> · Ships in {product.store.shippingSpeedDays} days
          </p>

          <div>
            <label htmlFor="variant">Variant</label>
            <select id="variant" value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)}>
              {(product.variants || []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.size || "One Size"} / {variant.color || "Default"} / {variant.material || "Material"} - ${variant.price.toFixed(2)} ({variant.inventory} left)
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <div style={{ width: "110px" }}>
              <label htmlFor="quantity">Qty</label>
              <input
                id="quantity"
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>
            <button type="button" onClick={addToCart}>
              Add to Cart
            </button>
            <button type="button" className="button ghost" onClick={toggleWishlist}>
              Save
            </button>
          </div>

          <div className="card">
            <h3>Ratings Breakdown</h3>
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="spread">
                <span>{star} star</span>
                <strong>{product.ratingsHistogram?.[star] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card stack">
        <h2>Verified Reviews</h2>
        {(product.reviews || []).length === 0 ? <p>No reviews yet.</p> : null}
        {(product.reviews || []).map((review) => (
          <div key={review.id} className="card stack">
            <div className="spread">
              <strong>{review.rating}? {review.title}</strong>
              <span className="muted">{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            <p>{review.body}</p>
            <div className="row muted">
              <span>by {review.buyer_name}</span>
              {review.verified_purchase ? <span>Verified purchase</span> : null}
              <span>Helpful: {review.helpful_count}</span>
            </div>
            {review.seller_response ? (
              <div className="card">
                <strong>Seller response:</strong>
                <p>{review.seller_response}</p>
              </div>
            ) : null}
            <div className="row">
              <button type="button" className="button ghost" disabled={reviewVoteLoading === review.id} onClick={() => voteReview(review.id, 1)}>
                Helpful
              </button>
              <button type="button" className="button ghost" disabled={reviewVoteLoading === review.id} onClick={() => voteReview(review.id, -1)}>
                Not Helpful
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

