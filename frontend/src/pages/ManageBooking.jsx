import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import parkingImg from "../assets/parking.webp";
import ReschedulePopup from "../components/CustomerDashboard/ReschedulePopup";
import PayPopup from "../components/CustomerDashboard/PayPopup";
import CancelBookingModal from "../components/CustomerDashboard/CancelBookingModal";

const statusColors = {
  'Completed': '#28a745',
  'Confirmed': '#ffc107',
  'Cancelled': '#dc3545',
  'Payment Failed': '#dc3545',
  'Rescheduled': '#fd7e14',
  'Pending': 'gray',
  'Started': "#3552b1",
  'No Show': '#6f42c1',
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Guest manage-booking page, opened from the emailed secure link
// (/manage-booking/booking?token=...). Uses plain fetch — these endpoints
// are token-authorized, and customFetch's JWT/401 handling would interfere.
const ManageBooking = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // 'expired' | 'invalid' | null
  const [data, setData] = useState(null); // { booking, can_reschedule, ... }
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState(null); // { newDep, newArr, extraAmount }
  const [payOpen, setPayOpen] = useState(false);
  const pendingRescheduleRef = useRef(pendingReschedule);

  useEffect(() => {
    pendingRescheduleRef.current = pendingReschedule;
  }, [pendingReschedule]);

  const applyResponse = (payload) => {
    const { booking, ...flags } = payload;
    setData({ booking, ...flags });
  };

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setErrorType(null);
    try {
      const res = await fetch(
        `${API_BASE}/bookings/manage/booking/?token=${encodeURIComponent(token)}`
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorType(payload.error === "expired" ? "expired" : "invalid");
      } else {
        applyResponse(payload);
      }
    } catch {
      setErrorType("invalid");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setErrorType("invalid");
      setLoading(false);
      return;
    }
    fetchBooking();
  }, [token, fetchBooking]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const [date, time] = dateStr.split("T");
    const [year, month, day] = date.split("-");
    const timePart = time ? time.slice(0, 5) : "";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}  ${timePart}`;
  };

  const submitReschedule = async ({ departure_time, return_time }) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/manage/reschedule/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, departure_time, return_time }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || payload.error || "Failed to reschedule booking.");
      }
      applyResponse(payload);
      setRescheduleOpen(false);
      alert("Booking rescheduled successfully. You'll receive a confirmation email shortly.");
    } catch (err) {
      alert(err.message || "Failed to reschedule booking.");
    }
    setActionLoading(false);
  };

  const handleExtraPaymentSuccess = async () => {
    const pr = pendingRescheduleRef.current;
    if (!pr) return;
    await submitReschedule({
      departure_time: pr.newDep,
      return_time: pr.newArr,
    });
    setPendingReschedule(null);
    setPayOpen(false);
  };

  const handleRescheduleSubmit = async (formValues) => {
    const booking = data.booking;
    const prevDep = new Date(booking.departure_time);
    const prevArr = new Date(booking.return_time);
    const newDep = new Date(formValues.departure_time);
    const newArr = new Date(formValues.return_time);

    const prevDays =
      Math.floor(
        (prevArr.setHours(0, 0, 0, 0) - prevDep.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    const newDays =
      Math.floor(
        (newArr.setHours(0, 0, 0, 0) - newDep.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    const extraDays = newDays - prevDays;

    const statusName = booking.status?.name;
    const isPaid =
      statusName === "Confirmed" || statusName === "Rescheduled" || statusName === "Started";

    // Extensions on paid bookings are charged at the flat per-day rate
    // before the reschedule is applied. Reductions don't change the price.
    if (isPaid && extraDays > 0) {
      const extraAmount = (data.extension_day_rate || 20) * extraDays;
      setPendingReschedule({
        newDep: formValues.departure_time,
        newArr: formValues.return_time,
        extraAmount,
      });
      setRescheduleOpen(false);
      setPayOpen(true);
      return;
    }

    await submitReschedule({
      departure_time: formValues.departure_time,
      return_time: formValues.return_time,
    });
  };

  const handleCancelConfirm = async () => {
    setCancelOpen(false);
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/manage/cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Failed to cancel booking.");
      }
      applyResponse(payload);
      if (payload.outcome === "no_refund") {
        alert("Your booking was cancelled. As it was cancelled within 72 hours of departure, no refund applies.");
      } else {
        alert("Your booking was cancelled. €15 cancellation fee will be deducted and the remaining amount will be refunded to your original payment method.");
      }
    } catch (err) {
      alert(err.message || "Failed to cancel booking.");
    }
    setActionLoading(false);
  };

  const booking = data?.booking;

  return (
    <>
      <Helmet>
        <title>Manage Booking - RS Express Parking</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Banner */}
      <div
        className="d-flex flex-column justify-content-center align-items-center text-white text-center"
        style={{
          backgroundImage: `linear-gradient(120deg,rgba(1,6,89,0.68),rgba(40,144,205,0.38)),url(${parkingImg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          minHeight: "220px",
          width: "100%",
        }}
      >
        <h1 style={{ fontWeight: 700, textShadow: "0 2px 8px #01065955" }} className="display-5 display-md-4">
          Manage Booking
        </h1>
        <h6 style={{ fontWeight: 400, textShadow: "0 2px 8px #01065955" }} className="lead d-none d-sm-block">
          Reschedule or cancel your booking — no account needed.
        </h6>
      </div>

      <div className="container" style={{ padding: "40px 0", minHeight: "60vh" }}>
        <div
          className="col-12 col-md-10 col-lg-8 mx-auto"
          style={{
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(40,144,205,0.10)",
            padding: "40px 28px",
          }}
        >
          {loading ? (
            <div className="text-center py-5">
              <span className="spinner-border text-primary" />
              <p className="mt-3">Loading your booking...</p>
            </div>
          ) : errorType ? (
            <div className="text-center py-4">
              <h4 style={{ color: "#010659", fontWeight: 700 }}>
                {errorType === "expired" ? "This link has expired" : "This link is not valid"}
              </h4>
              <p className="text-muted mt-2">
                {errorType === "expired"
                  ? "For your security, manage-booking links are only valid for 24 hours."
                  : "The link may be incomplete or incorrect. Please request a new one."}
              </p>
              <Link
                to="/manage-booking"
                className="btn mt-2"
                style={{
                  background: "#2890cd",
                  color: "#fff",
                  fontWeight: 700,
                  borderRadius: "8px",
                  padding: "10px 28px",
                }}
              >
                Request a New Link
              </Link>
            </div>
          ) : booking ? (
            <>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
                <div>
                  <h3 style={{ color: "#010659", fontWeight: 700, marginBottom: 4 }}>
                    Booking #{booking.booking_id}
                  </h3>
                  <div style={{ color: "#6c757d" }}>
                    Hi {booking.first_name}, here are your booking details.
                  </div>
                </div>
                <span
                  className="status-pill"
                  style={{
                    background: statusColors[booking.status?.name] || "#ccc",
                    color: "#fff",
                    padding: "6px 18px",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                    display: "inline-block",
                    minWidth: 130,
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  {booking.status?.name}
                </span>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Service</div>
                    <div style={{ fontWeight: 600, color: "#010659" }}>{booking.service_name}</div>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Vehicle</div>
                    <div style={{ fontWeight: 600, color: "#010659" }}>
                      {booking.car_registration_no}
                      <span style={{ color: "#888", fontWeight: 400 }}>
                        {" "}— {booking.car_model} {booking.car_colour}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Drop-Off (Departure)</div>
                    <div style={{ fontWeight: 600, color: "#010659" }}>
                      {formatDateTime(booking.departure_time)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Pick-Up (Arrival)</div>
                    <div style={{ fontWeight: 600, color: "#010659" }}>
                      {formatDateTime(booking.return_time)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Total</div>
                    <div style={{ fontWeight: 700, color: "#010659" }}>
                      €{booking.discounted_price && Number(booking.discounted_price) > 0
                        ? booking.discounted_price
                        : booking.total_price}
                    </div>
                  </div>
                </div>
                {booking.add_ons?.length > 0 && (
                  <div className="col-12 col-md-6">
                    <div className="p-3 rounded bg-light border h-100">
                      <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Add-ons</div>
                      <div style={{ fontWeight: 600, color: "#010659" }}>
                        {booking.add_ons.map((a) => a.name).join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!data.can_cancel && data.cancel_block_reason && (
                <div className="alert alert-secondary py-2" style={{ fontSize: "0.95rem" }}>
                  {data.cancel_block_reason}
                </div>
              )}
              {data.can_cancel && !data.cancel_refund_eligible && (
                <div className="alert alert-warning py-2" style={{ fontSize: "0.95rem" }}>
                  This booking is within 72 hours of departure — it can still be
                  cancelled, but <b>no refund will be given</b>.
                </div>
              )}

              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center mt-4">
                <button
                  className="btn"
                  style={{
                    background: "linear-gradient(90deg, #2890cd 60%, #43a047 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: "999px",
                    padding: "10px 36px",
                    border: "none",
                    opacity: !data.can_reschedule || actionLoading ? 0.5 : 1,
                    cursor: !data.can_reschedule || actionLoading ? "not-allowed" : "pointer",
                  }}
                  disabled={!data.can_reschedule || actionLoading}
                  onClick={() => setRescheduleOpen(true)}
                >
                  Reschedule
                </button>
                <button
                  className="btn"
                  style={{
                    background: "linear-gradient(90deg, #e53935 60%, #ff9800 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: "999px",
                    padding: "10px 36px",
                    border: "none",
                    opacity: !data.can_cancel || actionLoading ? 0.5 : 1,
                    cursor: !data.can_cancel || actionLoading ? "not-allowed" : "pointer",
                  }}
                  disabled={!data.can_cancel || actionLoading}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel Booking
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {booking && (
        <>
          <ReschedulePopup
            open={rescheduleOpen}
            onClose={() => setRescheduleOpen(false)}
            booking={booking}
            onSubmit={handleRescheduleSubmit}
            loading={actionLoading}
            lockDeparture={!!data.departure_locked}
            lockReturn={!!data.return_locked}
            dayRate={data.extension_day_rate || 20}
          />

          <PayPopup
            open={payOpen}
            onClose={() => {
              setPayOpen(false);
              setPendingReschedule(null);
            }}
            booking={
              pendingReschedule
                ? {
                    ...booking,
                    departure_time: pendingReschedule.newDep,
                    return_time: pendingReschedule.newArr,
                  }
                : booking
            }
            extraAmount={pendingReschedule?.extraAmount || null}
            onPaymentSuccess={handleExtraPaymentSuccess}
            newDepartureTime={pendingReschedule?.newDep || null}
            newReturnTime={pendingReschedule?.newArr || null}
            skipSuccessNavigate={true}
          />

          <CancelBookingModal
            open={cancelOpen}
            booking={booking}
            onClose={() => setCancelOpen(false)}
            onConfirm={handleCancelConfirm}
            allowPoints={false}
            refundEligible={!!data.cancel_refund_eligible}
            loading={actionLoading}
          />
        </>
      )}
    </>
  );
};

export default ManageBooking;
