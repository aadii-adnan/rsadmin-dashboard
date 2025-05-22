import React, { useEffect, useState } from 'react';
import PopupDialog from "../Utility/PopupDialog";
import { useBooking } from "../../context/BookingContext";
import { PhoneInput } from 'react-international-phone';

const Step1BookingForm = ({ labelStyle, inputStyle, formData, handleChange, nextButtonStyle, goNext, goBack, prevButtonStyle, contactNo, setContactNo }) => {
  const [error, setError] = useState(""); // State to store validation error messages
  const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup
  const { bookingData } = useBooking();

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
    
    setError(""); // Clear error if validation passes
    return true;
  };

  // Handle Next button click
  const handleNext = () => {
    if (validateInputs()) {
      goNext(); // Proceed to the next step if validation passes
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
              <input className='custom-input'
              type="number"
              name="total_passengers"
              placeholder="Passengers"
              style={inputStyle}
              value={formData?.total_passengers}
              onChange={handleChange}
            />
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
                <input className='custom-input'
                type="number"
                name="departure_terminal"
                placeholder="Dep Terminal"
                style={inputStyle}
                value={formData?.departure_terminal}
                onChange={handleChange}
                />
            </div>
            <div className="bookingform-col">
                <label style={labelStyle}>Return Terminal: *</label>
                <input className='custom-input'
                type="number"
                name="return_terminal"
                placeholder="Ret Terminal"
                style={inputStyle}
                value={formData?.return_terminal}
                onChange={handleChange}
                />
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
           
      </div>
      <input type="button" className="next action-button" value="Next" onClick={handleNext} style={nextButtonStyle} />
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