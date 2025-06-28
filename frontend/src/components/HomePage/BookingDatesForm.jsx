import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { useNavigate } from "react-router-dom";
import PopupDialog from "../Utility/PopupDialog";
import { DateTime } from "luxon";


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

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/coupons/validate/`, {
        method: "POST",
        body: JSON.stringify({ code: coupon.trim() }),
        headers: {
          "Content-Type": "application/json",
        },
      });
  
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
            setPopupMessage(data.message || "Invalid coupon.");
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

    const now = DateTime.now().setZone("Europe/Dublin");

    const parkingFromDateTime = DateTime.fromISO(
      `${formData.parkingFromDate}T${formData.parkingFromTime}`,
      { zone: "Europe/Dublin" }
    );
    const carCollectionDateTime = DateTime.fromISO(
      `${formData.carCollectionDate}T${formData.carCollectionTime}`,
      { zone: "Europe/Dublin" }
    );

    if (
      parkingFromDateTime.diff(now, "hours").hours < 4 ||
      carCollectionDateTime.diff(now, "hours").hours < 4
    ) {
      setPopupMessage("Drop-off date and time must be at least 4 hours from the current Dublin time.");
      setIsPopupOpen(true);
      return;
    }

    if (parkingFromDateTime >= carCollectionDateTime) {
      setPopupMessage("Pickup date and time must be after Drop-off date and time.");
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
    <div id="book" className="form-column" style={{ backgroundColor: "#f8f9fa", margin:"0 auto", flex: "1", minWidth: "300px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)", border: "1px solid #e0e0e0", zIndex:10}}>
      <form onSubmit={handleSubmit}> <h3   style={{     textAlign: "center",     marginBottom: "20px",     color: "#2890cd",     fontWeight: "600",   }} >   Book Your Parking </h3>
        <div style={{   display: "flex",   justifyContent: "space-between",   gap: "15px",   marginBottom: "15px", }}>
          {/* Parking From Date */}
          <div className="form-date">
            <label htmlFor="parkingFromDate" style={{   display: "block",   marginBottom: "5px",   fontWeight: "500",   color: "#333", }}>Drop-off Date:</label>
            <input type="date" id="parkingFromDate" name="parkingFromDate" onFocus={(e) => e.target.showPicker()} style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px", }} onChange={handleChange} value={formData.parkingFromDate} min={today} required/>
          </div>

          {/* Parking From Time */}
          <div className="form-time">
            <label htmlFor="parkingFromTime" style={{ display: "block", marginBottom: "5px", fontWeight: "500", color: "#333" }}>Drop-off Time</label>
            <select id="parkingFromTime" name="parkingFromTime" value={formData.parkingFromTime} onChange={handleChange} required style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px",   backgroundColor: "#fff",   cursor: "pointer" }}>
              <option value="">Select time</option>
              {generate24HourTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{   display: "flex",   justifyContent: "space-between",   gap: "15px",   marginBottom: "15px", }}>
          {/* Car Collection Date */}
          <div className="form-date">
            <label htmlFor="carCollectionDate" style={{   display: "block",   marginBottom: "5px",   fontWeight: "500",   color: "#333", }}>Pickup Date:</label>
            <input type="date" id="carCollectionDate" name="carCollectionDate" onFocus={(e) => e.target.showPicker()} style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px", }} onChange={handleChange} value={formData.carCollectionDate} min={formData.parkingFromDate || today} required/>
          </div>

          {/* Car Collection Time */}
          <div className="form-time">
            <label htmlFor="carCollectionTime" style={{ display: "block", marginBottom: "5px", fontWeight: "500", color: "#333" }}>Pickup Time</label>
            <select id="carCollectionTime" name="carCollectionTime" value={formData.carCollectionTime} onChange={handleChange} required style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px",   backgroundColor: "#fff",   cursor: "pointer" }}>
              <option value="">Select time</option>
              {generate24HourTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="couponCode" style={{   display: "block",   marginBottom: "5px",   fontWeight: "500",   color: "#333", }}>  Coupon Code:</label>
          <input type="text" id="couponCode" name="coupon" style={{   width: "100%",   padding: "10px",   borderRadius: "5px",   border: "1px solid #ccc",   fontSize: "14px", }} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter coupon code" value={coupon}/>
        </div>
        
        <button type="submit" style={{   width: "100%",   padding: "12px",   backgroundColor: "#2890cd",   color: "#fff",   border: "none",   borderRadius: "10px",   fontSize: "16px",   fontWeight: "600",   cursor: "pointer",   transition: "background-color 0.3s ease", }} onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")} onMouseOut={(e) => (e.target.style.backgroundColor = "#2890cd")} onFocus={(e) =>   (e.target.style.boxShadow = "0 0 5px rgba(0, 123, 255, 0.5)") }>
          Book Now
        </button>
      </form>

      {/* Popup Dialog */}
      <PopupDialog isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} title="Invalid Parking Time" message={popupMessage}/>
    </div>
  );
};

export default BookingDatesForm;