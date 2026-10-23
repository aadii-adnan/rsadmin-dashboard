import React from "react";
import { Button, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import BookingStatusBadge from "./BookingStatusBadge";
import { FiArrowUpRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IE");
}

function formatPrice(price) {
  if (!price) return "—";
  const current = price.discounted ?? price.total;
  const value = Number(current);
  return Number.isFinite(value) ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value) : "—";
}

export default function BookingList({ bookings, count, loading, error, onRetry, page, hasNext, hasPrevious, onPageChange, selectedIds = [], onSelectionChange }) {
  if (loading) {
    return <div className="booking-list-state" role="status" aria-live="polite"><Spinner animation="border" size="sm" /> Loading bookings…</div>;
  }

  if (error) {
    return <div className="booking-list-state is-error" role="alert"><strong>We couldn’t load bookings.</strong><span>{error}</span><Button size="sm" variant="outline-danger" onClick={onRetry}>Try again</Button></div>;
  }

  if (!bookings.length) {
    return <div className="booking-list-state" role="status" aria-live="polite"><strong>No matching bookings</strong><span>Try another search or clear your filters to widen the results.</span></div>;
  }

  const showPrice = Object.prototype.hasOwnProperty.call(bookings[0], "price");
  const showSource = Object.prototype.hasOwnProperty.call(bookings[0], "source");
  const showWebsite = Object.prototype.hasOwnProperty.call(bookings[0], "website");
  const selected = new Set(selectedIds);
  const everyVisibleSelected = bookings.every((booking) => selected.has(booking.id));

  const toggleBooking = (bookingId) => {
    const next = new Set(selected);
    if (next.has(bookingId)) next.delete(bookingId);
    else next.add(bookingId);
    onSelectionChange([...next]);
  };

  const toggleVisible = () => {
    const next = new Set(selected);
    if (everyVisibleSelected) bookings.forEach((booking) => next.delete(booking.id));
    else bookings.forEach((booking) => next.add(booking.id));
    onSelectionChange([...next]);
  };

  return (
    <>
      <div className="booking-table-wrap">
        <Table aria-label="Staff bookings" responsive hover className="modern-table booking-table mb-0">
          <thead>
            <tr>
              <th scope="col" className="booking-select-column"><input type="checkbox" aria-label="Select all visible bookings" checked={everyVisibleSelected} onChange={toggleVisible} /></th>
              <th scope="col">Booking</th><th scope="col">Customer</th><th scope="col">Departure</th><th scope="col">Return</th>
              <th scope="col">Service</th><th scope="col">Vehicle</th><th scope="col">Terminal</th><th scope="col">Status</th>
              {showPrice && <th scope="col">Price</th>}{showSource && <th scope="col">Source</th>}{showWebsite && <th scope="col">Website</th>}<th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="booking-select-column"><input type="checkbox" aria-label={`Select booking ${booking.booking_id || booking.id}`} checked={selected.has(booking.id)} onChange={() => toggleBooking(booking.id)} /></td>
                <td><Link className="booking-detail-link" to={`/bookings-admin/${booking.id}`}>{booking.booking_id || booking.id}<FiArrowUpRight aria-hidden="true" /></Link>{!booking.is_viewed && <span className="booking-new-badge">New</span>}</td>
                <td><strong>{booking.first_name} {booking.last_name}</strong><span className="booking-muted">{booking.contact_no || "—"}</span></td>
                <td>{formatDateTime(booking.departure_time)}</td><td>{formatDateTime(booking.return_time)}</td>
                <td><strong>{booking.service_name || "—"}</strong>{booking.add_on_names?.length > 0 && <span className="booking-muted">{booking.add_on_names.join(", ")}</span>}</td>
                <td><strong>{booking.car_registration_no || "—"}</strong><span className="booking-muted">{[booking.car_manufacturer, booking.car_model, booking.car_colour].filter(Boolean).join(" ")}</span></td>
                <td>{booking.departure_terminal || "—"}<span className="booking-muted">{booking.return_terminal || "—"}</span></td>
                <td><BookingStatusBadge status={booking.status_name} /></td>
                {showPrice && <td>{formatPrice(booking.price)}</td>}{showSource && <td>{booking.source || "—"}</td>}{showWebsite && <td>{booking.website || "—"}</td>}<td>{formatDateTime(booking.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="admin-pagination booking-pagination">
        <span className="admin-pagination-summary">{count} booking{count === 1 ? "" : "s"} found</span>
        <div className="admin-pagination-controls">
          <Button size="sm" className="btn-admin-outline" onClick={() => onPageChange(page - 1)} disabled={!hasPrevious}><FiChevronLeft aria-hidden="true" />Previous</Button>
          <span className="booking-page-label">Page {page}</span>
          <Button size="sm" className="btn-admin-outline" onClick={() => onPageChange(page + 1)} disabled={!hasNext}>Next<FiChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
    </>
  );
}
