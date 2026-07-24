"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";

const DEFAULT_PRODUCT = {
  title: "",
  description: "",
  status: "ACTIVE",
  featured: false,
  variants: [{ sku: "", price: "", inventory: "", size: "", color: "", material: "" }],
  images: [""]
};

export default function SellerPageView() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [storeForm, setStoreForm] = useState({
    name: "",
    slug: "",
    description: "",
    shippingSpeedDays: 5,
    bio: ""
  });
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT);
  const [csvText, setCsvText] = useState("");

  async function loadDashboard() {
    try {
      const data = await apiRequest("/api/seller/dashboard");
      setDashboard(data.dashboard);
      setError("");

      if (data.dashboard.store) {
        setStoreForm({
          name: data.dashboard.store.name,
          slug: data.dashboard.store.slug,
          description: data.dashboard.store.description,
          shippingSpeedDays: data.dashboard.store.shipping_speed_days,
          bio: data.dashboard.profile?.bio || ""
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function saveStore(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/seller/store", {
        method: "POST",
        body: JSON.stringify(storeForm)
      });
      setSuccess("Store updated.");
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/seller/products", {
        method: "POST",
        body: JSON.stringify(productForm)
      });
      setSuccess("Product created.");
      setProductForm(DEFAULT_PRODUCT);
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function importCsv(event) {
    event.preventDefault();
    try {
      const data = await apiRequest("/api/seller/products/import", {
        method: "POST",
        body: JSON.stringify({ csvText })
      });
      setSuccess(`Imported ${data.result.createdCount} products.`);
      setCsvText("");
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateOrder(orderId, status) {
    try {
      await apiRequest("/api/seller/orders", {
        method: "PATCH",
        body: JSON.stringify({ orderId, status })
      });
      setSuccess(`Order ${orderId} set to ${status}`);
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="stack">
      <div>
        <h1>Seller Dashboard</h1>
        <p>Onboard your store, manage listings, fulfill orders, monitor earnings and low inventory.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {!dashboard ? <div className="card">Loading seller dashboard...</div> : null}

      {dashboard ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="card"><h3>Total Orders</h3><strong>{dashboard.metrics.orders}</strong></div>
            <div className="card"><h3>Revenue</h3><strong>${dashboard.metrics.revenue.toFixed(2)}</strong></div>
            <div className="card"><h3>Fees</h3><strong>${dashboard.metrics.fees.toFixed(2)}</strong></div>
            <div className="card"><h3>Payout Balance</h3><strong>${dashboard.metrics.payoutBalance.toFixed(2)}</strong></div>
          </div>

          <div className="cols-2">
            <form className="card stack" onSubmit={saveStore}>
              <h2>Store Settings</h2>
              <div><label>Name</label><input value={storeForm.name} onChange={(event) => setStoreForm((c) => ({ ...c, name: event.target.value }))} required /></div>
              <div><label>Slug</label><input value={storeForm.slug} onChange={(event) => setStoreForm((c) => ({ ...c, slug: event.target.value }))} required /></div>
              <div><label>Description</label><textarea value={storeForm.description} onChange={(event) => setStoreForm((c) => ({ ...c, description: event.target.value }))} /></div>
              <div><label>Seller Bio</label><textarea value={storeForm.bio} onChange={(event) => setStoreForm((c) => ({ ...c, bio: event.target.value }))} /></div>
              <div><label>Shipping speed days</label><input type="number" min="1" max="30" value={storeForm.shippingSpeedDays} onChange={(event) => setStoreForm((c) => ({ ...c, shippingSpeedDays: Number(event.target.value) || 5 }))} /></div>
              <button type="submit">Save Store</button>
            </form>

            <form className="card stack" onSubmit={createProduct}>
              <h2>Create Product</h2>
              <div><label>Title</label><input value={productForm.title} onChange={(event) => setProductForm((c) => ({ ...c, title: event.target.value }))} required /></div>
              <div><label>Description</label><textarea value={productForm.description} onChange={(event) => setProductForm((c) => ({ ...c, description: event.target.value }))} required /></div>
              <div className="row">
                <div style={{ flex: 1 }}><label>SKU</label><input value={productForm.variants[0].sku} onChange={(event) => setProductForm((c) => ({ ...c, variants: [{ ...c.variants[0], sku: event.target.value }] }))} required /></div>
                <div style={{ width: "120px" }}><label>Price</label><input type="number" min="0" step="0.01" value={productForm.variants[0].price} onChange={(event) => setProductForm((c) => ({ ...c, variants: [{ ...c.variants[0], price: event.target.value }] }))} required /></div>
                <div style={{ width: "120px" }}><label>Inventory</label><input type="number" min="0" value={productForm.variants[0].inventory} onChange={(event) => setProductForm((c) => ({ ...c, variants: [{ ...c.variants[0], inventory: event.target.value }] }))} required /></div>
              </div>
              <div><label>Image URL</label><input value={productForm.images[0]} onChange={(event) => setProductForm((c) => ({ ...c, images: [event.target.value] }))} /></div>
              <button type="submit">Publish Product</button>
            </form>
          </div>

          <form className="card stack" onSubmit={importCsv}>
            <h2>Bulk CSV Import</h2>
            <p>Required headers: title,description,sku,price,inventory</p>
            <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="title,description,sku,price,inventory\nSample Product,Description,SKU-123,19.99,8" />
            <button type="submit">Import CSV</button>
          </form>

          <div className="card stack">
            <h2>Product Inventory</h2>
            {dashboard.products.length === 0 ? <p>No products yet.</p> : null}
            {dashboard.products.map((product) => (
              <div key={product.id} className="spread">
                <div>
                  <strong>{product.title}</strong>
                  <p>{product.status} · Inventory {product.inventory}</p>
                </div>
                <strong>${product.minPrice.toFixed(2)}</strong>
              </div>
            ))}
          </div>

          <div className="card stack">
            <h2>Order Fulfillment</h2>
            {dashboard.recentOrders.length === 0 ? <p>No recent orders.</p> : null}
            {dashboard.recentOrders.map((order) => (
              <div key={order.id} className="card">
                <div className="spread">
                  <strong>Order #{order.order_number || order.id}</strong>
                  <span>{order.status}</span>
                </div>
                <p>Buyer: {order.buyer_name || "Guest"} · ${order.total.toFixed(2)}</p>
                <div className="row">
                  {order.status === "PLACED" ? <button type="button" className="button ghost" onClick={() => updateOrder(order.id, "CONFIRMED")}>Confirm</button> : null}
                  {["PLACED", "CONFIRMED"].includes(order.status) ? <button type="button" className="button ghost" onClick={() => updateOrder(order.id, "SHIPPED")}>Mark Shipped</button> : null}
                  {order.status === "SHIPPED" ? <button type="button" className="button ghost" onClick={() => updateOrder(order.id, "DELIVERED")}>Mark Delivered</button> : null}
                  {order.status === "DELIVERED" ? <button type="button" className="button ghost" onClick={() => updateOrder(order.id, "COMPLETED")}>Complete</button> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="card stack">
            <h2>Low Inventory Alerts</h2>
            {dashboard.lowInventory.length === 0 ? <p>No low-stock variants.</p> : null}
            {dashboard.lowInventory.map((item) => (
              <div key={item.sku} className="spread">
                <span>{item.title} ({item.sku})</span>
                <strong>{item.inventory} left</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

