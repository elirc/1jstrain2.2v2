"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/client-api";

export default function AdminPageView() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDashboard() {
    try {
      const data = await apiRequest("/api/admin/analytics");
      setDashboard(data.dashboard);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function updateSeller(sellerId, status) {
    try {
      await apiRequest("/api/admin/sellers", {
        method: "PATCH",
        body: JSON.stringify({ sellerId, status })
      });
      setSuccess(`Seller ${sellerId} ${status.toLowerCase()}.`);
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateDispute(disputeId, status) {
    try {
      await apiRequest("/api/admin/disputes", {
        method: "PATCH",
        body: JSON.stringify({ disputeId, status, note: "Reviewed by admin" })
      });
      setSuccess(`Dispute ${disputeId} updated.`);
      loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="stack">
      <div>
        <h1>Admin Panel</h1>
        <p>Monitor GMV, take rate, seller approvals, and dispute resolution queue.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {!dashboard ? <div className="card">Loading admin analytics...</div> : null}

      {dashboard ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="card"><h3>GMV</h3><strong>${dashboard.metrics.gmv.toFixed(2)}</strong></div>
            <div className="card"><h3>Platform Fees</h3><strong>${dashboard.metrics.platformFees.toFixed(2)}</strong></div>
            <div className="card"><h3>Take Rate</h3><strong>{dashboard.metrics.takeRate.toFixed(2)}%</strong></div>
          </div>

          <div className="cols-2">
            <div className="card stack">
              <h2>Seller Applications</h2>
              {dashboard.pendingSellers.length === 0 ? <p>No pending applications.</p> : null}
              {dashboard.pendingSellers.map((seller) => (
                <div key={seller.user_id} className="card">
                  <div className="spread">
                    <div>
                      <strong>{seller.name}</strong>
                      <p>{seller.email}</p>
                    </div>
                    <div className="row">
                      <button type="button" className="button ghost" onClick={() => updateSeller(seller.user_id, "APPROVED")}>
                        Approve
                      </button>
                      <button type="button" className="button ghost" onClick={() => updateSeller(seller.user_id, "REJECTED")}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card stack">
              <h2>Open Disputes</h2>
              {dashboard.disputes.length === 0 ? <p>No active disputes.</p> : null}
              {dashboard.disputes.map((dispute) => (
                <div key={dispute.id} className="card">
                  <div className="spread">
                    <strong>Dispute #{dispute.id}</strong>
                    <span>{dispute.status}</span>
                  </div>
                  <p>Order #{dispute.order_id}</p>
                  <p>{dispute.reason}</p>
                  <div className="row">
                    <button type="button" className="button ghost" onClick={() => updateDispute(dispute.id, "IN_REVIEW")}>Mark In Review</button>
                    <button type="button" className="button ghost" onClick={() => updateDispute(dispute.id, "RESOLVED")}>Resolve</button>
                    <button type="button" className="button ghost" onClick={() => updateDispute(dispute.id, "REJECTED")}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card stack">
            <h2>Top Sellers</h2>
            {dashboard.topSellers.map((seller, index) => (
              <div key={`${seller.seller_id}-${index}`} className="spread">
                <span>{index + 1}. {seller.store_name}</span>
                <strong>${seller.sales.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

