import React, { useEffect, useState } from 'react';
import PopupDialog from "../Utility/PopupDialog";
import { useBooking } from "../../context/BookingContext";
import { getAttribution } from "../../utils/attribution";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const Step1BookingForm = ({ labelStyle, inputStyle, formData, handleChange, nextButtonStyle, goNext, goBack, prevButtonStyle, contactNo, setContactNo, serviceDetails, couponId, discountedPrice, totalPrice, statuses, setFormData, selectedAddOns, addOnsDetails }) => {
  const [error, setError] = useState(""); // State to store validation error messages
  const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup
  const [loading, setLoading] = useState(false); // Loading state while creating the booking
  const {
    bookingData,
    setBookingData,
    bookingData: { bookingDates: { parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }, userDetails },
  } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 300)
  }, []);

  // Validation function
  const validateInputs = () => {
    if (!formData.car_registration_no || !formData.car_model || !formData.car_colour || !formData.car_manufacturer || !formData.departure_terminal || !formData.return_terminal) {
      setError("Please fill in all required fields.");
      setIsPopupOpen(true);
      return false;
    }

    if (totalPrice <= 0) {
      setError("Invalid price calculation");
      setIsPopupOpen(true);
      return false;
    }

    setError(""); // Clear error if validation passes
    return true;
  };

  const updateBookingUserStatus = async (bookingUserId) => {
    if (!bookingUserId) return;
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/booking-user/${bookingUserId}/status/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_completion_status: true }),
        }
      );
    } catch (err) {
      console.error("Failed to update booking user status", err);
    }
  };

  // Create/update the booking record, then advance to payment.
  // (The previous "Add Ons" step is skipped, so booking creation happens here.)
  const handleBooking = async () => {
    try {
      const statusId = statuses.find((status) => status.name === formData.status_name && status.type === "booking")?.id;

      if (!statusId) {
        alert("Invalid status selected.");
        return;
      }

      if (!parkingFromDate || !carCollectionDate) {
        throw new Error("Invalid booking dates");
      }

      const bookingPayload = {
        ...formData,
        service: serviceDetails.id,
        user: userDetails?.id,
        contact_no: contactNo,
        departure_time: parkingFromDate + " " + parkingFromTime,
        return_time: carCollectionDate + " " + carCollectionTime,
        coupon: couponId,
        discounted_price: discountedPrice == 0 ? totalPrice.toFixed(2) : discountedPrice.toFixed(2),
        total_price: totalPrice.toFixed(2),
        status: statusId,
        website: "rsexpressparking",
        add_ons: selectedAddOns,
      };

      let response, data;
      if (formData.booking_id) {
        // Update existing booking
        response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/bookings/${formData.booking_id}/`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingPayload),
          }
        );
      } else {
        // Create new booking — attach first-touch marketing attribution (create only)
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bookings/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bookingPayload, ...getAttribution() }),
        });
      }
      data = await response.json();

      if (response.ok) {
        setFormData((prev) => ({
          ...prev,
          booking_id: data.id,
        }));
        setBookingData((prev) => ({
          ...prev,
          bookingDetails: {
            ...prev.bookingDetails,
            booking_id: data.id,
            booking_unique_id: data?.booking_id,
            total_price: totalPrice,
          },
          carFlightDetails: {
            ...prev.carFlightDetails,
            addOnsDetails: addOnsDetails,
          },
        }));
        if (formData.booking_user_id) {
          await updateBookingUserStatus(formData.booking_user_id);
        }
        goNext();
      } else {
        if (data.error === "Coupon has been fully used") {
          setError(data.error);
          setIsPopupOpen(true);
          return;
        }
        setError(data.message || "An error occurred.");
        setIsPopupOpen(true);
      }
    } catch (error) {
      console.error("Error creating/updating booking:", error);
    }
  };

  // Handle Next button click
  const handleNext = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      await handleBooking(); // Creates the booking and advances on success
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
    <fieldset className="fieldset active">
      <div className="form-card">
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>Car Details:</h2>
        {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>} {/* Display validation error */}
        <div className="bookingform-row">
            <div  className="bookingform-col">
                <label style={labelStyle}>Car Registration: *</label>
                <input
                type="text"
                name="car_registration_no"
                placeholder="Registration No"
                style={inputStyle}
                value={formData?.car_registration_no}
                onChange={handleChange}
                required
                />
            </div>
            <div  className="bookingform-col">
                <label style={labelStyle}>Car Model: *</label>
                <input
                type="text"
                name="car_model"
                placeholder="Model"
                style={inputStyle}
                value={formData?.car_model}
                onChange={handleChange}
                required
                />
            </div>
        </div>
        <div className="bookingform-row">
            <div  className="bookingform-col">
                <label style={labelStyle}>Car Color: *</label>
                <input
                type="text"
                name="car_colour"
                placeholder="Color"
                style={inputStyle}
                value={formData?.car_colour}
                onChange={handleChange}
                required
                />
            </div>
            <div  className="bookingform-col">
                <label style={labelStyle}>Car Manufacturer: *</label>
                <input
                type="text"
                name="car_manufacturer"
                placeholder="Manufacturer"
                style={inputStyle}
                value={formData?.car_manufacturer}
                onChange={handleChange}
                required
                />
            </div>
        </div>

        <div className="bookingform-row">
          <div className="bookingform-col">
            <label style={labelStyle}>Total Passengers:</label>
            <input className='custom-input' type="number" name="total_passengers" placeholder="Passengers" style={inputStyle} min={0} value={formData?.total_passengers} onChange={e=>{
              const val = Number(e.target.value);
              if(val < 0) return;
              handleChange(e);
            }}/>
          </div>
        </div>

        <div className="bookingform-row">
            <div className="col-7">
                <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px", marginTop: "20px" }}>
                Flight Details:
                </h2>
            </div>                       
        </div>
        <div className="bookingform-row">
            <div className="bookingform-col">
                <label style={labelStyle}>Departure Terminal: *</label>
                <select
                  className='custom-input'
                  name="departure_terminal"
                  style={inputStyle}
                  value={formData?.departure_terminal ?? ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Terminal</option>
                  <option value="1">Terminal 1</option>
                  <option value="2">Terminal 2</option>
                </select>
            </div>
            <div className="bookingform-col">
                <label style={labelStyle}>Return Terminal: *</label>
                <select
                  className='custom-input'
                  name="return_terminal"
                  style={inputStyle}
                  value={formData?.return_terminal ?? ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Terminal</option>
                  <option value="1">Terminal 1</option>
                  <option value="2">Terminal 2</option>
                </select>
            </div>
        </div>

        <div className="bookingform-row">
          <div className="bookingform-col">
              <label style={labelStyle}>Departure Flight Number:</label>
              <input className='custom-input'
              type="text"
              name="departure_flight_number"
              placeholder="Dep Flight Number"
              style={inputStyle}
              value={formData?.departure_flight_number}
              onChange={handleChange}
              />
          </div>
          <div className="bookingform-col">
              <label style={labelStyle}>Return Flight Number:</label>
              <input className='custom-input'
              type="text"
              name="return_flight_number"
              placeholder="Ret Flight Number"
              style={inputStyle}
              value={formData?.return_flight_number}
              onChange={handleChange}
              />
          </div>
        </div>  

          {bookingData?.userDetails?.id && <>
             
            <div className="bookingform-row">
                  <div className="col-7">
                      <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
                      Your Details:
                      </h2>
                  </div>                       
              </div>

              <div className="bookingform-row">
                  <div className="bookingform-col" style={{ width: "50%", paddingRight: "10px" }}>
                      <label style={labelStyle}>First Name: *</label>
                      <input className='custom-input'
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      style={inputStyle}
                      value={formData?.first_name}
                      onChange={handleChange}
                      required
                      />
                  </div>
                  <div className="bookingform-col" style={{ width: "50%", paddingLeft: "10px" }}>
                      <label style={labelStyle}>Last Name: *</label>
                      <input className='custom-input'
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      style={inputStyle}
                      value={formData?.last_name}
                      onChange={handleChange}
                      required
                      />
                  </div>
              </div>

              <div className="bookingform-row">
                  <div className="bookingform-col" style={{ width: "50%", paddingRight: "10px" }}>
                      <label style={labelStyle}>Email: *</label>
                      <input className='custom-input'
                      type="email"
                      name="email"
                      placeholder="Email Id"
                      style={inputStyle}
                      value={formData?.email}
                      onChange={handleChange}
                      required
                      />
                  </div>
                  <div className="bookingform-col" style={{ width: "50%", paddingLeft: "10px", marginBottom: "10px" }}>
                      <label style={labelStyle}>Contact No: *</label>
                      <PhoneInput
                      defaultCountry="ie"
                      value={contactNo}
                      onChange={(phone) => setContactNo(phone)}
                      />
                  </div>
              </div>
            </>}
           
      </div>
      <input type="button" className="next action-button" value={loading ? "loading..." : "Next"} onClick={handleNext} disabled={loading} style={nextButtonStyle} />
      {!bookingData?.userDetails?.id && <input type="button" className="previous action-button-previous" value="Back" onClick={goBack} style={prevButtonStyle} />}
    </fieldset>

    {/* Popup Dialog */}
    <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title=""
        message={error}
      />
    </div>
  );
};

export default Step1BookingForm;