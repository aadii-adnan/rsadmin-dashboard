import React, { useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FiDownload, FiFileText, FiPackage, FiX } from "react-icons/fi";
import { downloadStaffBookingBulkAction } from "./bookingAdminApi";

const ACTIONS = [
  { key: "xlsx", label: "Export Excel", icon: FiDownload },
  { key: "pdf", label: "Export PDF", icon: FiFileText },
  { key: "invoice-zip", capability: "invoice_zip", label: "Invoice ZIP", icon: FiPackage },
  { key: "booking-form-zip", capability: "booking_form_zip", label: "Booking forms ZIP", icon: FiPackage },
];

export default function BookingBulkActions({ selectedIds, capabilities = {}, filters, onClear }) {
  const [runningAction, setRunningAction] = useState("");
  const [error, setError] = useState("");

  if (!selectedIds.length) return null;

  const handleAction = async (action) => {
    setRunningAction(action);
    setError("");
    try {
      await downloadStaffBookingBulkAction(action, selectedIds, filters);
    } catch (requestError) {
      setError(requestError.message || "Unable to create this download.");
    } finally {
      setRunningAction("");
    }
  };

  return (
    <section className="booking-bulk-actions" aria-label="Selected booking actions">
      <div className="booking-bulk-actions-main">
        <strong>{selectedIds.length} selected</strong>
        <span>Select an authorized export or download.</span>
      </div>
      <div className="booking-bulk-actions-controls">
        {ACTIONS.filter(({ key, capability }) => capabilities[capability || key]).map(({ key, label, icon }) => (
          <Button key={key} type="button" className="btn-admin-outline" size="sm" disabled={Boolean(runningAction)} onClick={() => handleAction(key)}>
            {runningAction === key ? <Spinner animation="border" size="sm" /> : React.createElement(icon, { "aria-hidden": true })}{runningAction === key ? "Preparing…" : label}
          </Button>
        ))}
        <Button type="button" variant="link" className="booking-bulk-clear" onClick={onClear} disabled={Boolean(runningAction)}><FiX aria-hidden="true" /> Clear</Button>
      </div>
      {error && <Alert variant="danger" className="booking-bulk-error" role="alert">{error}</Alert>}
    </section>
  );
}
