import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/security";

export function getAdminDashboard() {
  const db = getDb();
  const gmvRow = db.prepare("SELECT COALESCE(SUM(total_cents), 0) AS gmv_cents FROM orders WHERE payment_status = 'PAID'").get();
  const feeRow = db.prepare("SELECT COALESCE(SUM(fee_cents), 0) AS fee_cents FROM transactions WHERE type = 'ORDER_CHARGE'").get();
  const topSellers = db
    .prepare(
      `SELECT s.name AS store_name, s.seller_id, COALESCE(SUM(o.total_cents), 0) AS sales_cents
       FROM stores s
       LEFT JOIN orders o ON o.seller_id = s.seller_id
       GROUP BY s.id
       ORDER BY sales_cents DESC
       LIMIT 10`
    )
    .all()
    .map((row) => ({ ...row, sales: row.sales_cents / 100 }));

  const pendingSellers = db
    .prepare(
      `SELECT sp.user_id, u.name, u.email, sp.created_at
       FROM seller_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.application_status = 'PENDING'
       ORDER BY sp.created_at ASC`
    )
    .all();

  const disputes = db
    .prepare(
      `SELECT d.id, d.order_id, d.reason, d.status, d.created_at,
              ru.name AS raised_by_name, au.name AS against_name
       FROM disputes d
       JOIN users ru ON ru.id = d.raised_by
       LEFT JOIN users au ON au.id = d.against_user
       WHERE d.status IN ('OPEN', 'IN_REVIEW')
       ORDER BY d.created_at DESC`
    )
    .all();

  const gmv = gmvRow.gmv_cents / 100;
  const platformFees = feeRow.fee_cents / 100;

  return {
    metrics: {
      gmv,
      platformFees,
      takeRate: gmv > 0 ? Number(((platformFees / gmv) * 100).toFixed(2)) : 0
    },
    topSellers,
    pendingSellers,
    disputes
  };
}

export function updateSellerApplication({ adminId, sellerId, status, rejectedReason = "" }) {
  const db = getDb();
  const allowed = ["APPROVED", "REJECTED"];

  if (!allowed.includes(status)) {
    throw new Error("Invalid seller application status");
  }

  const updatedAt = nowIso();

  db.prepare(
    `UPDATE seller_profiles
     SET application_status = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_at END,
         rejected_reason = CASE WHEN ? = 'REJECTED' THEN ? ELSE '' END
     WHERE user_id = ?`
  ).run(status, status, updatedAt, status, rejectedReason, Number(sellerId));

  db.prepare(
    "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'SELLER_APPLICATION', ?, 0, ?, ?)"
  ).run(
    Number(sellerId),
    `Your seller application is ${status.toLowerCase()}`,
    JSON.stringify({ reviewedBy: adminId }),
    updatedAt
  );

  return db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(Number(sellerId));
}

export function resolveDispute({ adminId, disputeId, status, note }) {
  const db = getDb();
  const allowed = ["RESOLVED", "REJECTED", "IN_REVIEW"];

  if (!allowed.includes(status)) {
    throw new Error("Invalid dispute status");
  }

  db.prepare(
    "UPDATE disputes SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?"
  ).run(status, note || "", nowIso(), Number(disputeId));

  const dispute = db.prepare("SELECT * FROM disputes WHERE id = ?").get(Number(disputeId));

  db.prepare(
    "INSERT INTO notifications(user_id, type, message, read, meta_json, created_at) VALUES(?, 'DISPUTE_UPDATE', ?, 0, ?, ?)"
  ).run(
    dispute.raised_by,
    `Dispute #${dispute.id} is now ${status}`,
    JSON.stringify({ disputeId: dispute.id, reviewedBy: adminId }),
    nowIso()
  );

  return dispute;
}

