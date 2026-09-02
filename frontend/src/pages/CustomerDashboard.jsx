import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useBooking } from "../context/BookingContext";
import { useNavigate } from "react-router-dom";
import parkingImg from "../assets/parking.webp";
import customFetch from "../auth/fetch";
import ReschedulePopup from "../components/CustomerDashboard/ReschedulePopup";
import PayPopup from "../components/CustomerDashboard/PayPopup";
import CancelBookingModal from "../components/CustomerDashboard/CancelBookingModal";
import AddCreditsModal from "../components/CustomerDashboard/AddCreditsModal";
import CreditHistory from "../components/CustomerDashboard/CreditHistory";
import { useAuth } from "../auth/AuthContext";
import {
  RESCHEDULE_DAY_RATE,
  getCancellationPolicy,
  isDepartureLocked,
  isReturnLocked,
} from "../utils/bookingRules";

const THEME_DARK_BLUE = "#010659";
const THEME_BLUE_TINT = "rgba(1,6,89,0.08)";
const THEME_BLUE_BORDER = "rgba(1,6,89,0.18)";
const THEME_SUCCESS = "#15803d";
const THEME_DANGER = "#b42318";

const dashboardControlStyle = {
  minHeight: 52,
  minWidth: 218,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  padding: "0 22px",
  fontSize: "1.05rem",
  fontWeight: 700,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const statusColors = {
    'Completed': THEME_DARK_BLUE,
    'Confirmed': THEME_DARK_BLUE,
    'Cancelled': THEME_DANGER,
    'Payment Failed': THEME_DANGER,
    'Rescheduled': THEME_DARK_BLUE,
    'Pending': '#6b7280',
    'Started': THEME_DARK_BLUE,
    'No Show': '#6f42c1',
    'Missed Pickup': THEME_DANGER,
};

const CustomerDashboard = () => {
  const { bookingData, setBookingData } = useBooking();
  const { userDetails } = bookingData || {};
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reschedulePopup, setReschedulePopup] = useState({ open: false, booking: null });
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState(null); // { booking, newDep, newArr, extraDays, extraAmount }
  const [payPopup, setPayPopup] = useState({ open: false, booking: null, extraAmount: null, onPaymentSuccess: null });
  const { user, setUser } = useAuth();
  const pendingRescheduleRef = useRef(pendingReschedule);
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  const [creditRefreshKey, setCreditRefreshKey] = useState(0);

  // Refresh the user profile (and both stores) after a successful top-up so
  // the balance badge and credit history update immediately.
  const handleTopUpSuccess = async () => {
    try {
      const res = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me/`);
      if (res && res.ok) {
        const profile = await res.json();
        const updatedUser = { ...user, ...profile };
        setUser(updatedUser);
        setBookingData((prev) => ({
          ...prev,
          userDetails: { ...(prev?.userDetails || {}), ...profile },
        }));
      }
    } catch (err) {
      console.error("Failed to refresh profile after top-up:", err);
    }
    setCreditRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    pendingRescheduleRef.current = pendingReschedule;
  }, [pendingReschedule]);

  useEffect(() => {
    if (!userDetails) {
      alert("Please log in to view your bookings.");
      navigate("/login");      
      return;
    }
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/bookings/user/${userDetails?.id}/`
        );
        if (!res.ok) throw new Error("Failed to fetch bookings.");
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      }
      setLoading(false);
    };
    fetchBookings();
  }, [userDetails, navigate]);

  const sortedBookings = [...bookings].sort((a, b) => {
    // Prefer created_at if available, otherwise use departure_time
    const dateA = new Date(a.created_at || a.departure_time);
    const dateB = new Date(b.created_at || b.departure_time);
    return dateB - dateA; // descending order
  });

  const handleCancel = async (bookingId, type) => {
    if (!type) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      alert("Booking not found.");
      return;
    }

    // Pre-check for instant feedback; the backend enforces the same policy.
    const policy = getCancellationPolicy(booking);
    if (!policy.allowed) {
      alert(policy.reason);
      return;
    }

    setActionLoading(true);
    try {
      // Always call cancel API, pass refund type. Within 72h of departure
      // the backend ignores the flag and cancels with no refund at all.
      const res = await customFetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/${bookingId}/cancel/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { refund: type === "refund" }, // true for refund, false for points
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to cancel booking.");

      if (data.outcome === "no_refund") {
        alert("Your booking was cancelled. As it was cancelled within 72 hours of departure, no refund applies.");
      } else if (data.outcome === "points") {
        // Bonus points are credited server-side; sync the new balance.
        const updatedUser = {
          ...user,
          bonus_points: Number(data.bonus_points ?? user.bonus_points ?? 0),
        };
        setUser(updatedUser);
        setBookingData((prev) => ({
            ...prev,
            userDetails: updatedUser,
          }));
        alert("Your booking was cancelled. The full booking amount has been added to your account as bonus points with no cancellation fee.");
      } else {
        alert("Your booking was cancelled. €15 cancellation fee will be deducted and the remaining amount will be refunded to your original payment method.");
      }
      // Update status in frontend immediately
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: { ...b.status, name: "Cancelled" } }
            : b
        )
      );
    } catch (err) {
      alert(err.message || "Failed to cancel booking.");
    }
    setActionLoading(false);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    // Split date and time
    const [date, time] = dateStr.split("T");
    // Optionally format date (e.g., YYYY-MM-DD to DD MMM YYYY)
    const [year, month, day] = date.split("-");
    // Format time as HH:mm (ignore seconds and timezone)
    const timePart = time ? time.slice(0, 5) : "";
    // Example output: 07 Jun 2024  15:30
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}  ${timePart}`;
  };

  const handleReschedule = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    setReschedulePopup({ open: true, booking });
  };

  const onRescheduleSubmit = async ({ departure_time, return_time, bookingId }) => {
    setRescheduleLoading(true);
    try {
      const res = await customFetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/${bookingId}/reschedule/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: { departure_time, return_time },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to reschedule booking.");
      }
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                departure_time,
                return_time,
                // Started bookings keep their status (in-progress, return-only change)
                status: { ...b.status, name: b.status?.name === "Started" ? "Started" : "Rescheduled" },
              }
            : b
        )
      );
      setReschedulePopup({ open: false, booking: null });
      alert("Booking rescheduled successfully. You'll receive a confirmation email shortly.");
    } catch (err) {
      alert(err.message || "Failed to reschedule booking.");
    }
    setRescheduleLoading(false);
  };

  const handleExtraPaymentSuccess = async () => {
    console.log("Handling extra payment success");
    const pr = pendingRescheduleRef.current;
    if (!pr) return;
    console.log("Handling extra payment success 2 ");
    await onRescheduleSubmit({
      departure_time: pr.newDep,
      return_time: pr.newArr,
      bookingId: pr.booking.id,
    });
    setPendingReschedule(null);
    setPayPopup({ open: false, booking: null, extraAmount: null, onPaymentSuccess: null });
  };
    
  const handleRescheduleSubmit = async (data) => {
    const booking = reschedulePopup.booking;
    const prevDep = new Date(booking.departure_time);
    const prevArr = new Date(booking.return_time);
    const newDep = new Date(data.departure_time);
    const newArr = new Date(data.return_time);

    // Calculate days (round up to next day if time is not midnight)
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

    // Reducing days does not change the price (no refunds or credit).
    // Extensions on paid bookings cost a flat €20/day, paid before the
    // reschedule is applied (the backend computes and verifies the amount).
    if (
      (booking.status?.name === "Confirmed" ||
        booking.status?.name === "Rescheduled" ||
        booking.status?.name === "Started") &&
      extraDays > 0
    ) {
      const extraAmount = RESCHEDULE_DAY_RATE * extraDays;

      setPendingReschedule({
        booking,
        newDep: data.departure_time,
        newArr: data.return_time,
        extraDays,
        extraAmount,
      });

      setPayPopup({
        open: true,
        booking: {
          ...booking,
          departure_time: data.departure_time,
          return_time: data.return_time,
        },
        extraAmount,
        newDepartureTime: data.departure_time,
        newReturnTime: data.return_time,
        onPaymentSuccess: handleExtraPaymentSuccess
      });
      return;
    }

    // If no extra payment needed, proceed to reschedule directly
    await onRescheduleSubmit({
      departure_time: data.departure_time,
      return_time: data.return_time,
      bookingId: booking.id,
    });
  };

  return (
    <>
      <Helmet>
        <title>My Bookings - RS Express Parking</title>
        <meta
          name="description"
          content="View, reschedule, or cancel your RS Express Parking bookings. Check payment status and manage your reservations easily."
        />
      </Helmet>
      {/* Banner */}
      <div
        className="d-flex flex-column justify-content-center align-items-center text-white text-center"
        style={{
          backgroundImage: `linear-gradient(120deg,rgba(1,6,89,0.72),rgba(1,6,89,0.36)),url(${parkingImg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          minHeight: "220px",
          width: "100%",
        }}
      >
        <h1 style={{ fontWeight: 700, textShadow: "0 2px 8px #01065955" }} className="display-5 display-md-4">
          My Bookings
        </h1>
        <h6 style={{ fontWeight: 400, textShadow: "0 2px 8px #01065955" }} className="lead d-none d-sm-block">
          View, reschedule, or cancel your bookings. Stay updated on your payment status.
        </h6>
      </div>
      {/* Dashboard Card */}
      <div className="container-fluid" style={{ backgroundColor: "#fff", minHeight: "100vh", padding: "40px 0" }}>
        <div
            className="col-12 col-lg-11 col-xl-10 mx-auto"
            style={{
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(1,6,89,0.10)",
            padding: "50px 25px",
            marginTop: "30px",
            marginBottom: "30px",
            }}
        >
          <div className="headings-div d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
            <div>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#010659",
                  marginBottom: 0,
                  letterSpacing: "1px",
                }}
              >
                Your Bookings
              </h2>
              <div style={{ color: "#6c757d", fontSize: "1rem" }}>
                Manage all your reservations in one place.
              </div>
            </div>
            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3">
              {user && typeof user.bonus_points !== "undefined" && (
                <div
                  className="dashboard-control"
                  style={{
                    ...dashboardControlStyle,
                    background: THEME_BLUE_TINT,
                    border: `1px solid ${THEME_BLUE_BORDER}`,
                    color: THEME_DARK_BLUE,
                    boxShadow: "0 2px 12px rgba(1,6,89,0.06)",
                  }}
                >
                  Credit Points: €{Number(user.bonus_points).toFixed(2)}
                </div>
              )}
              {user && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setAddCreditsOpen(true)}
                  style={{
                    ...dashboardControlStyle,
                    background: THEME_DARK_BLUE,
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 2px 12px rgba(1,6,89,0.10)",
                    transition: "background 0.2s",
                  }}
                >
                  + Top Up Credits
                </button>
              )}
              <a
                href="/"
                className="btn"
                style={{
                  ...dashboardControlStyle,
                  background: THEME_SUCCESS,
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 2px 12px rgba(21,128,61,0.14)",
                  transition: "background 0.2s",
                }}
              >
                + New Booking
              </a>
            </div>
          </div>
          {loading ? (
          <div className="text-center py-5">
            <span className="spinner-border" style={{ color: THEME_DARK_BLUE }} />
            <p className="mt-3">Loading your bookings...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger text-center">{error}</div>
        ) : bookings.length === 0 ? (
          <div
            className="text-center"
            style={{
              background: THEME_BLUE_TINT,
              border: `1px solid ${THEME_BLUE_BORDER}`,
              color: THEME_DARK_BLUE,
              borderRadius: 8,
              padding: "16px 18px",
              fontWeight: 500,
            }}
          >
            No bookings found. <a href="/" style={{ color: THEME_DARK_BLUE, fontWeight: 700 }}>Book now</a>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle minimal-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="text-nowrap">Booking #</th>
                  <th className="text-nowrap">Departure</th>
                  <th className="text-nowrap">Arrival</th>
                  <th className="text-nowrap">Car</th>
                  <th className="text-nowrap">Status</th>
                  <th className="text-nowrap">Total</th>
                  <th className="text-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map((b) => (
                  <tr key={b.id} style={{ verticalAlign: "middle" }}>
                    <td>
                      <span style={{ fontWeight: 600, color: THEME_DARK_BLUE, fontSize: "0.9rem" }}>
                        {b.booking_id || b.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "15px" }}>
                        {formatDateTime(b.departure_time)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "15px" }}>
                        {formatDateTime(b.return_time)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "15px" }}>
                        <strong>{b.car_registration_no}</strong>
                        <br />
                        <span style={{ color: "#888" }}>
                          {b.car_model} {b.car_colour}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: statusColors[b.status?.name] || "#ccc",
                          color: "#fff",
                          padding: "6px 18px",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "12px",
                          letterSpacing: "0.5px",
                          boxShadow: "0 1px 6px rgba(1,6,89,0.10)",
                          display: "inline-block",
                          minWidth: 130,
                          textAlign: "center",
                          textTransform: "uppercase",
                          border: "2px solid #fff",
                          transition: "box-shadow 0.2s, border 0.2s",
                        }}
                      >
                        {b.status?.name}
                      </span>
                    </td>
                    <td>
                        {b.discounted_price && (Number(b.discounted_price) < Number(b.total_price) && Number(b.discounted_price) > 0) ? (
                            <span style={{ display: "flex",  gap: "6px", flexDirection: "column" }}>
                            <span style={{ fontWeight: 500, color: "#888", textDecoration: "line-through", marginRight: 6 }}>
                                €{b.total_price}
                            </span>
                            <span style={{ fontWeight: 700, color: THEME_DARK_BLUE }}>
                                €{b.discounted_price}
                            </span>
                            </span>
                        ) : (
                            <span style={{ fontWeight: 700, color: "#010659" }}>
                            €{b.total_price || "0.00"}
                            </span>
                        )}
                    </td>

                    <td>
                      <div className="d-flex gap-2 flex-wrap justify-content-center">
                        <button
                          className="minimal-action-btn"
                          style={{
                            background: THEME_DARK_BLUE,
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "100px",
                            padding: "8px 0",
                            fontSize: "15px",
                            boxShadow: "0 2px 8px rgba(1,6,89,0.08)",
                            transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                            opacity:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending" || b.status?.name === "Started") ||
                              actionLoading
                                ? 0.5
                                : 1,
                            cursor:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending" || b.status?.name === "Started") ||
                              actionLoading
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={
                            !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending" || b.status?.name === "Started") ||
                            actionLoading
                          }
                          onClick={() => handleReschedule(b.id)}
                        >
                          Reschedule
                        </button>
                        {b.status?.name !== "Pending" ? <button
                          className="minimal-action-btn"
                          style={{
                            background: THEME_DANGER,
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "90px",
                            padding: "8px 0",
                            fontSize: "15px",
                            boxShadow: "0 2px 8px rgba(180,35,24,0.10)",
                            transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                            opacity:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed") ||
                              actionLoading
                                ? 0.5
                                : 1,
                            cursor:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed") ||
                              actionLoading
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={
                            !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed") ||
                            actionLoading
                          }
                          onClick={() => setCancelModal({ open: true, booking: b })}
                        >
                          Cancel
                        </button> : 

                        <button
                          className="minimal-action-btn"
                          style={{
                            background: "#010659",
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "90px",
                            padding: "8px 0",
                            fontSize: "15px",
                            boxShadow: "0 2px 8px rgba(1,6,89,0.08)",
                            transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                            opacity: 1,
                            cursor: "pointer",
                          }}
                          disabled={ actionLoading }
                          onClick={() => setPayPopup({ open: true, booking: b })}
                        >
                          Pay
                        </button>
                        }
                        {(b.status?.name === "Confirmed" ||
                          b.status?.name === "Rescheduled" ||
                          b.status?.name === "Started" ||
                          b.status?.name === "Completed") && (
                          <button
                            className="minimal-action-btn"
                            style={{
                              background: "#fff",
                              color: THEME_DARK_BLUE,
                              border: `1px solid ${THEME_DARK_BLUE}`,
                              borderRadius: "999px",
                              fontWeight: 700,
                              minWidth: "90px",
                              padding: "8px 0",
                              fontSize: "15px",
                              boxShadow: "0 2px 8px rgba(1,6,89,0.08)",
                              transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              window.open(
                                `${import.meta.env.VITE_API_BASE_URL}/payments/invoice/${b.id}/`,
                                "_blank",
                                "noopener"
                              )
                            }
                          >
                            Invoice
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {user && <CreditHistory refreshKey={creditRefreshKey} />}
      </div>
    </div>

    <ReschedulePopup
        open={reschedulePopup.open}
        onClose={() => setReschedulePopup({ open: false, booking: null })}
        booking={reschedulePopup.booking}
        onSubmit={handleRescheduleSubmit}
        loading={rescheduleLoading}
        lockDeparture={reschedulePopup.booking ? isDepartureLocked(reschedulePopup.booking) : false}
        lockReturn={reschedulePopup.booking ? isReturnLocked(reschedulePopup.booking) : false}
        dayRate={RESCHEDULE_DAY_RATE}
      />

      <PayPopup
        open={payPopup.open}
        onClose={() => setPayPopup({ open: false, booking: null, extraAmount: null })}
        booking={payPopup.booking}
        extraAmount={payPopup.extraAmount}
        onPaymentSuccess={payPopup.onPaymentSuccess}
        newDepartureTime={payPopup.newDepartureTime || null}
        newReturnTime={payPopup.newReturnTime || null}
        onCreditPaymentSuccess={async () => {
          await handleTopUpSuccess();
          // Reflect the paid booking in the table immediately
          if (payPopup.booking) {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === payPopup.booking.id
                  ? { ...b, status: { ...b.status, name: "Confirmed" } }
                  : b
              )
            );
          }
          setPayPopup({ open: false, booking: null, extraAmount: null });
        }}
      />

      <AddCreditsModal
        open={addCreditsOpen}
        onClose={() => setAddCreditsOpen(false)}
        onTopUpSuccess={handleTopUpSuccess}
      />
    <style>
      {`
      .minimal-table {
        border-collapse: separate !important;
        border-spacing: 0 0.6rem !important;
        background: transparent !important;
      }
      .minimal-table thead tr {
        border: none !important;
        background: #f8fafc !important;
      }
      .minimal-table th {
        border: none !important;
        font-weight: 700;
        color: #010659;
        background: #f8fafc !important;
        font-size: 1rem;
        letter-spacing: 0.5px;
        padding-top: 18px;
        padding-bottom: 18px;
      }
      .minimal-table td {
        border: none !important;
        background: #fff !important;
        box-shadow: 0 2px 12px rgba(1,6,89,0.04);
        border-radius: 12px;
        vertical-align: middle !important;
      }
      .minimal-table tr {
        border: none !important;
      }
      .status-pill {
        box-shadow: 0 2px 12px rgba(1,6,89,0.08);
        border: 2px solid #fff;
        transition: box-shadow 0.2s, border 0.2s;
      }
      .status-pill:hover {
        box-shadow: 0 4px 18px rgba(1,6,89,0.18);
        border: 2px solid #010659;
      }
      .minimal-action-btn {
        outline: none !important;
      }
      .minimal-action-btn:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 4px 18px rgba(1,6,89,0.18);
        filter: brightness(1.08);
      }
      .minimal-action-btn:active:not(:disabled) {
        transform: scale(0.98);
      }
      @media (max-width: 991.98px) {
        .table-responsive table {
          min-width: 700px !important;
        }
      }
      @media (max-width: 767.98px) {
        .table-responsive table {
          min-width: 600px !important;
        }
        .form-banner h1 {
          font-size: 2rem !important;
        }
      }
      @media (max-width: 575.98px) {
        .table-responsive table {
          min-width: 500px !important;
        }
        .form-banner {
          min-height: 120px !important;
          padding: 20px 0 !important;
        }
        .headings-div {
          align-items: center;
          text-align: center;
        }
      }
      `}
    </style>

    <CancelBookingModal
      open={cancelModal.open}
      booking={cancelModal.booking}
      onClose={() => setCancelModal({ open: false, booking: null })}
      allowPoints={true}
      refundEligible={cancelModal.booking ? getCancellationPolicy(cancelModal.booking).refundEligible : true}
      loading={actionLoading}
      onConfirm={async (type) => {
        const bookingId = cancelModal.booking.id;
        setCancelModal({ open: false, booking: null });
        // "no_refund" still posts refund=true; the backend ignores the flag
        // inside the no-refund window and returns nothing either way.
        await handleCancel(bookingId, type === "points" ? "points" : "refund");
      }}
    />
  </>
);
};

export default CustomerDashboard;
