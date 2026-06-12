import React from "react";
import { CANCELLATION_FEE } from "../../utils/bookingRules";

// Shared cancel dialog for the customer dashboard and the guest manage page.
// - refundEligible=false → no refund of any kind (within 72h of departure):
//   a single confirm button behind a clear warning.
// - allowPoints=false → guest flow: only the card refund option is offered.
const CancelBookingModal = ({
  open,
  booking,
  onClose,
  onConfirm, // (type) => void, type: "refund" | "points" | "no_refund"
  allowPoints = true,
  refundEligible = true,
  loading = false,
}) => {
  if (!open || !booking) return null;

  return (
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
        if (e.target === e.currentTarget) onClose();
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
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {!refundEligible ? (
              <>
                <div className="alert alert-danger mb-3" style={{ fontSize: "1rem" }}>
                  <b>No refund applies to this cancellation.</b>
                  <br />
                  You are cancelling within 72 hours of your departure time. Per our
                  cancellation policy, you will <b>not</b> receive a refund or credit of any kind.
                </div>
                <p className="mb-0">
                  Are you sure you want to cancel booking{" "}
                  <strong>#{booking.booking_id || booking.id}</strong>?
                </p>
              </>
            ) : (
              <>
                <p className="mb-3">
                  {allowPoints
                    ? "How would you like to receive your refund for this booking?"
                    : "Your refund will be returned to your original payment method."}
                </p>
                <div className="mb-3 p-3 rounded bg-light border">
                  <strong>Refund to Original Payment Method</strong>
                  <br />
                  <span className="text-muted" style={{ fontSize: "0.97rem" }}>
                    The amount will be returned to your original payment method. Processing may take 5-10 business days depending on your bank.
                  </span>
                </div>
                {allowPoints && (
                  <div className="mb-3 p-3 rounded bg-light border">
                    <strong>Credit Points</strong>
                    <br />
                    <span className="text-muted" style={{ fontSize: "0.97rem" }}>
                      Instantly receive the booking amount as credit points in your account. You can use these points for discounts on your next booking.
                    </span>
                  </div>
                )}
                <div className="alert alert-warning mt-3 mb-0 text-center" style={{ fontSize: "0.98rem" }}>
                  <b>Note:</b> A €{CANCELLATION_FEE} cancellation fee applies to all cancellations.
                </div>
              </>
            )}
          </div>
          <div className="modal-footer d-flex flex-column flex-sm-row justify-content-between gap-2">
            {!refundEligible ? (
              <button
                className="btn btn-danger w-100"
                disabled={loading}
                onClick={() => onConfirm("no_refund")}
              >
                {loading ? "Cancelling..." : "Cancel Booking (No Refund)"}
              </button>
            ) : (
              <>
                <button
                  className="btn btn-danger w-100"
                  disabled={loading}
                  onClick={() => onConfirm("refund")}
                >
                  Refund to Card/Bank
                </button>
                {allowPoints && (
                  <button
                    className="btn btn-success w-100"
                    disabled={loading}
                    onClick={() => onConfirm("points")}
                  >
                    Get Credit Points
                  </button>
                )}
              </>
            )}
            <button
              className="btn btn-outline-secondary w-100"
              disabled={loading}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
