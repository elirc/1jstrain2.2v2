"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";

export default function OrdersPageView() {
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("buyer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadOrders(nextView = view) {
    try {
      setError("");
      const data = await apiRequest(`/api/orders?view=${nextView}`);
      setOrders(data.orders || []);
    } catch (requestError) {
      setError(requestError.message);
      setOrders([]);
    }
  }

  useEffect(() => {
    loadOrders(view);
  }, [view]);

  async function createDispute(orderId) {
    try {
      await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          reason: "Package issue - please review"
        })
      });
      setSuccess(`Dispute created for order ${orderId}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitReview(orderItemId) {
    try {
      await apiRequest("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          orderItemId,
          rating: 5,
          title: "Great purchase",
          body: "Product matched the listing and shipped quickly.",
          images: []
        })
      });
      setSuccess("Review submitted.");
      loadOrders(view);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="stack">
      <div className="spread">
        <div>
          <h1>Orders</h1>
          <p>Track status lifecycle, raise disputes, and post verified reviews.</p>
        </div>
        <select value={view} onChange={(event) => setView(event.target.value)} style={{ width: "160px" }}>
          <option value="buyer">Buyer view</option>
          <option value="seller">Seller view</option>
        </select>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="stack">
        {orders.length === 0 ? <div className="card">No orders in this view.</div> : null}

        {orders.map((order) => (
          <article key={order.id} className="card stack">
            <div className="spread">
              <h3>Order #{order.order_number || order.id}</h3>
              <strong>${(order.total || order.total_cents / 100).toFixed(2)}</strong>
            </div>
            <div className="row muted">
              <span>Status: {order.status}</span>
              <span>Payment: {order.payment_status}</span>
              {order.seller_name ? <span>Seller: {order.seller_name}</span> : null}
              {order.buyer_name ? <span>Buyer: {order.buyer_name}</span> : null}
            </div>

            {(order.items || []).map((item) => (
              <div key={item.id || `${order.id}-${item.title_snapshot}`} className="spread card">
                <div>
                  <strong>{item.title_snapshot}</strong>
                  <p>{item.variant_snapshot}</p>
                  <p>Qty: {item.quantity}</p>
                </div>
                <div className="row">
                  {view === "buyer" && ["DELIVERED", "COMPLETED"].includes(order.status) ? (
                    <button type="button" className="button ghost" onClick={() => submitReview(item.id)}>
                      Leave Review
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {view === "buyer" ? (
              <div className="row">
                <button type="button" className="button ghost" onClick={() => createDispute(order.id)}>
                  Report Issue
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

