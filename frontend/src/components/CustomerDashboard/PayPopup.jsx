import React, { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "../BookingForm/CheckoutForm";
import wifi from "../../assets/wifi.png";
import masterCardLogo from "../../assets/master-card.png";
import { useBooking } from "../../context/BookingContext";

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
}) => {

    const { setBookingData } = useBooking();
    
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
                <img src={wifi} alt="Wifi Svg" width="50px" style={{ transform: "rotate(90deg)", filter: "invert(1)" }} />
              </div>
              <div className="mt-4 fs-3">**** **** **** ****</div>
              <div>
                <small className="text-secondary">Valid Thru <span>**</span> / <span>**</span></small>
              </div>
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-warning fs-5"><strong>XXXX X X</strong></div>
                <img src={masterCardLogo} alt="Card Logo" style={{ width: "50px", height: "50px" }} />
              </div>
            </div>
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