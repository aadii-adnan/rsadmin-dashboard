import React, { useEffect, useState } from 'react';
import { useBooking } from "../../context/BookingContext";
import PopupDialog from "../Utility/PopupDialog";

const Step1BookingForm = ({ labelStyle, inputStyle, formData, handleChange, nextButtonStyle, goNext, setFormData, setTotalPrice, totalPrice, selectedAddOns, setSelectedAddOns, addOnsDetails, setAddOnsDetails }) => {
  const [addons, setAddons] = useState([]);
  const { setBookingData } = useBooking();
  const [error, setError] = useState(""); // State to store validation error messages
  const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup

  useEffect(() => {
    const fetchAddOns = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/addons/`);
        const data = await response.json();
        setAddons(data);
      } catch (error) {
        console.error("Error fetching add-ons:", error);
      }
    };
    fetchAddOns();
    window.scrollTo(0, 300)
  }, []);

  const handleAddOnChange = (addon) => {
    const isSelected = selectedAddOns.includes(addon.id);

    setSelectedAddOns((prev) =>
      isSelected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
    );

    // Adjust total price
    setTotalPrice((prevTotal) =>
      isSelected
        ? Number(prevTotal) - Number(addon.price) // removing
        : Number(prevTotal) + Number(addon.price) // adding
    );

    setAddOnsDetails((prev) =>
      isSelected ? prev.filter((item) => item.id !== addon.id) : [...prev, addon]
    );
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      add_ons: selectedAddOns,
    }));
  }, [selectedAddOns, setFormData]);

  useEffect(() => {
    setBookingData((prev) => ({
      ...prev,
      carFlightDetails: {
        ...prev.carFlightDetails,
        addOnsDetails: addOnsDetails,
      },
    }));
  }, [addOnsDetails, setBookingData]);

  // Validation function
  const validateInputs = () => {
    if (!formData.car_registration_no || !formData.car_model || !formData.car_colour || !formData.car_manufacturer) {
      setError("Please fill in all required fields.");
      setIsPopupOpen(true);
      return false;
    }
    if (totalPrice <= 0) {
      setError("Invalid price calculation");
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
        <div className="row">
            <div style={{width:"50%"}} className="col">
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
            <div style={{width:"50%"}} className="col">
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
        <div className="row">
            <div style={{width:"50%"}} className="col">
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
            <div style={{width:"50%"}} className="col">
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

        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "5px", marginTop: "20px" }}>Extra Services:</h2>
        <p style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>Select any additional services you would like to add:</p>
        {addons.map((addon) => (
            <div
                key={addon.id}
                style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "10px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Add shadow for better card appearance
                }}
            >
                <div style={{ flex: "1" }}>
                <h6 style={{ margin: "0 0 5px 0", color: "#010659", fontWeight: "bold" }}>{addon.name.toUpperCase()}</h6>
                <p style={{ margin: "0 0 5px 0", color: "#555", fontSize: "14px" }}>{addon.description}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                <p
                    style={{
                    
                    fontWeight: "bold",
                    fontSize: "15px", // Larger font size for prominence
                    color: "#2890cd", // Distinct color for price
                    width: "120px",
                    margin: "0 auto",
                    textAlign: "center",
                    }}
                >
                    €{addon.price}
                </p>
                <input
                    type="checkbox"
                    id={`addon-${addon.id}`}
                    checked={selectedAddOns.includes(addon.id)}
                    onChange={() => handleAddOnChange(addon)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", marginTop: "10px" }}
                />
                </div>
            </div>
        ))}
      </div>
      <input type="button" className="next action-button" value="Next" onClick={handleNext} style={nextButtonStyle} />
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