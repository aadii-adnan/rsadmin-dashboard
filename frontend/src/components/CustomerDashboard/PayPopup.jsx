import React, { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "../BookingForm/CheckoutForm";
import wifi from "../../assets/wifi.png";
import masterCardLogo from "../../assets/master-card.png";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../auth/AuthContext";
import { payBookingWithCredits } from "../../services/creditService";

// Use the same Stripe public key as your booking form
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const PayPopup = ({
  open,
  onClose,
  booking,
  extraAmount = null,
  onPaymentSuccess = null,
  newDepartureTime = null,
  newReturnTime = null,
  skipSuccessNavigate = false,
  onCreditPaymentSuccess = null,
}) => {

    const { setBookingData } = useBooking();
    const { user } = useAuth();
    const [creditProcessing, setCreditProcessing] = useState(false);
    const [creditError, setCreditError] = useState(null);
    
    useEffect(() => {
        if (open && booking) {
        // Set booking data for ThankYouPage
        setBookingData(prev => ({
            ...prev,
            bookingDetails: {
            booking_id: booking.id,
            booking_unique_id: booking.booking_id,
            service: booking.service_name || booking.service || "",
            // ...add any other fields your ThankYouPage expects
            },
            bookingDates: {
            parkingFromDate: booking.departure_time
                ? new Date(booking.departure_time).toLocaleDateString()
                : "",
            parkingFromTime: booking.departure_time
                ? new Date(booking.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                : "",
            carCollectionDate: booking.return_time
                ? new Date(booking.return_time).toLocaleDateString()
                : "",
            carCollectionTime: booking.return_time
                ? new Date(booking.return_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                : "",
            },
            carFlightDetails: {
            addOnsDetails: booking.add_ons || [],
            },
        }));
        }
        // Only run when popup opens with a booking
        // eslint-disable-next-line
    }, [open, booking]);

  if (!open || !booking) return null;

  // Reschedule extras stay card-only; normal pending bookings can be paid
  // entirely with account credits when the balance covers the amount due.
  // The backend recomputes and enforces the amount server-side.
  const amountDue = Number(
    booking.discounted_price > 0 ? booking.discounted_price : booking.total_price
  );
  const creditBalance = Number(user?.bonus_points || 0);
  const canPayWithCredits = !extraAmount && creditBalance >= amountDue && amountDue > 0;

  const handlePayWithCredits = async () => {
    if (creditProcessing) return;
    setCreditError(null);
    setCreditProcessing(true);
    try {
      const { ok, data } = await payBookingWithCredits(booking.id);
      if (!ok) {
        throw new Error(data?.error || "Could not pay with credits. Please try again.");
      }
      alert("Your booking has been paid with account credits and is now confirmed. You'll receive a confirmation email shortly.");
      if (onCreditPaymentSuccess) {
        await onCreditPaymentSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      setCreditError(err.message || "Could not pay with credits. Please try again.");
    } finally {
      setCreditProcessing(false);
    }
  };

  // Prepare formData as expected by CheckoutForm
  const formData = {
    booking_id: booking.id,
    total_price: extraAmount !== null ? extraAmount : booking.total_price,
    discounted_price: extraAmount !== null ? extraAmount : booking.discounted_price,
    isRescheduleExtra: !!extraAmount,
    // New dates for reschedule extensions — the backend recomputes the
    // charge from these, so they must match the pending reschedule.
    newDepartureTime,
    newReturnTime,
  };

  // Optionally, you can pass a goNext handler to close the popup and update status
  const goNext = () => {
    onClose();
    alert("Your Payment is still processing. We'll email you with the invoice once confirmed")
  };

  // You can style these as you do in Step3BookingForm
  const labelStyle = { fontWeight: 600, marginBottom: 6 };
  const nextButtonStyle = { fontWeight: 700, fontSize: 16, borderRadius: 8, padding: "10px 0" };

  return (
    <div
      className="modal"
      tabIndex={-1}
      style={{
        display: "block",
        background: "rgba(1,6,89,0.18)",
        zIndex: 1050,
        overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440, pointerEvents: "none" }}>
        <div
          className="modal-content"
          style={{ borderRadius: 16, pointerEvents: "auto" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h5 className="modal-title">
              Pay for Booking #{booking.booking_id || booking.id}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {/* Card design, similar to Step3BookingForm */}
            <div id="cardDesign" className="position-relative shadow p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="fs-4">
                  <strong>
                    {extraAmount ? ` € ${extraAmount} (Extra Days)` : `€ ${booking.discounted_price > 0 ? Number(booking.discounted_price).toFixed(2) : Number(booking.total_price).toFixed(2)}`}
                  </strong>
                </div>
                <img src={wifi} alt="Contactless payment" width="50" height="33" style={{ transform: "rotate(90deg)", filter: "invert(1)" }} />
              </div>
              <div className="mt-4 fs-3">**** **** **** ****</div>
              <div>
                <small className="text-secondary">Valid Thru <span>**</span> / <span>**</span></small>
              </div>
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-warning fs-5"><strong>XXXX X X</strong></div>
                <img src={masterCardLogo} alt="Card Logo" width="50" height="50" style={{ width: "50px", height: "50px" }} />
              </div>
            </div>
            {/* Pay with account credits when the balance covers the amount */}
            {canPayWithCredits && (
              <div
                className="p-3 shadow bg-white position-relative mb-3"
                style={{ borderRadius: 12, border: "1px solid #43a047" }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span style={{ fontWeight: 600, color: "#555" }}>Your credit balance</span>
                  <span style={{ fontWeight: 700, color: "#43a047" }}>
                    €{creditBalance.toFixed(2)}
                  </span>
                </div>
                {creditError && (
                  <div className="alert alert-danger mb-2" style={{ fontSize: 14 }}>
                    {creditError}
                  </div>
                )}
                <button
                  type="button"
                  className="btn w-100"
                  onClick={handlePayWithCredits}
                  disabled={creditProcessing}
                  style={{
                    background: "#43a047",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 16,
                    borderRadius: 8,
                    padding: "10px 0",
                  }}
                >
                  {creditProcessing
                    ? "Processing..."
                    : `Pay with Credits (€${amountDue.toFixed(2)})`}
                </button>
                <div className="text-center mt-2" style={{ color: "#888", fontSize: 13 }}>
                  — or pay by card below —
                </div>
              </div>
            )}
            {/* Stripe Elements Form */}
            <div className="p-3 shadow bg-white position-relative" style={{ borderRadius: 12 }}>
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  formData={formData}
                  goNext={goNext}
                  labelStyle={labelStyle}
                  nextButtonStyle={nextButtonStyle}
                  onPaymentSuccess={onPaymentSuccess}
                  skipSuccessNavigate={skipSuccessNavigate}
                />
              </Elements>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPopup;
