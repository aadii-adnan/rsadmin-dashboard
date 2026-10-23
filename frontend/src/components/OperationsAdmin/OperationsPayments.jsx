import React, { useCallback, useEffect, useState } from "react";
import { getStaffPayments } from "./operationsAdminApi";
import "./operationsAdmin.css";

export default function OperationsPayments() {
  const [items, setItems] = useState([]); const [search, setSearch] = useState(""); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setItems(await getStaffPayments(search ? { search } : {})); } catch (requestError) { setError(requestError.message); } }, [search]);
  useEffect(() => { load(); }, [load]);
  return <section className="bookings-admin-page operations-management-page"><span className="booking-eyebrow">Operations workspace</span><h1 className="admin-page-title">Payment review</h1><p className="bookings-admin-description">Read-only Stripe payment records. Refunds, webhooks, and payment-state changes remain in protected existing workflows.</p>{error && <div className="alert alert-danger">{error}</div>}<form className="booking-filter-card" onSubmit={(event) => { event.preventDefault(); load(); }}><label className="form-label">Search booking, customer email, or payment reference<input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="btn finance-primary-btn">Search</button></form><div className="booking-table-card"><div className="booking-table-wrap table-responsive"><table className="table booking-table"><thead><tr><th>Booking</th><th>Customer</th><th>Amount</th><th>Status</th><th>Recorded</th></tr></thead><tbody>{items.map((payment) => <tr key={payment.id}><td>{payment.booking_id}</td><td>{payment.customer}</td><td>€{payment.amount}</td><td>{payment.status_name || "Unknown"}</td><td>{new Date(payment.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></div></section>;
}
