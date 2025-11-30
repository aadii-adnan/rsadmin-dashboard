import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useBooking } from "../context/BookingContext";
import { useNavigate } from "react-router-dom";
import parkingImg from "../assets/parking.webp";
import customFetch from "../auth/fetch";
import ReschedulePopup from "../components/CustomerDashboard/ReschedulePopup";
import PayPopup from "../components/CustomerDashboard/PayPopup";
import { useAuth } from "../auth/AuthContext";

const statusColors = {
    'Completed': '#28a745',
    'Confirmed': '#ffc107',
    'Cancelled': '#dc3545',
    'Payment Failed': '#dc3545',
    'Rescheduled': '#fd7e14',
    'Pending': 'gray',
    'Started': "#3552b1",
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

    const now = new Date();
    const departure = new Date(booking.departure_time);

    if (booking.service_name === "Standard Meet & Greet Parking") {
      const seventyTwoHoursBefore = new Date(departure.getTime() - 72 * 60 * 60 * 1000);
      if (now > seventyTwoHoursBefore) {
        alert("Standard Meet & Greet Parking bookings can only be cancelled at least 72 hours before departure.");
        return;
      }
    } else if (booking.service_name === "Flexible Meet & Greet Parking") {
      if (now > departure) {
        alert("You can only cancel Flexible Meet & Greet Parking bookings before the departure time.");
        return;
      }
    }
    setActionLoading(true);
    try {
      // Always call cancel API, pass refund type
      const res = await customFetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/${bookingId}/cancel/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { refund: type === "refund" }, // true for refund, false for points
        }
      );
      if (!res.ok) throw new Error("Failed to cancel booking.");

      if (type === "refund") {
        alert("Your booking was cancelled. €15 cancellation fee will be deducted and the remaining amount will be refunded to your original payment method.");
      } else if (type === "points") {
        // Find the booking to get its value
        const booking = bookings.find(b => b.id === bookingId);
        const orderValue = Number(booking.discounted_price > 0 ? booking.discounted_price : booking.total_price);
        const bonusToAdd = Math.max(0, orderValue - 15); // Deduct €15 fee
        // Call backend to add bonus points
        await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/add-bonus/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { amount: bonusToAdd },
          }
        );
        const updatedUser = { 
          ...user, 
          bonus_points: Number(user.bonus_points || 0) + Number(bonusToAdd)
        };
        setUser(updatedUser); 
        setBookingData((prev) => ({
            ...prev,
            userDetails: updatedUser,
          }));       
        alert(`Your booking was cancelled. €15 cancellation fee has been deducted. Credit points (€${bonusToAdd.toFixed(2)}) have been added to your account.`);
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
      if (!res.ok) throw new Error("Failed to reschedule booking.");
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                departure_time,
                return_time,
                status: { ...b.status, name: "Rescheduled" }, // <-- Add this line
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
    const perDay = Number(booking.service_per_day_price);

    // If user saves days, add bonus points
    if (
      (booking.status?.name === "Confirmed" || booking.status?.name === "Rescheduled") &&
      extraDays < 0
    ) {
      const savedAmount = perDay * Math.abs(extraDays);
      // Call backend to add bonus points
      try {
        await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/add-bonus/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { amount: savedAmount },
          }
        );
        // Update user bonus points in context
        const updatedUser = { 
          ...user, 
          bonus_points: Number(user.bonus_points || 0) + Number(savedAmount)
        };
        setUser(updatedUser); 
        setBookingData((prev) => ({
            ...prev,
            userDetails: updatedUser,
          }));       
      } catch (err) {
        alert("Failed to add credit points.");
      }
    }

    // Only require payment if status is Confirmed or Rescheduled and extra days > 0
    if (
      (booking.status?.name === "Confirmed" || booking.status?.name === "Rescheduled") &&
      extraDays > 0
    ) {
      // Calculate extra amount (use your own price logic)
      const extraAmount = perDay * extraDays;

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
        onPaymentSuccess:handleExtraPaymentSuccess
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
          backgroundImage: `linear-gradient(120deg,rgba(1,6,89,0.68),rgba(40,144,205,0.38)),url(${parkingImg})`,
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
            boxShadow: "0 8px 32px rgba(40,144,205,0.10)",
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
            <div className="d-flex flex-column flex-md-row align-items-md-center gap-2">
              {user && typeof user.bonus_points !== "undefined" && (
                <div
                  className="badge bg-success"
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    padding: "10px 18px",
                    borderRadius: "8px",
                    marginRight: "10px",
                    background: "#43a047",
                    color: "#fff",
                  }}
                >
                  Credit Points: €{Number(user.bonus_points).toFixed(2)}
                </div>
              )}
              <a
                href="/"
                className="btn"
                style={{
                  background: "linear-gradient(90deg, #2890cd 60%, #43a047 100%)",
                  border: "none",
                  fontWeight: 700,
                  borderRadius: "8px",
                  padding: "10px 28px",
                  fontSize: "1.1rem",
                  color: "#fff",
                  boxShadow: "0 2px 12px rgba(40,144,205,0.10)",
                  transition: "background 0.2s",
                }}
              >
                + New Booking
              </a>
            </div>
          </div>
          {loading ? (
          <div className="text-center py-5">
            <span className="spinner-border text-primary" />
            <p className="mt-3">Loading your bookings...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger text-center">{error}</div>
        ) : bookings.length === 0 ? (
          <div className="alert alert-info text-center">
            No bookings found. <a href="/">Book now</a>
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
                      <span style={{ fontWeight: 600, color: "#2890cd", fontSize: "0.9rem" }}>
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
                          boxShadow: "0 1px 6px rgba(40,144,205,0.10)",
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
                            <span style={{ fontWeight: 700, color: "#43a047" }}>
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
                            background: "linear-gradient(90deg, #2890cd 60%, #43a047 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "100px",
                            padding: "8px 0",
                            fontSize: "15px",
                            boxShadow: "0 2px 8px rgba(40,144,205,0.08)",
                            transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                            opacity:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending") ||
                              actionLoading
                                ? 0.5
                                : 1,
                            cursor:
                              !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending") ||
                              actionLoading
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={
                            !(b.status?.name === "Rescheduled" || b.status?.name === "Confirmed" || b.status?.name === "Pending") ||
                            actionLoading
                          }
                          onClick={() => handleReschedule(b.id)}
                        >
                          Reschedule
                        </button>
                        {b.status?.name !== "Pending" ? <button
                          className="minimal-action-btn"
                          style={{
                            background: "linear-gradient(90deg, #e53935 60%, #ff9800 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "90px",
                            padding: "8px 0",
                            fontSize: "15px",
                            boxShadow: "0 2px 8px rgba(229,57,53,0.08)",
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
                            boxShadow: "0 2px 8px rgba(40,144,205,0.08)",
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    <ReschedulePopup
        open={reschedulePopup.open}
        onClose={() => setReschedulePopup({ open: false, booking: null })}
        booking={reschedulePopup.booking}
        onSubmit={handleRescheduleSubmit}
        loading={rescheduleLoading}
      />

      <PayPopup
        open={payPopup.open}
        onClose={() => setPayPopup({ open: false, booking: null, extraAmount: null })}
        booking={payPopup.booking}
        extraAmount={payPopup.extraAmount}
        onPaymentSuccess={payPopup.onPaymentSuccess}
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
        box-shadow: 0 2px 12px rgba(40,144,205,0.04);
        border-radius: 12px;
        vertical-align: middle !important;
      }
      .minimal-table tr {
        border: none !important;
      }
      .status-pill {
        box-shadow: 0 2px 12px rgba(40,144,205,0.08);
        border: 2px solid #fff;
        transition: box-shadow 0.2s, border 0.2s;
      }
      .status-pill:hover {
        box-shadow: 0 4px 18px rgba(40,144,205,0.18);
        border: 2px solid #2890cd;
      }
      .minimal-action-btn {
        outline: none !important;
      }
      .minimal-action-btn:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 4px 18px rgba(40,144,205,0.18);
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

    {cancelModal.open && (
      <div
        className="modal fade show"
        tabIndex="-1"
        style={{
          display: "block",
          background: "rgba(0,0,0,0.45)",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1050,
          overflowY: "auto",
        }}
        aria-modal="true"
        role="dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) setCancelModal({ open: false, booking: null });
        }}
      >
        <div className="modal-dialog modal-dialog-centered" style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxWidth: 520 }}>
          <div className="modal-content shadow-lg border-0">
            <div className="modal-header text-white" style={{ backgroundColor: "#010659" }}>
              <h5 className="modal-title">Cancel Booking</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={() => setCancelModal({ open: false, booking: null })}
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-3">
                How would you like to receive your refund for this booking?
              </p>
              <div className="mb-3 p-3 rounded bg-light border">
                <strong>Refund to Original Payment Method</strong>
                <br />
                <span className="text-muted" style={{ fontSize: "0.97rem" }}>
                  The amount will be returned to your original payment method. Processing may take 5-10 business days depending on your bank.
                </span>
              </div>
              <div className="mb-3 p-3 rounded bg-light border">
                <strong>Credit Points</strong>
                <br />
                <span className="text-muted" style={{ fontSize: "0.97rem" }}>
                  Instantly receive the booking amount as credit points in your account. You can use these points for discounts on your next booking.
                </span>
              </div>
              <div className="alert alert-warning mt-3 mb-0 text-center" style={{ fontSize: "0.98rem" }}>
                <b>Note:</b> A €15 cancellation fee applies to all cancellations.
              </div>
            </div>
            <div className="modal-footer d-flex flex-column flex-sm-row justify-content-between gap-2">
              <button
                className="btn btn-danger w-100"
                onClick={async () => {
                  setCancelModal({ open: false, booking: null });
                  await handleCancel(cancelModal.booking.id, "refund");
                }}
              >
                Refund to Card/Bank
              </button>
              <button
                className="btn btn-success w-100"
                onClick={async () => {
                  setCancelModal({ open: false, booking: null });
                  await handleCancel(cancelModal.booking.id, "points");
                }}
              >
                Get Credit Points
              </button>
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setCancelModal({ open: false, booking: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default CustomerDashboard;