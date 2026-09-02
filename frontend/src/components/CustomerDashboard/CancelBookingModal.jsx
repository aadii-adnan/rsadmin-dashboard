import React from "react";
import { CANCELLATION_FEE } from "../../utils/bookingRules";
import "./CancelBookingModal.css";

// Shared cancel dialog for the customer dashboard and the guest manage page.
// - refundEligible=false → no refund of any kind (within 72h of departure):
//   a single confirm button behind a clear warning.
const CancelBookingModal = ({
  open,
  booking,
  onClose,
  onConfirm, // (type) => void, type: "refund" | "points" | "no_refund"
  allowPoints = true,
  pointsRequireAccount = false,
  refundEligible = true,
  loading = false,
}) => {
  if (!open || !booking) return null;

  const rawBookingAmount = Number(
    Number(booking.discounted_price) > 0
      ? booking.discounted_price
      : booking.total_price
  );
  const bookingAmount = Number.isFinite(rawBookingAmount)
    ? Math.max(0, rawBookingAmount)
    : 0;
  const bankRefundAmount = Math.max(0, bookingAmount - CANCELLATION_FEE);
  const formatEuro = (amount) => `€${amount.toFixed(2)}`;

  return (
    <div
      className="modal fade show cancel-booking-modal"
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
                <p className="cancel-booking-modal__intro">
                  Choose how you would like to receive your booking value.
                </p>
                {allowPoints && (
                  <div className="cancel-booking-modal__points-card">
                    <span className="cancel-booking-modal__badge">BEST VALUE</span>
                    <strong className="cancel-booking-modal__option-title">
                      Keep 100% in Bonus Points
                    </strong>
                    <span className="cancel-booking-modal__amount">
                      {formatEuro(bookingAmount)}
                    </span>
                    <span className="cancel-booking-modal__benefit">
                      No €{CANCELLATION_FEE} fee · Added instantly · Use on your next booking
                    </span>
                    {pointsRequireAccount && (
                      <span className="cancel-booking-modal__account-note">
                        We’ll create a free account using the email on this booking and
                        send you instructions to access your points.
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-success cancel-booking-modal__points-button"
                      disabled={loading}
                      onClick={() => onConfirm("points")}
                    >
                      {loading
                        ? "Cancelling..."
                        : `Get ${formatEuro(bookingAmount)} in Bonus Points`}
                    </button>
                  </div>
                )}

                <div className="cancel-booking-modal__bank-option">
                  <strong>Prefer a card or bank refund?</strong>
                  <span>
                    A €{CANCELLATION_FEE} cancellation fee applies, so you’ll receive{" "}
                    <b>{formatEuro(bankRefundAmount)}</b>. Bank processing may take 5–10
                    business days.
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary cancel-booking-modal__refund-button"
                    disabled={loading}
                    onClick={() => onConfirm("refund")}
                  >
                    {loading
                      ? "Cancelling..."
                      : `Refund ${formatEuro(bankRefundAmount)} to Card/Bank`}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer cancel-booking-modal__footer">
            {!refundEligible ? (
              <button
                type="button"
                className="btn btn-danger w-100"
                disabled={loading}
                onClick={() => onConfirm("no_refund")}
              >
                {loading ? "Cancelling..." : "Cancel Booking (No Refund)"}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-link cancel-booking-modal__close-button"
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
