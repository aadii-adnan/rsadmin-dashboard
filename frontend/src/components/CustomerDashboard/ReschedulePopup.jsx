import React, { useState, useEffect, useRef } from "react";

const ReschedulePopup = ({
  open,
  onClose,
  booking,
  onSubmit,
  loading,
}) => {
  const [depDate, setDepDate] = useState("");
  const [depTime, setDepTime] = useState("");
  const [arrDate, setArrDate] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (booking) {
      // booking.departure_time and return_time are expected in "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" format
      if (booking.departure_time) {
        const [depDateStr, depTimeStr] = booking.departure_time.split("T");
        setDepDate(depDateStr);
        setDepTime(depTimeStr ? depTimeStr.slice(0, 5) : "");
      }
      if (booking.return_time) {
        const [arrDateStr, arrTimeStr] = booking.return_time.split("T");
        setArrDate(arrDateStr);
        setArrTime(arrTimeStr ? arrTimeStr.slice(0, 5) : "");
      }
      setError("");
    }
  }, [booking]);

  // Trap focus and close on ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    // Focus the dialog
    if (dialogRef.current) {
      dialogRef.current.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleBackdropClick = (e) => {
    // Only close if backdrop itself is clicked, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!depDate || !depTime || !arrDate || !arrTime) {
      setError("All fields are required.");
      return;
    }
    // Combine date and time as "YYYY-MM-DDTHH:mm"
    const departure = `${depDate}T${depTime}`;
    const arrival = `${arrDate}T${arrTime}`;

    // Check: Arrival must be after departure
    if (arrival <= departure) {
      setError("Arrival must be after departure.");
      return;
    }

    // Check: Both times must be at least 4 hours from now
    const now = new Date();
    const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const depDateTime = new Date(departure);
    const arrDateTime = new Date(arrival);

    if (depDateTime < fourHoursLater || arrDateTime < fourHoursLater) {
      setError("Both departure and arrival times must be at least 4 hours from now.");
      return;
    }

    setError("");
    onSubmit({
      departure_time: departure,
      return_time: arrival,
    });
  };

  const generate24HourTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        times.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return times;
  };

  if (!open || !booking) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      tabIndex={-1}
      ref={dialogRef}
      className="modal"
      style={{
        display: "block",
        background: "rgba(1,6,89,0.18)",
        zIndex: 1050,
        overflowY: "auto",
      }}
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ pointerEvents: "none" }}>
        <div
          className="modal-content"
          style={{ borderRadius: 16, pointerEvents: "auto" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h5 className="modal-title">Reschedule Booking #{booking.booking_id || booking.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Add this note */}
              <div className="alert alert-info d-flex align-items-center py-2 mb-3" style={{ fontSize: "0.98rem" }}>
                <span className="me-2" style={{ fontSize: "1.2em" }}>💡</span>
                If you reduce your booking days, the saved amount will be instantly added as credit points to your account for future discounts.
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Departure Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={depDate}
                    onChange={e => setDepDate(e.target.value)}
                    required
                    min={today}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Departure Time</label>
                  <select
                    style={{ backgroundColor: "#fff", cursor: "pointer" }}
                    id="depTime"
                    name="depTime"
                    type="time"
                    className="form-control"
                    value={depTime}
                    onChange={e => setDepTime(e.target.value)}
                    required
                  >
                    <option value={depTime}>{depTime}</option>
                    {generate24HourTimeOptions().map((time) => (
                        <option key={time} value={time}>
                            {time}
                        </option>
                    ))}
                </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Arrival Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={arrDate}
                    onChange={e => setArrDate(e.target.value)}
                    required
                    min={depDate || today}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Arrival Time</label>
                  <select
                    style={{ backgroundColor: "#fff", cursor: "pointer" }}
                    id="arrTime"
                    name="arrTime"
                    type="date"
                    className="form-control"
                    value={arrTime}
                    onChange={e => setArrTime(e.target.value)}
                    required
                  >
                    <option value={arrTime}>{arrTime}</option>
                        {generate24HourTimeOptions().map((time) => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className="btn"
                    style={{
                    background: "#f5f5f5",
                    color: "#333",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    padding: "8px 24px",
                    marginRight: "8px",
                    transition: "background 0.2s, color 0.2s",
                    boxShadow: "0 2px 8px rgba(40,144,205,0.04)",
                    }}
                    onClick={onClose}
                    disabled={loading}
                    onMouseOver={e => { e.currentTarget.style.background = "#e0e0e0"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "#f5f5f5"; }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn"
                    style={{
                    background: "rgb(40, 144, 205)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    padding: "8px 28px",
                    boxShadow: "0 2px 12px rgba(40,144,205,0.10)",
                    transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                    }}
                    disabled={loading}
                    onMouseOver={e => { e.currentTarget.style.filter = "brightness(1.08)"; }}
                    onMouseOut={e => { e.currentTarget.style.filter = "none"; }}
                >
                    {loading ? "Saving..." : "Reschedule"}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReschedulePopup;