import React, { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  createTopUpIntent,
  checkTopUpStatus,
  TOPUP_MIN,
  TOPUP_MAX,
  TOPUP_PRESETS,
} from "../../services/creditService";

// Same Stripe public key as the booking form
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const STATUS_CHECK_INTERVAL = 2000; // 2 seconds
const MAX_STATUS_CHECKS = 10;
const THEME_DARK_BLUE = "#010659";

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
    },
  },
};

// Lightweight checkout form dedicated to credit top-ups. Intentionally NOT
// the booking CheckoutForm — that one is coupled to booking status polling,
// amount verification and /thank-you navigation.
const TopUpCheckoutForm = ({ amount, clientSecret, transactionId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const pollStatus = async () => {
    for (let attempt = 0; attempt < MAX_STATUS_CHECKS; attempt++) {
      try {
        const { status, balance } = await checkTopUpStatus(transactionId);
        if (status === "succeeded") {
          return { succeeded: true, balance };
        }
        if (status === "failed") {
          return { succeeded: false, failed: true };
        }
      } catch (err) {
        console.error("Error checking top-up status:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));
    }
    return { succeeded: false, failed: false };
  };

  const handleSubmit = async () => {
    if (processing) return;
    setError(null);
    setProcessing(true);

    try {
      if (!stripe || !elements) {
        throw new Error("Payment system not initialized. Please try again.");
      }

      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment failed. Please try again.");
      }

      if (result.paymentIntent?.status === "succeeded") {
        setMessage("Payment processed. Adding credits to your account...");
        const outcome = await pollStatus();
        if (outcome.succeeded) {
          await onSuccess(outcome.balance);
          return;
        }
        if (outcome.failed) {
          throw new Error("Payment could not be confirmed. Please contact support.");
        }
        // Webhook is still processing — credits will land shortly
        setMessage(
          "Your payment is processing. Your credits will appear in your account shortly and you'll receive a confirmation email."
        );
      }
    } catch (err) {
      console.error("Top-up payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      setMessage(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="form-group mt-2">
        <label style={{ fontWeight: 600, marginBottom: 6 }}>Card Details</label>
        <CardElement className="form-control" options={cardElementOptions} />
      </div>

      {error && (
        <div className="alert alert-danger mt-3 mb-0" style={{ fontSize: 14 }}>
          {error}
        </div>
      )}
      {message && !error && (
        <div className="alert alert-info mt-3 mb-0" style={{ fontSize: 14 }}>
          {message}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="btn w-100"
          disabled={processing || !stripe}
          style={{
            fontWeight: 700,
            fontSize: 16,
            borderRadius: 8,
            padding: "10px 0",
            background: THEME_DARK_BLUE,
            borderColor: THEME_DARK_BLUE,
            color: "#fff",
          }}
        >
          {processing ? "Processing..." : `Pay €${Number(amount).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};

const AddCreditsModal = ({ open, onClose, onTopUpSuccess }) => {
  const [step, setStep] = useState("amount"); // "amount" | "payment"
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentData, setIntentData] = useState(null); // { clientSecret, transaction_id, amount }

  if (!open) return null;

  const resetAndClose = () => {
    setStep("amount");
    setAmount("");
    setAmountError(null);
    setIntentData(null);
    setCreatingIntent(false);
    onClose();
  };

  const validateAmount = (value) => {
    const num = Number(value);
    if (!value || Number.isNaN(num)) return "Please enter an amount.";
    if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
      return "Amount can have at most 2 decimal places.";
    }
    if (num < TOPUP_MIN) return `Minimum top-up is €${TOPUP_MIN}.`;
    if (num > TOPUP_MAX) return `Maximum top-up is €${TOPUP_MAX}.`;
    return null;
  };

  const handleContinue = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }
    setAmountError(null);
    setCreatingIntent(true);
    try {
      const data = await createTopUpIntent(Number(amount).toFixed(2));
      if (!data?.clientSecret) {
        throw new Error(data?.error || "Could not start the top-up. Please try again.");
      }
      setIntentData(data);
      setStep("payment");
    } catch (err) {
      setAmountError(err.message || "Could not start the top-up. Please try again.");
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = async (newBalance) => {
    if (onTopUpSuccess) {
      await onTopUpSuccess(newBalance);
    }
    alert(`€${Number(intentData.amount).toFixed(2)} has been added to your account credits.`);
    resetAndClose();
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440, pointerEvents: "none" }}>
        <div
          className="modal-content"
          style={{ borderRadius: 16, pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h5 className="modal-title">Top Up Credits</h5>
            <button type="button" className="btn-close" onClick={resetAndClose}></button>
          </div>
          <div className="modal-body">
            {step === "amount" ? (
              <>
                <p style={{ color: "#555", fontSize: 14 }}>
                  Choose how much you'd like to add to your account. Credits are applied
                  automatically at checkout — no card details needed while your balance
                  covers the booking.
                </p>
                <div className="d-flex gap-2 mb-3">
                  {TOPUP_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="btn flex-fill"
                      onClick={() => {
                        setAmount(String(preset));
                        setAmountError(null);
                      }}
                      style={{
                        fontWeight: 700,
                        borderRadius: 8,
                        border:
                          Number(amount) === preset
                            ? `2px solid ${THEME_DARK_BLUE}`
                            : "1px solid #d1d5db",
                        background: Number(amount) === preset ? "rgba(1,6,89,0.08)" : "#fff",
                        color: THEME_DARK_BLUE,
                      }}
                    >
                      €{preset}
                    </button>
                  ))}
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, marginBottom: 6 }}>
                    Amount (€{TOPUP_MIN} – €{TOPUP_MAX})
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={TOPUP_MIN}
                    max={TOPUP_MAX}
                    step="0.01"
                    placeholder="Enter custom amount"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setAmountError(null);
                    }}
                  />
                </div>
                {amountError && (
                  <div className="alert alert-danger mt-3 mb-0" style={{ fontSize: 14 }}>
                    {amountError}
                  </div>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn w-100"
                    onClick={handleContinue}
                    disabled={creatingIntent}
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      borderRadius: 8,
                      padding: "10px 0",
                      background: THEME_DARK_BLUE,
                      borderColor: THEME_DARK_BLUE,
                      color: "#fff",
                    }}
                  >
                    {creatingIntent ? "Please wait..." : "Continue to Payment"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="d-flex align-items-center justify-content-between p-3 mb-3"
                  style={{ background: "#f8fafc", borderRadius: 12 }}
                >
                  <span style={{ fontWeight: 600, color: "#555" }}>Top-up amount</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: THEME_DARK_BLUE }}>
                    €{Number(intentData.amount).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 shadow bg-white position-relative" style={{ borderRadius: 12 }}>
                  <Elements stripe={stripePromise}>
                    <TopUpCheckoutForm
                      amount={intentData.amount}
                      clientSecret={intentData.clientSecret}
                      transactionId={intentData.transaction_id}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </div>
                <button
                  type="button"
                  className="btn btn-link mt-2 p-0"
                  style={{ color: THEME_DARK_BLUE, fontWeight: 600, textDecoration: "none" }}
                  onClick={() => {
                    setStep("amount");
                    setIntentData(null);
                  }}
                >
                  ← Change amount
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCreditsModal;
