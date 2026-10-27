import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getContactMessage } from "./operationsAdminApi";
import "./operationsAdmin.css";

const fields = [["Name", (message) => `${message.first_name || ""} ${message.last_name || ""}`.trim() || "Not provided"], ["Email", (message) => message.email], ["Phone", (message) => message.phone || "Not provided"], ["Website", (message) => message.website || "Not provided"], ["Received", (message) => formatDate(message.timestamp)]];

export default function OperationsContactMessageDetail() {
  const { messageId } = useParams();
  const [message, setMessage] = useState(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setMessage(await getContactMessage(messageId)); } catch (requestError) { setError(requestError.status === 404 ? "This contact message was not found." : requestError.message); } finally { setLoading(false); } }, [messageId]);
  useEffect(() => { load(); }, [load]);
  return <section className="bookings-admin-page operations-management-page operations-message-detail"><Link className="btn btn-admin-outline" to="/communications-admin">← Back to Contact Messages</Link><span className="booking-eyebrow">Contact & marketing</span><h1 className="admin-page-title">Contact message</h1>{loading && <div className="booking-list-state" role="status">Loading message...</div>}{error && <div className="alert alert-danger" role="alert">{error}<button type="button" className="btn btn-admin-outline ms-3" onClick={load}>Try again</button></div>}{message && <div className="booking-table-card operations-message-card"><dl className="operations-summary-grid">{fields.map(([field, value]) => <React.Fragment key={field}><dt>{field}</dt><dd>{value(message) || "Not provided"}</dd></React.Fragment>)}</dl><div className="operations-message-body"><h2>Message</h2><p>{message.message || "No message content was provided."}</p></div></div>}</section>;
}
function formatDate(value) { if (!value) return "Not provided"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(date); }
