import React, {useEffect, useState} from "react";
import { loadStripe } from "@stripe/stripe-js";
import wifi from "../../assets/wifi.png";
import masterCardLogo from "../../assets/master-card.png";
import { Elements } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import CheckoutForm from "./CheckoutForm";
import { payBookingWithCredits } from "../../services/creditService";
import { useAuth } from "../../auth/AuthContext";
import { useBooking } from "../../context/BookingContext";
import customFetch from "../../auth/fetch";



const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY); // Replace with your real Stripe public key

const Step3BookingForm = ({ formData, totalPrice, discountedPrice,  goNext, handleChange, nextButtonStyle, labelStyle, inputStyle,  bonusUsed, prevButtonStyle, goBack}) => {

  const [isHover, setIsHover] = useState(false);
  const [creditProcessing, setCreditProcessing] = useState(false);
  const [creditError, setCreditError] = useState(null);
  const { user, setUser } = useAuth();
  const { setBookingData } = useBooking();
  const navigate = useNavigate();

  // Credits cover the whole (coupon-discounted) price — no card form needed.
  // The backend recomputes and enforces the amount server-side.
  const fullyCoveredByCredits = bonusUsed > 0 && discountedPrice <= 0;

  useEffect(() => {
    window.scrollTo(0, 600);
  }
  , []);

  const refreshUserProfile = async () => {
    try {
      const res = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me/`);
      if (res && res.ok) {
        const profile = await res.json();
        setUser({ ...user, ...profile });
        setBookingData((prev) => ({
          ...prev,
          userDetails: { ...(prev?.userDetails || {}), ...profile },
        }));
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  };

  const handlePayWithCredits = async () => {
    if (creditProcessing) return;
    setCreditError(null);
    setCreditProcessing(true);
    try {
      const { ok, data } = await payBookingWithCredits(formData.booking_id);
      if (!ok) {
        // Balance may have changed since the summary was calculated —
        // refresh it so the price summary recalculates (partial-cover flow).
        await refreshUserProfile();
        throw new Error(data?.error || "Could not pay with credits. Please try again.");
      }
      localStorage.setItem("payment_status", "succeeded");
      await refreshUserProfile();
      navigate("/thank-you");
    } catch (err) {
      setCreditError(err.message || "Could not pay with credits. Please try again.");
    } finally {
      setCreditProcessing(false);
    }
  };

  const backBtnBase = {
    background: "#fff",
    color: "#010659",
    border: "1px solid #d1d5db",
    padding: "10px 20px",
    borderRadius: 8,
    minWidth: 120,
    fontWeight: 600,
    boxShadow: isHover ? "0 8px 28px rgba(1,6,89,0.12)" : "0 4px 12px rgba(1,6,89,0.06)",
    transition: "all 160ms ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
  };

  const backButtonStyleFinal = prevButtonStyle ? { ...backBtnBase, ...prevButtonStyle } : backBtnBase;

  return (
    <fieldset className="fieldset active">
      <div className="form-card">
        <div className="row">
          <div className="col-7">
            <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
              Payment Details:
            </h2>
          </div>
          <div className="col-5">
            <h2 className="steps" style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>
              Step 3 - 3
            </h2>
          </div>
        </div>

        <div className="container">
          <div className="row">
            <div className="col-sm-8 mx-auto my-5 payment-card">
              {fullyCoveredByCredits ? (
                <div className="p-4 shadow bg-white position-relative" style={{ borderRadius: 12, textAlign: "left" }}>
                  <h5 style={{ fontWeight: 700, color: "#010659", marginBottom: 16 }}>
                    Pay with Account Credits
                  </h5>
                  <div
                    className="d-flex align-items-center justify-content-between p-3 mb-3"
                    style={{ background: "#f0faf1", borderRadius: 12, border: "1px solid #43a047" }}
                  >
                    <span style={{ fontWeight: 600, color: "#555" }}>Credits to be used</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: "#43a047" }}>
                      €{Number(bonusUsed).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#555" }}>
                    Your credit balance covers this booking in full. No card details are
                    needed — the amount will be deducted from your account credits.
                  </p>
                  {creditError && (
                    <div className="alert alert-danger" style={{ fontSize: 14 }}>
                      {creditError}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary w-100 next-button"
                    onClick={handlePayWithCredits}
                    disabled={creditProcessing}
                    style={nextButtonStyle}
                  >
                    {creditProcessing ? "Processing..." : `Pay with Credits (€${Number(bonusUsed).toFixed(2)})`}
                  </button>
                </div>
              ) : (
                <>
                  <div id="cardDesign" className="position-relative shadow p-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fs-4"><strong>€{discountedPrice > 0 ? discountedPrice.toFixed(2) : totalPrice.toFixed(2)}</strong></div>
                      <img src={wifi} alt="Wifi Svg" width="60px" style={{ transform: "rotate(90deg)", filter: "invert(1)" }} />
                    </div>
                    <div className="mt-4 fs-3">**** **** **** ****</div>
                    <div>
                      <small className="text-secondary">Valid Thru <span>**</span> / <span>**</span></small>
                    </div>
                    <div className="mt-3 d-flex justify-content-between align-items-center">
                      <div className="text-warning fs-5"><strong>XXXX X X</strong></div>
                      <img src={masterCardLogo} alt="Card Logo" style={{ width: "60px", height: "60px" }} />
                    </div>
                  </div>

                  <div className="p-4 shadow bg-white position-relative" id="formWrap">
                    <Elements stripe={stripePromise}>
                      <CheckoutForm
                        formData={formData}
                        totalPrice={totalPrice}
                        goNext={goNext}
                        inputStyle={inputStyle}
                        labelStyle={labelStyle}
                        nextButtonStyle={nextButtonStyle}
                        handleChange={handleChange}
                        bonusUsed={bonusUsed}
                      />
                    </Elements>
                  </div>
                </>
              )}
              <div className="mt-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn"
                  onClick={goBack}
                  style={backButtonStyleFinal}
                  onMouseEnter={() => setIsHover(true)}
                  onMouseLeave={() => setIsHover(false)}
                >
                  <span style={{fontSize:18, lineHeight:1}}>←</span>
                  <span>Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};

export default Step3BookingForm;
