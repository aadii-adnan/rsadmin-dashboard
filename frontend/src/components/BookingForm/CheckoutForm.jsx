import React, { useState, useCallback } from 'react';
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createPaymentIntent, verifyPaymentAmount, checkPaymentStatus } from '../../services/paymentService';
import PaymentStatus from './PaymentStatus';
import { useNavigate } from 'react-router-dom';

const PAYMENT_CHECK_INTERVAL = 2000; // 2 seconds
const MAX_PAYMENT_CHECKS = 5;
const PAYMENT_TIMEOUT = 60000; // 1 minute

const CheckoutForm = ({ formData, goNext, labelStyle, nextButtonStyle, bonusUsed , onPaymentSuccess = null }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const navigate = useNavigate();
  
  // Add payment recovery state
  const [paymentTimeout, setPaymentTimeout] = useState(null);

  const resetPaymentState = () => {
    setError(null);
    setMessage(null);
    setProcessing(false);
    if (paymentTimeout) clearTimeout(paymentTimeout);
  };

  const updatePaymentStatus = async (paymentId, status, statusMessage = null) => {
    try {
      const body = { status };
      if (statusMessage) body.status_message = statusMessage;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/update-status/${paymentId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update payment status");
      }

      return response.json();
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  };

  const handlePaymentTimeout = useCallback(() => {
    setError("Payment timeout. Please try again.");
    setProcessing(false);
    setMessage(null);
  }, []);

  const verifyAmount = async (bookingId, amount) => {
    try {
      const { valid, expected_amount } = await verifyPaymentAmount(
        bookingId,
        amount,
        formData.isRescheduleExtra || false
      );
      if (!valid) {
        throw new Error(`Amount mismatch. Expected: ${expected_amount}`);
      }
      return true;
    } catch (error) {
      console.error("Amount verification failed:", error);
      return false;
    }
  };

  const pollPaymentStatus = async (bookingId) => {
    let attempts = 0;
    
    const poll = async () => {
      try {
        const { internal_status } = await checkPaymentStatus(bookingId);
        
        switch (internal_status) {
          case 'Succeeded':
            setMessage("Payment confirmed!");
            clearTimeout(paymentTimeout);
            localStorage.setItem("payment_status", "succeeded");   
            if (onPaymentSuccess) {
              await onPaymentSuccess(); // <-- await here!
            }
            navigate("/thank-you");
            break;
          case 'Failed':
            setError("Payment failed. Please try again.");
            clearTimeout(paymentTimeout);
            setMessage(null);
            if(paymentId)
            await updatePaymentStatus(paymentId, "Failed");
            break;
          case 'Pending':
            if (attempts < MAX_PAYMENT_CHECKS) {
              attempts++;
              setTimeout(poll, PAYMENT_CHECK_INTERVAL);
            } else {
              setMessage("Payment is processing. We'll email you once confirmed.");
              clearTimeout(paymentTimeout);
              goNext();
            }
            break;
          default:
            throw new Error("Unknown payment status");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setError("Failed to confirm payment status");
      }
    };

    await poll();
  };

  const retryPayment = async (clientSecret, paymentMethod) => {
    return await stripe.confirmCardPayment(clientSecret, paymentMethod);
  };

  const handleSubmit = async (e) => {
    resetPaymentState();
    if (processing) return; // Prevent double submit
    setProcessing(true);
  
    const timeout = setTimeout(handlePaymentTimeout, PAYMENT_TIMEOUT);
    setPaymentTimeout(timeout);
    let localPaymentId = null;
  
    try {
      if (!stripe || !elements) {
        throw new Error("Payment system not initialized");
      }
  
      let bookingId = formData.booking_id;
  
      // --- Create Payment Intent and check response manually ---
      const paymentIntentResponse = await createPaymentIntent(
        formData.booking_id,
        formData.isRescheduleExtra ? formData.total_price.toFixed(2) : null,
        formData.isRescheduleExtra || false,
        bonusUsed || 0
      );
      if (!paymentIntentResponse?.clientSecret) {
        
        if (
          paymentIntentResponse?.error?.includes("Duplicate entry") &&
          paymentIntentResponse?.error?.includes("booking_id")
        ) {
          const { internal_status } = await checkPaymentStatus(bookingId);
          if (internal_status === "Succeeded") {
            alert("This booking has already been paid for.");
   
            navigate("/thank-you");
            return;
          } else if (internal_status === "Pending") {
            setMessage("A payment for this booking is already being processed. Please wait...");
            await pollPaymentStatus(bookingId);
            return;
          }
  
          throw new Error("Previous payment attempt failed. Please try again.");
        }
  
        // Other API errors
        throw new Error(error?.error || "Failed to create payment intent.");
      }
      localPaymentId = paymentIntentResponse?.payment_id;
      setPaymentId(localPaymentId);
      // --- Verify amount ---
      const amountVerified = await verifyAmount(
        bookingId,
        paymentIntentResponse?.amount,
        formData.isRescheduleExtra || false
      );
      if (!amountVerified) {
        throw new Error("Payment amount verification failed");
      }
  
      // --- Prepare payment method ---
      const cardElement = elements.getElement(CardElement);
      const paymentMethod = {
        payment_method: {
          card: cardElement,
        },
      };
  
      // --- Retry payment logic ---
      let result;
      for (let retryCount = 0; retryCount < 3; retryCount++) {
        try {
          result = await retryPayment(paymentIntentResponse.clientSecret, paymentMethod);
          if (!result.error) break;
        } catch (err) {
          if (retryCount === 2) throw err;
        }
      }
  
      if (result?.error) {
        throw result.error;
      }
  
      if (result.paymentIntent.status === "succeeded") {
        setMessage("Payment processed. Confirming your booking...");
        await pollPaymentStatus(bookingId);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      if(localPaymentId)
      await updatePaymentStatus(localPaymentId, "Failed", err.message);
    } finally {
      setProcessing(false);
      clearTimeout(paymentTimeout);
    }
  };
  
  
  
  return (
    <div>

      <div className="form-group mt-4">
        <label style={labelStyle}>Card Details</label>
        <CardElement
          className="form-control"
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {/* Add PaymentStatus component */}
      <PaymentStatus 
        message={message}
        error={error}
        processing={processing}
      />

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary w-100 next-button"
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