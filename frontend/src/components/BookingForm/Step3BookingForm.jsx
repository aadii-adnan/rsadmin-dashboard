import React, {useEffect} from "react";
import { loadStripe } from "@stripe/stripe-js";
import wifi from "../../assets/wifi.png";
import masterCardLogo from "../../assets/master-card.png";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";



const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY); // Replace with your real Stripe public key

const Step3BookingForm = ({ formData, totalPrice, discountedPrice,  goNext, handleChange, nextButtonStyle, labelStyle, inputStyle }) => {

  useEffect(() => {
    window.scrollTo(0, 600);
  }
  , []);
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
                  <div className="fs-4"><strong>€{discountedPrice || totalPrice}</strong></div>
                  <img src={wifi} alt="Wifi Svg" width="60px" style={{ transform: "rotate(90deg)", filter: "invert(1)" }} />
                </div>
                <div className="mt-4 fs-3">{formData.card_number ? "**** **** **** " + formData.card_number.slice(-4) : "**** **** **** ****"}</div>
                <div>
                  <small className="text-secondary">Valid Thru <span>{formData.expiry_month || "**"}</span> / <span>{formData.expiry_year || "**"}</span></small>
                </div>
                <div className="mt-3 d-flex justify-content-between align-items-center">
                  <div className="text-warning fs-5"><strong>{formData.card_name || "XXXX X X"}</strong></div>
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
                  />
                </Elements>
              </div>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};

export default Step3BookingForm;
