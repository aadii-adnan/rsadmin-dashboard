import React from 'react'
import { PhoneInput } from 'react-international-phone';
import customFetch from "../../auth/fetch"
import { useBooking } from "../../context/BookingContext";
import 'react-international-phone/style.css';

const Step2BookingForm = ({labelStyle, inputStyle, formData, handleChange, contactNo, setContactNo,  nextButtonStyle, serviceDetails, couponId, discountedPrice, totalPrice, goNext, statuses, goBack, prevButtonStyle, setFormData}) => {

    const { bookingData: { bookingDates: { parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }, }, } = useBooking();

    const handleBooking = async (e) => {
        try {
            e.preventDefault();

            const statusId = statuses.find((status) => status.name === formData.status)?.id;

            if (!statusId) {
                alert("Invalid status selected.");
                return;
            }

            const response = await customFetch("http://localhost:8000/api/bookings/", {
                method: "POST",
                body: {
                ...formData,
                service: serviceDetails.id,
                user: JSON.parse(localStorage.getItem("user")).id,
                contact_no: contactNo,
                departure_time: parkingFromDate + " " + parkingFromTime,
                return_time: carCollectionDate + " " + carCollectionTime,
                coupon: couponId,
                discounted_price : discountedPrice,                
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
                alert("Booking created successfully!");
                goNext();
            } else {
                alert(data.message || "An error occurred.");
            }
        } catch (error) {
            console.error("Error creating booking:", error);
        }
    };

  return (
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
                    <label style={labelStyle}>Total Passengers: *</label>
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
        <input type="button" className="next action-button" value="Next" onClick={handleBooking} style={nextButtonStyle} />
        <input type="button" className="previous action-button-previous" value="Previous" onClick={goBack} style={prevButtonStyle} />
    </fieldset>
  )
}

export default Step2BookingForm