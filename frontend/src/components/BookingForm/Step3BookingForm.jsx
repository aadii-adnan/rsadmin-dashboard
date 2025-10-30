import React, {useEffect, useState} from "react";
import { loadStripe } from "@stripe/stripe-js";
import wifi from "../../assets/wifi.png";
import masterCardLogo from "../../assets/master-card.png";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";



const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY); // Replace with your real Stripe public key

const Step3BookingForm = ({ formData, totalPrice, discountedPrice,  goNext, handleChange, nextButtonStyle, labelStyle, inputStyle,  bonusUsed, prevButtonStyle, goBack}) => {

  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 600);
  }
  , []);

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
              Step 4 - 4
            </h2>
          </div>
        </div>

        <div className="container">
          <div className="row">
            <div className="col-sm-8 mx-auto my-5 payment-card">
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
