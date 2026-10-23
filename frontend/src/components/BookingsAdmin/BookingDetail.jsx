import React from "react";
import { Badge } from "react-bootstrap";
import BookingStatusBadge from "./BookingStatusBadge";

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IE");
}

function formatPrice(value) {
  if (value === null || value === undefined) return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount)
    : "-";
}

function DetailSection({ title, children }) {
  return <section className="booking-detail-section"><h2>{title}</h2><dl>{children}</dl></section>;
}

function DetailRow({ label, children }) {
  return <div className="booking-detail-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

export default function BookingDetail({ booking }) {
  const experience = booking.customer_experience;
  const previousExperience = experience?.previous_reviewed;

  return (
    <div className="booking-detail-grid">
      <DetailSection title="Booking status">
        <DetailRow label="Booking ID"><strong>{displayValue(booking.booking_id)}</strong></DetailRow>
        <DetailRow label="Status"><BookingStatusBadge status={booking.status_details?.name} /></DetailRow>
        <DetailRow label="Note">{displayValue(booking.status_details?.note)}</DetailRow>
        <DetailRow label="Created">{formatDateTime(booking.created_at)}</DetailRow>
        <DetailRow label="Last modified">{formatDateTime(booking.modified_at)}</DetailRow>
      </DetailSection>

      <DetailSection title="Customer information">
        <DetailRow label="Name">{displayValue(`${booking.customer?.first_name || ""} ${booking.customer?.last_name || ""}`.trim())}</DetailRow>
        <DetailRow label="Email">{displayValue(booking.customer?.email)}</DetailRow>
        <DetailRow label="Phone">{displayValue(booking.customer?.contact_no)}</DetailRow>
        <DetailRow label="Passengers">{displayValue(booking.customer?.total_passengers)}</DetailRow>
      </DetailSection>

      <DetailSection title="Vehicle details">
        <DetailRow label="Registration">{displayValue(booking.vehicle?.registration)}</DetailRow>
        <DetailRow label="Make / model">{displayValue([booking.vehicle?.manufacturer, booking.vehicle?.model].filter(Boolean).join(" "))}</DetailRow>
        <DetailRow label="Colour">{displayValue(booking.vehicle?.colour)}</DetailRow>
      </DetailSection>

      <DetailSection title="Travel information">
        <DetailRow label="Departure">{formatDateTime(booking.travel?.departure_time)}</DetailRow>
        <DetailRow label="Departure terminal">{displayValue(booking.travel?.departure_terminal)}</DetailRow>
        <DetailRow label="Departure flight">{displayValue(booking.travel?.departure_flight_number)}</DetailRow>
        <DetailRow label="Return">{formatDateTime(booking.travel?.return_time)}</DetailRow>
        <DetailRow label="Return terminal">{displayValue(booking.travel?.return_terminal)}</DetailRow>
        <DetailRow label="Return flight">{displayValue(booking.travel?.return_flight_number)}</DetailRow>
      </DetailSection>

      <DetailSection title="Service and add-ons">
        <DetailRow label="Service">{displayValue(booking.service_details?.name)}</DetailRow>
        <DetailRow label="Add-ons">{booking.service_details?.add_ons?.length ? booking.service_details.add_ons.map((addOn) => addOn.name || addOn).join(", ") : "-"}</DetailRow>
      </DetailSection>

      <DetailSection title="Customer experience">
        <DetailRow label="Current review">{displayValue(experience?.experience_label)}</DetailRow>
        <DetailRow label="Current details">{displayValue(experience?.details)}</DetailRow>
        {previousExperience ? <>
          <DetailRow label="Previous review"><Badge bg={previousExperience.experience === "good" ? "success" : "danger"}>{previousExperience.experience_label}</Badge></DetailRow>
          <DetailRow label="Previous booking">{displayValue(previousExperience.booking_id)}</DetailRow>
          <DetailRow label="Previous trip ended">{formatDateTime(previousExperience.return_time)}</DetailRow>
          <DetailRow label="Previous details">{displayValue(previousExperience.details)}</DetailRow>
        </> : <DetailRow label="Previous review">No prior reviewed experience.</DetailRow>}
      </DetailSection>

      {booking.pricing && <DetailSection title="Pricing">
        <DetailRow label="Total">{formatPrice(booking.pricing.total)}</DetailRow>
        <DetailRow label="Discounted total">{formatPrice(booking.pricing.discounted)}</DetailRow>
        <DetailRow label="Coupon">{displayValue(booking.pricing.coupon_code)}</DetailRow>
        <DetailRow label="Bonus points used">{displayValue(booking.pricing.bonus_points_used)}</DetailRow>
        <DetailRow label="Previous price">{formatPrice(booking.pricing.previous_price)}</DetailRow>
        {Object.prototype.hasOwnProperty.call(booking.pricing, "supplier_extended_amount") && <DetailRow label="Supplier extension">{formatPrice(booking.pricing.supplier_extended_amount)}</DetailRow>}
      </DetailSection>}

      {booking.supplier && <DetailSection title="Supplier">
        <DetailRow label="Name">{displayValue(booking.supplier.name)}</DetailRow>
        <DetailRow label="Booking prefix">{displayValue(booking.supplier.booking_id_prefix)}</DetailRow>
      </DetailSection>}

      {booking.marketing_attribution && <DetailSection title="Marketing attribution">
        {Object.entries(booking.marketing_attribution).map(([key, value]) => value && (
          <DetailRow key={key} label={key.replaceAll("_", " ")}>{value}</DetailRow>
        ))}
      </DetailSection>}
    </div>
  );
}
