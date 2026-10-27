import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCreditTransaction } from "./operationsAdminApi";
import "./operationsAdmin.css";

const fields = [["Transaction ID", "id"], ["Customer", "user_name"], ["Customer ID", "user_id"], ["Transaction type", "transaction_type"], ["Signed amount", "amount"], ["Balance after", "balance_after"], ["Status", "status"], ["Website", "website"], ["Booking reference", "booking_reference"], ["Recorded", "created_at"]];

export default function OperationsCreditTransactionDetail() {
  const { transactionId } = useParams(); const [entry, setEntry] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setEntry(await getCreditTransaction(transactionId)); } catch (requestError) { setError(requestError.status === 404 ? "This credit transaction was not found." : requestError.message); } finally { setLoading(false); } }, [transactionId]);
  useEffect(() => { load(); }, [load]);
  return <section className="bookings-admin-page operations-management-page operations-message-detail"><Link className="btn btn-admin-outline" to="/users-admin">← Back to Credit Ledger</Link><span className="booking-eyebrow">People & credit ledger</span><h1 className="admin-page-title">Credit transaction</h1>{loading && <div className="booking-list-state" role="status">Loading transaction...</div>}{error && <div className="alert alert-danger" role="alert">{error}<button type="button" className="btn btn-admin-outline ms-3" onClick={load}>Try again</button></div>}{entry && <div className="booking-table-card operations-message-card"><dl className="operations-summary-grid">{fields.map(([label, key]) => <React.Fragment key={key}><dt>{label}</dt><dd>{displayValue(key, entry[key])}</dd></React.Fragment>)}</dl><div className="operations-message-body"><h2>Reason</h2><p>{entry.note || "No reason was recorded."}</p></div></div>}</section>;
}
function displayValue(key, value) { if (key === "created_at" && value) return new Date(value).toLocaleString(); return value ?? "Not available"; }
