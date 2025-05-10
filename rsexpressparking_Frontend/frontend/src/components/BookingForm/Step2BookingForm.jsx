import React, {useState, useEffect} from 'react'
import { PhoneInput } from 'react-international-phone';
import customFetch from "../../auth/fetch"
import { useBooking } from "../../context/BookingContext";
import 'react-international-phone/style.css';
import PopupDialog from "../Utility/PopupDialog";

const Step2BookingForm = ({labelStyle, inputStyle, formData, handleChange, contactNo, setContactNo,  nextButtonStyle, serviceDetails, couponId, discountedPrice, totalPrice, goNext, statuses, goBack, prevButtonStyle, setFormData}) => {

    const { setBookingData, bookingData: { bookingDates: { parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }, userDetails}, } = useBooking();
    const [error, setError] = useState(""); // State to store validation error messages
    const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup
    const [loading, setLoading] = useState(false); // Loading state

    const validateInputs = () => {
        if (!formData.departure_terminal || !formData.return_terminal || !formData.departure_flight_number || !formData.return_flight_number || !formData.first_name || !formData.last_name || !formData.email || !contactNo=="+353") {
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

    const handleBooking = async (e) => {
        try {
            e.preventDefault();
            setLoading(true); // Set loading state to true
            if(!validateInputs())                
                return;

            const statusId = statuses.find((status) => (status.name === formData.status_name) && status.type === "booking")?.id;

            if (!statusId) {
                alert("Invalid status selected.");
                return;
            }

            if (!parkingFromDate || !carCollectionDate) {
                throw new Error("Invalid booking dates");
            }
            
            const response = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/bookings/`, {
                method: "POST",
                body: {
                ...formData,
                service: serviceDetails.id,
                user: userDetails?.id,
                contact_no: contactNo,
                departure_time: parkingFromDate + " " + parkingFromTime,
                return_time: carCollectionDate + " " + carCollectionTime,
                coupon: couponId,
                discounted_price : discountedPrice==0 ? totalPrice : discountedPrice,                
                total_price: totalPrice,
                status: statusId
                },
            });
            const data = await response.json();
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
                    }
                }));             
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
            console.error("Error creating booking:", error);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 300);
      }
    , []);

  return (
    <>
    <fieldset className="fieldset active">
        <div className="form-card">
            
            <div className="row">
                <div className="col-7">
                    <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
                    Flight Details:
                    </h2>
                </div>                       
            </div>
            <div className="row">
                <div className="col" style={{ width: "50%", paddingRight: "10px" }}>
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
                <div className="col" style={{ width: "50%", paddingLeft: "10px" }}>
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

                <div className="row">
                <div className="col" style={{ width: "50%", paddingRight: "10px" }}>
                    <label style={labelStyle}>Departure Flight Number: *</label>
                    <input className='custom-input'
                    type="text"
                    name="departure_flight_number"
                    placeholder="Dep Flight Number"
                    style={inputStyle}
                    value={formData?.departure_flight_number}
                    onChange={handleChange}
                    />
                </div>
                <div className="col" style={{ width: "50%", paddingLeft: "10px" }}>
                    <label style={labelStyle}>Return Flight Number: *</label>
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

            <div className="row">
                <div className="col-7">
                    <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
                    Your Details:
                    </h2>
                </div>                       
            </div>

            <div className="row">
                <div className="col" style={{ width: "50%", paddingRight: "10px" }}>
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
                <div className="col" style={{ width: "50%", paddingLeft: "10px" }}>
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

            <div className="row">
                <div className="col" style={{ width: "50%", paddingRight: "10px" }}>
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
                <div className="col" style={{ width: "50%", paddingRight: "10px" }}>
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

            <div className="row">
                <div className="col" style={{ width: "50%", paddingLeft: "10px", marginBottom: "10px" }}>
                    <label style={labelStyle}>Contact No: *</label>
                    <PhoneInput
                    defaultCountry="ie"
                    value={contactNo}
                    onChange={(phone) => setContactNo(phone)}
                    />
                </div>
            </div>

        </div>
        <input type="button" className="next action-button" value={loading ? "loading..." : "Next"} onClick={async(e) => {await handleBooking(e); setLoading(false);}} style={nextButtonStyle} />
        <input type="button" className="previous action-button-previous" value="Previous" onClick={goBack} style={prevButtonStyle} />
    </fieldset>

    {/* Popup Dialog */}
    <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title=""
        message={error}
      />
    </>
  )
}

export default Step2BookingForm