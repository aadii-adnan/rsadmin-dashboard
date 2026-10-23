import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import BookingDetail from "../components/BookingsAdmin/BookingDetail";
import BookingEditForm from "../components/BookingsAdmin/BookingEditForm";
import BookingActions from "../components/BookingsAdmin/BookingActions";
import BookingStatusBadge from "../components/BookingsAdmin/BookingStatusBadge";
import { FiEdit3 } from "react-icons/fi";
import { getStaffBooking } from "../components/BookingsAdmin/bookingAdminApi";
import "../components/BookingsAdmin/bookingsAdmin.css";

export default function BookingsAdminDetail() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadBooking = useCallback((signal) => {
    setLoading(true);
    setError(null);
    return getStaffBooking(bookingId, signal)
      .then(setBooking)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setBooking(null);
          setError({ message: requestError.message, status: requestError.status });
        }
      })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [bookingId]);

  useEffect(() => {
    const controller = new AbortController();
    loadBooking(controller.signal);
    return () => controller.abort();
  }, [loadBooking]);

  return (
    <section className="bookings-admin-page booking-detail-page">
      <Link className="booking-back-link" to="/bookings-admin">Back to bookings</Link>
      {loading && <div className="booking-list-state" role="status"><Spinner animation="border" size="sm" /> Loading booking...</div>}
      {!loading && error && <Alert variant="danger" className="booking-detail-error">
        <Alert.Heading>{error.status === 403 ? "You do not have access to this booking." : error.status === 404 ? "Booking not found or unavailable." : "We could not load this booking."}</Alert.Heading>
        <p>{error.message}</p>
        <Button size="sm" variant="outline-danger" onClick={() => loadBooking()}>Try again</Button>
      </Alert>}
      {!loading && booking && <>
        <div className="booking-detail-heading"><div><span className="booking-eyebrow">Booking record</span><h1 className="admin-page-title">Booking {booking.booking_id || booking.id}</h1><p className="bookings-admin-description">Customer, travel, and service information at a glance.</p></div><BookingStatusBadge status={booking.status_details?.name} /></div>
        {notification && <Alert variant={notification.status === "failed" ? "danger" : "success"} className="booking-notification-result">{notification.message}</Alert>}
        {!editing && <><BookingActions booking={booking} onStatusChanged={setBooking} /><Button className="finance-primary-btn booking-edit-trigger" onClick={() => setEditing(true)} disabled={!booking.editable_fields?.length}><FiEdit3 aria-hidden="true" />Edit booking</Button><BookingDetail booking={booking} /></>}
        {editing && <BookingEditForm booking={booking} onCancel={() => setEditing(false)} onSaved={(updatedBooking) => { setBooking(updatedBooking); setEditing(false); }} onNotification={setNotification} />}
      </>}
    </section>
  );
}
