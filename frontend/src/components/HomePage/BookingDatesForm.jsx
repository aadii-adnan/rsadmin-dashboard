import React, { useState, useEffect } from "react";
import { useBooking } from "../../context/BookingContext";
import { useNavigate } from "react-router-dom";
import PopupDialog from "../Utility/PopupDialog";
import "./BookingDatesForm.css";
import BookingDateFields from "./BookingDateFields";
import customFetch from "../../auth/fetch";
import {
  EMPTY_BOOKING_DATES,
  updateBookingDateField,
  validateBookingDates,
} from "../../utils/bookingDates";

const BookingDatesForm = () => {
  const { setBookingData } = useBooking();
  const [coupon, setCoupon] = useState("");
  const [agreeChecked, setAgreeChecked] = useState(true);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...EMPTY_BOOKING_DATES });

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [minHours, setMinHours] = useState(4);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => updateBookingDateField(previous, name, value));
  };

  const handleApplyCoupon = async () => {
    try {
      const response = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/services/coupons/validate/`, {
        method: "POST",
        body: { code: coupon.trim() },
      });
      if (!response) return null;

      const data = await response.json();
  
      if (!response.ok) {
        // Handle specific error cases
        switch (response.status) {
          case 401:
            setPopupMessage("Session expired. Please login again.");
            break;
          case 404:
            setPopupMessage("Invalid coupon code.");
            break;
          case 400:
            setPopupMessage(data.error || data.message || "Invalid coupon.");
            break;
          default:
            setPopupMessage("Failed to validate coupon.");
        }
        setIsPopupOpen(true);
        return null;
      }
  
      // Success case
      
      return {
        couponId: data.id,
        discount: data.discount_percent,
        minimumOrderValue: data.minimum_order_value || 0,
      };
  
    } catch (error) {
      console.error("Error validating coupon:", error);
      setPopupMessage("An error occurred while validating the coupon.");
      setIsPopupOpen(true);
      return null;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateBookingDates(formData, minHours);
    if (validation.error) {
      setPopupMessage(validation.error);
      setIsPopupOpen(true);
      return;
    }

    let couponData = null; 
    if (coupon.trim() !== "") {
      couponData = await handleApplyCoupon();
      if (!couponData) {
        return;
      }
    }

    const paymentDetails = {
      couponId: couponData?.couponId || null,
      discount: couponData?.discount || 0,
      minimumOrderValue: couponData?.minimumOrderValue || 0,
      noOfDays: validation.noOfDays,
      coupon: coupon,
    };
  
    setBookingData((prev) => ({
      ...prev,
      bookingJourneyId: prev.bookingJourneyId || window.crypto.randomUUID(),
      bookingDates: formData,
      paymentDetails: paymentDetails,
    }));
  
    navigate("/services");
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadBookingSettings = async () => {
      try {
        const response = await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/core/booking-settings/`,
          { signal: controller.signal },
        );
        if (!response?.ok) return;
        const data = await response.json();
        setMinHours(data.min_hours_before_booking || 4);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching booking settings:", error);
        }
      }
    };

    loadBookingSettings();
    return () => controller.abort();
  }, []);
  

  return (
    <div id="book" className="form-column" style={{ 
        backgroundColor: "#f8f9fa", 
        margin:"0 auto", 
        flex: "1", 
        minWidth: "300px", 
        borderRadius: "10px", 
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)", 
        border: "1px solid #e0e0e0", 
        zIndex: 10,
        position: "relative"
    }}>
      
      
      <form onSubmit={handleSubmit} noValidate>
        <h3   style={{     textAlign: "center",     marginBottom: "20px",     color: "#2890cd",     fontWeight: "600",   }} >   Book Your Parking </h3>

        <BookingDateFields
          value={formData}
          onChange={handleChange}
          idPrefix="home-booking"
        />

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="couponCode" style={{   display: "block",   marginBottom: "5px",   fontWeight: "500",   color: "#333", }}>  Coupon Code:</label>
          <input type="text" id="couponCode" name="coupon" style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px", }} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter coupon code" value={coupon}/>
        </div>

        <div style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            id="agreeTerms"
            checked={agreeChecked}
            onChange={(e) => setAgreeChecked(e.target.checked)}
          />
          <label htmlFor="agreeTerms" style={{ color: "#333" }}>
            By clicking <strong>Book Now</strong>, you agree to our terms & conditions.
          </label>
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
            cursor: !agreeChecked ? "not-allowed" : "pointer",
            opacity: !agreeChecked ? 0.6 : 1,
            transition: "background-color 0.3s ease",
          }}
          disabled={!agreeChecked} // disable when NOT checked
          onMouseOver={(e) => agreeChecked && (e.target.style.backgroundColor = "#0056b3")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#2890cd")}
          onFocus={(e) => (e.target.style.boxShadow = "0 0 5px rgba(0, 123, 255, 0.5)")}
        >
          Book Now
        </button>
      </form>

      {/* Popup Dialog */}
      <PopupDialog isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} title="Invalid Parking Time" message={popupMessage}/>
    </div>
  );
};

export default BookingDatesForm;
