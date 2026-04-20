import React, { useEffect, useState } from "react";
import { useBooking } from "../context/BookingContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import customFetch from "../auth/fetch";

const ThankYouPage = () => {
  const { bookingData, setBookingData } = useBooking();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const booking_id = bookingData?.bookingDetails?.booking_id;
  const booking_unique_id = bookingData?.bookingDetails?.booking_unique_id;
  const bookingDates = bookingData?.bookingDates || {};
  const selectedService = bookingData?.bookingDetails?.service || "N/A";
  const selectedAddOns = bookingData?.carFlightDetails?.addOnsDetails || [];
  const { setUser } = useAuth();
  const { userDetails } = bookingData || {};

  useEffect(() => {
    const fetchLatestUser = async () => {
      try {
        const res = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me/`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setBookingData((prev) => ({
            ...prev,
            userDetails: userData,
          }));
        }
      } catch (err) {
        // Optionally handle error
      }
    };

    if (userDetails) {
      fetchLatestUser();
    }
    
  }, [setUser]);

  // Fetch the latest coupon
  const getLatestCoupon = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/services/coupons/latest/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setCoupon(data.code);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Download invoice
  const downloadInvoice = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payments/invoice/${booking_id}/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch invoice");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `RS-Express-Invoice-${booking_unique_id || "booking"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Silent fail or show toast
    }
  };

  useEffect(() => {
    getLatestCoupon();
  }, []);
  
  useEffect(() => {
    if (localStorage.getItem("payment_status") !== "succeeded") navigate("/");
  }, [bookingData, navigate]);

  return (
    <div className="container py-5" style={{ minHeight: "100vh" }}>
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div
            className="card shadow-lg border-0 p-4"
            style={{
              borderRadius: "18px",
              background: "#fff",
              marginTop: "30px",
            }}
          >
            <div className="text-center">
              <div
                className="d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "#e6f4ea",
                  boxShadow: "0 2px 8px rgba(40, 144, 205, 0.08)",
                }}
              >
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="#28a745" opacity="0.15"/>
                  <path d="M7 13l3 3 7-7" stroke="#28a745" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="fw-bold mb-2" style={{ color: "#010659" }}>
                Thank You!
              </h1>
              <p className="lead text-muted mb-4">
                Your booking has been <span className="fw-semibold text-success">successfully completed </span> for {selectedService}.
              </p>
            </div>
            <div className="row justify-content-center">
              <div className="col-12 col-md-10 col-lg-9">
                <div className="bg-light rounded-4 p-4 mb-4">
                  <h4 className="fw-bold mb-3" style={{ color: "#010659" }}>
                    Booking Summary
                  </h4>
                  <div className="row mb-2">
                    <div className="col-6 text-muted">Booking ID:</div>
                    <div className="col-6 fw-semibold">{booking_unique_id}</div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-6 text-muted">Departure:</div>
                    <div className="col-6">
                      {bookingDates?.parkingFromDate} {bookingDates?.parkingFromTime}
                    </div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-6 text-muted">Arrival:</div>
                    <div className="col-6">
                      {bookingDates?.carCollectionDate} {bookingDates?.carCollectionTime}
                    </div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-6 text-muted">Service:</div>
                    <div className="col-6">{selectedService}</div>
                  </div>
                  {selectedAddOns.length > 0 && (
                    <div className="row mb-2">
                      <div className="col-6 text-muted">Add-Ons:</div>
                      <div className="col-6">
                        {selectedAddOns.map((addon, idx) => (
                          <span key={addon.id}>
                            {addon.name}
                            {idx < selectedAddOns.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="alert alert-info text-center mb-4" style={{ fontSize: "1.05rem" }}>
                  <strong>Important:</strong> Please call our drivers <strong>30 minutes</strong> before your <u>departure</u> and <u>arrival</u>.<br />
                  <span className="d-block mt-2">
                    <strong>Driver:</strong> <a href="tel:+353834896505" className="text-decoration-none text-dark">+353 83 489 6505</a>
                  </span>
                  <span className="d-block mt-2">Customers should go to Car Park A, Level 2.</span>
                  <span className="d-block">Go to Terminal 1, Car Park A, Level 2 for pick-up and drop-off.</span>
                </div>
                <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3">
                    <button
                        className="btn btn-success px-4 py-2 fw-semibold"
                        onClick={downloadInvoice}
                        type="button"
                        style={{
                            backgroundColor: "rgb(1, 6, 89)",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            minWidth: "180px",
                        }}
                        >
                        Download Invoice
                    </button>                 
                </div>
                {coupon && (
                  <div className="alert alert-success text-center mt-4 mb-0" style={{ fontSize: "1.08rem" }}>
                    <strong>Special Offer:</strong> Use code <span className="fw-bold">{coupon}</span> for a <strong>10%</strong> discount on your next booking!
                  </div>
                )}
              </div>
            </div>
            <hr className="my-5" />
            <div className="text-center text-muted" style={{ fontSize: "1.05rem" }}>
              <p>
                A confirmation email with your booking details has been sent.<br />
                If you have any questions, contact us at <a href="mailto:support@rsexpressparking.com" className="text-decoration-underline text-dark">support@rsexpressparking.com</a>.
              </p>
              <p>
                Thank you for choosing <span className="fw-bold" style={{ color: "#010659" }}>RS Express Parking</span>.<br />
                We wish you a safe and pleasant journey!
              </p>
              <button
                className="btn mt-3 px-4 py-2 fw-semibold"
                style={{
                  borderRadius: "6px",
                  fontSize: "1rem",
                  color: "#fff",
                  backgroundColor: "rgb(1, 6, 89)",
                }}
                onClick={() => navigate("/")}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;