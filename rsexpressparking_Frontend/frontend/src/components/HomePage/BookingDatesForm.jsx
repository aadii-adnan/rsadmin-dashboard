import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { useNavigate } from "react-router-dom";
import PopupDialog from "../Utility/PopupDialog";
import customFetch from "../../auth/fetch";

const BookingDatesForm = () => {
  const { setBookingData } = useBooking();
  const [coupon, setCoupon] = useState("");
  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({
    parkingFromDate: "",
    parkingFromTime: "",
    carCollectionDate: "",
    carCollectionTime: "",
  });

  const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup
  const [popupMessage, setPopupMessage] = useState(""); // Message for popup
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  function calculateParkingDays({ parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }) {
    if (!parkingFromDate || !parkingFromTime || !carCollectionDate || !carCollectionTime) {
      setPopupMessage("Invalid dates");
      setIsPopupOpen(true);
      return 0;
    }
  
    const fromDateTimeStr = `${parkingFromDate}T${parkingFromTime}`;
    const toDateTimeStr = `${carCollectionDate}T${carCollectionTime}`;
  
    const fromDateTime = new Date(fromDateTimeStr);
    const toDateTime = new Date(toDateTimeStr);
  
    if (isNaN(fromDateTime) || isNaN(toDateTime)) {
      setPopupMessage("Invalid dates");
      setIsPopupOpen(true); 
      return 0;
    }
  
    const diffInMs = toDateTime - fromDateTime;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if(Math.ceil(diffInDays) <= 0) {
      setPopupMessage("Invalid dates");
      setIsPopupOpen(true); 
      return 0;
    }
  
    return Math.ceil(diffInDays); 
  }

  const handleApplyCoupon = async () => {
    try {
      if (!coupon) return null;
  
      const response = await customFetch("http://localhost:8000/api/services/coupons/validate/", {
        method: "POST",
        body: { code: coupon.trim() },
      });
      const data = await response.json();
  
      if (response.ok) {
        const discountPercentage = data.discount_percent;
        return {
          couponId: data.id,
          discount: discountPercentage,
        };
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      alert("An error occurred while applying the coupon.");
    }
  
    return null;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const now = new Date();
    const parkingFromDateTime = new Date(`${formData.parkingFromDate}T${formData.parkingFromTime}`);
    const carCollectionDateTime = new Date(`${formData.carCollectionDate}T${formData.carCollectionTime}`);
  
    if (parkingFromDateTime - now < 4 * 60 * 60 * 1000 || carCollectionDateTime - now < 4 * 60 * 60 * 1000) {
      setPopupMessage("Parking date and time must be at least 4 hours from the current time.");
      setIsPopupOpen(true);
      return;
    }
  
    if (parkingFromDateTime >= carCollectionDateTime) {
      setPopupMessage("Car collection date and time must be after parking date and time.");
      setIsPopupOpen(true);
      return;
    }
  
    const couponData = await handleApplyCoupon();
    const noOfDays = calculateParkingDays(formData);
  
    const paymentDetails = {
      couponId: couponData?.couponId || null,
      discount: couponData?.discount || 0,
      noOfDays: noOfDays,
      coupon: coupon,
    };
  
    setBookingData((prev) => ({
      ...prev,
      bookingDates: formData,
      paymentDetails: paymentDetails,
    }));
  
    navigate("/services");
  };
  

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="form-column"
      style={{
        backgroundColor: "#f8f9fa",
        width: "40%",
        padding: "30px 60px",
        position: "absolute",
        top: "50%",
        left: "75%",
        transform: "translate(-50%, -50%)",
        flex: "1",
        minWidth: "300px",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e0e0e0",
      }}
    >
      <form onSubmit={handleSubmit}>
        <h3
          style={{
            textAlign: "center",
            marginBottom: "20px",
            color: "#2890cd",
            fontWeight: "600",
          }}
        >
          Book Your Parking
        </h3>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="parkingFromDate"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            Parking From:
          </label>
          <input
            type="date"
            id="parkingFromDate"
            name="parkingFromDate"
            onFocus={(e) => e.target.showPicker()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
            onChange={handleChange}
            value={formData.parkingFromDate}
            min={today}
            required
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="parkingFromTime"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            Time:
          </label>
          <input
            type="time"
            id="parkingFromTime"
            name="parkingFromTime"
            onFocus={(e) => e.target.showPicker()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
            onChange={handleChange}
            value={formData.parkingFromTime}
            required
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="carCollectionDate"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            Car Collection:
          </label>
          <input
            type="date"
            id="carCollectionDate"
            name="carCollectionDate"
            onFocus={(e) => e.target.showPicker()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
            onChange={handleChange}
            value={formData.carCollectionDate}
            min={formData.parkingFromDate || today}
            required
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="carCollectionTime"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            Time:
          </label>
          <input
            type="time"
            id="carCollectionTime"
            name="carCollectionTime"
            onFocus={(e) => e.target.showPicker()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
            onChange={handleChange}
            value={formData.carCollectionTime}
            required
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="couponCode"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            Coupon Code:
          </label>
          <input
            type="text"
            id="couponCode"
            name="coupon"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Enter coupon code"
            value={coupon}
          />
        </div>
        
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2890cd",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#2890cd")}
          onFocus={(e) =>
            (e.target.style.boxShadow = "0 0 5px rgba(0, 123, 255, 0.5)")
          }
        >
          Book Now
        </button>
      </form>

      {/* Popup Dialog */}
      <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Invalid Parking Time"
        message={popupMessage}
      />
    </div>
  );
};

export default BookingDatesForm;