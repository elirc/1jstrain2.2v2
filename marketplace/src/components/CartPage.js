"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";

export default function CartPageView() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    setLoading(true);
    try {
      const data = await apiRequest("/api/cart");
      setCart(data.cart);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function patchItem(payload) {
    try {
      const data = await apiRequest("/api/cart", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setCart(data.cart);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeItem(itemId) {
    try {
      const data = await apiRequest(`/api/cart?itemId=${itemId}`, {
        method: "DELETE"
      });
      setCart(data.cart);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) {
    return <div className="card">Loading cart...</div>;
  }

  if (!cart) {
    return <div className="alert error">{error || "Could not load cart"}</div>;
  }

  return (
    <section className="stack">
      <div>
        <h1>Shopping Cart</h1>
        <p>Persistent cart with multi-seller grouping and saved-for-later support.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="card stack">
        {cart.items.length === 0 ? <p>Your cart is empty.</p> : null}

        {cart.sellers.map((seller) => (
          <div key={seller.sellerId} className="card stack">
            <div className="spread">
              <h3>{seller.sellerName}</h3>
              <span>Ships in {seller.shippingSpeedDays} days</span>
            </div>

            {seller.items.map((item) => (
              <div key={item.id} className="spread">
                <div>
                  <strong>{item.productTitle}</strong>
                  <p>{item.variantLabel || "Default variant"}</p>
                  <p>${(item.priceCents / 100).toFixed(2)} each · {item.inventory} in stock</p>
                </div>
                <div className="row">
                  <input
                    style={{ width: "80px" }}
                    type="number"
                    min="1"
                    max="99"
                    value={item.quantity}
                    onChange={(event) => patchItem({ itemId: item.id, quantity: Number(event.target.value) || 1 })}
                  />
                  <button type="button" className="button ghost" onClick={() => patchItem({ itemId: item.id, savedForLater: true })}>
                    Save for later
                  </button>
                  <button type="button" className="button ghost" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="spread">
          <h3>Total ({cart.itemCount} items)</h3>
          <strong>${cart.subtotal.toFixed(2)}</strong>
        </div>

        <div className="row">
          <Link href="/checkout" className="button">
            Proceed to Checkout
          </Link>
          <button type="button" className="button ghost" onClick={loadCart}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>Saved for Later</h2>
        {cart.savedForLater.length === 0 ? <p>No saved items.</p> : null}
        {cart.savedForLater.map((item) => (
          <div key={item.id} className="spread">
            <div>
              <strong>{item.productTitle}</strong>
              <p>{item.variantLabel}</p>
            </div>
            <button type="button" onClick={() => patchItem({ itemId: item.id, savedForLater: false })}>
              Move to cart
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

