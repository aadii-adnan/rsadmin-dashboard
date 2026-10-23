import React, { useState } from "react";
import { Alert, Button, Form, Spinner, Modal } from "react-bootstrap";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import {
  downloadStaffBookingDocument,
  updateStaffBookingStatus,
} from "./bookingAdminApi";

export default function BookingActions({ booking, onStatusChanged }) {
  const [confirming, setConfirming] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const documents = booking.actions?.documents || {};
  const statusActions = booking.actions?.status_actions || [];

  const download = async (documentType) => {
    setBusy(documentType);
    setError("");
    setMessage("");
    try {
      await downloadStaffBookingDocument(booking.id, documentType);
      setMessage("Your document download has started.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async () => {
    if (!statusId) return;
    const selected = statusActions.find((status) => String(status.id) === String(statusId));
    if (!selected) return;

    setBusy("status");
    setError("");
    setMessage("");
    try {
      const updated = await updateStaffBookingStatus(booking.id, Number(statusId));
      onStatusChanged(updated);
      setStatusId("");
      setMessage(`Booking marked as ${selected.name}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
      setConfirming(false);
    }
  };

  return <section className="booking-actions-card" aria-label="Booking actions">
    <h2>Documents & actions</h2>
    {message && <Alert variant="success" className="py-2">{message}</Alert>}
    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
    <div className="booking-document-actions">
      {documents.invoice && <Button variant="outline-primary" onClick={() => download("invoice")} disabled={Boolean(busy)}>{busy === "invoice" ? <><Spinner animation="border" size="sm" /> Preparing invoice...</> : <><FiDownload aria-hidden="true" /> Invoice PDF</>}</Button>}
      {documents.booking_form && <Button variant="outline-primary" onClick={() => download("booking-form")} disabled={Boolean(busy)}>{busy === "booking-form" ? <><Spinner animation="border" size="sm" /> Preparing form...</> : <><FiDownload aria-hidden="true" /> Booking form PDF</>}</Button>}
    </div>
    {statusActions.length > 0 && <Form className="booking-status-action" onSubmit={(event) => { event.preventDefault(); if (statusId) setConfirming(true); }}>
      <Form.Label htmlFor="staff-status-action">Change status</Form.Label>
      <div>
        <Form.Select id="staff-status-action" value={statusId} onChange={(event) => setStatusId(event.target.value)} disabled={Boolean(busy)}>
          <option value="">Select an action</option>
          {statusActions.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
        </Form.Select>
        <Button type="submit" className="finance-primary-btn" disabled={!statusId || Boolean(busy)}>{busy === "status" ? "Updating..." : <><FiRefreshCw aria-hidden="true" /> Review change</>}</Button>
      </div>
    </Form>}
    <Modal show={confirming} onHide={() => { if (!busy) setConfirming(false); }} centered aria-labelledby="status-confirm-title" backdrop="static" keyboard={!busy}>
      <Modal.Header closeButton={!busy}><Modal.Title id="status-confirm-title">Confirm status change</Modal.Title></Modal.Header>
      <Modal.Body>Change booking <strong>{booking.booking_id || booking.id}</strong> from <strong>{booking.status_details?.name || "its current status"}</strong> to <strong>{statusActions.find((status) => String(status.id) === String(statusId))?.name}</strong>?<p className="text-secondary mt-3 mb-0">The booking will be updated when you confirm.</p></Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" disabled={Boolean(busy)} onClick={() => setConfirming(false)}>Keep current status</Button><Button disabled={Boolean(busy)} onClick={changeStatus}>{busy === "status" ? "Updating..." : "Confirm change"}</Button></Modal.Footer>
    </Modal>
  </section>;
}
