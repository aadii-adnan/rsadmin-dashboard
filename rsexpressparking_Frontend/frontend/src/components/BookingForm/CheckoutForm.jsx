import React, { useState } from 'react'
import {
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import customFetch from "../../auth/fetch";

const CheckoutForm = ({ formData, goNext, labelStyle, nextButtonStyle, handleChange }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setProcessing(true);
  
      if (!stripe || !elements) {
        return;
      }
  
      try {
        // Call Django to create PaymentIntent
        const bookingId = formData.booking_id; // Must be passed into formData
        const response = await customFetch(`http://localhost:8000/api/payment/create-intent/${bookingId}`, {
          method: "POST"
        });
  
        const { clientSecret } = await response.json();
  
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: formData.cardName
            }
          }
        });
  
        if (result.error) {
          setError(result.error.message);
          setProcessing(false);
        } else {
          if (result.paymentIntent.status === "succeeded") {
            alert("Payment successful!");
            goNext();
          }
        }
      } catch (err) {
        console.error("Payment error:", err);
        setError("Payment failed. Please try again.");
      }
  
      setProcessing(false);
    };
  
    return (
      <div>
        <div className="mb-4">
          <label htmlFor="cardName" style={labelStyle}>Name on Card</label>
          <input
            type="text"
            id="cardName"
            name="card_name"
            value={formData.card_name}
            onChange={handleChange}
            required
            style={{
             
              display: "block",
              width: "100%",
              padding: "10px 12px",
              marginTop: "5px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc"
            }}
          />
        </div>
  
        <div className="form-group mt-4">
          <label style={labelStyle}>Card Details</label>
          <div style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "10px" }}>
            <CardElement options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#32325d",
                  "::placeholder": { color: "#aab7c4" }
                },
                invalid: { color: "#fa755a" }
              }
            }} />
          </div>
        </div>
  
        {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
  
        <div className="mt-4">
          <button
            onClick={handleSubmit}
            className="btn btn-primary w-100"
            type="submit"
            disabled={processing || !stripe}
            style={nextButtonStyle}
          >
            {processing ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    );
  };

export default CheckoutForm