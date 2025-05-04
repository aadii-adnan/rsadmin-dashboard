import React, { useState, useEffect } from "react";
import parkingImg from "../assets/parking.webp";
import { useParams } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import PriceSummaryBookingForm from "../components/BookingForm/PriceSummaryBookingForm";
import Step0BookingForm from "../components/BookingForm/Step0BookingForm";
import Step1BookingForm from "../components/BookingForm/Step1BookingForm";
import Step2BookingForm from "../components/BookingForm/Step2BookingForm";
import Step3BookingForm from "../components/BookingForm/Step3BookingForm";
import Step4BookingForm from "../components/BookingForm/Step4BookingForm";


const steps = [
  { id: "account", label: "Account" },
  { id: "car", label: "Car Details" },
  { id: "flight", label: "Flight Details" },
  { id: "payment", label: "Payment" },
//   { id: "confirm", label: "Success" },
];

const BookingForm = () => {
    const { slug } = useParams();
    const { bookingData } = useBooking();
    const [currentStep, setCurrentStep] = useState(0);
    const [serviceDetails, setServiceDetails] = useState(null);
    const [price, setPrice] = useState(0);
    const [perDayPrice, setPerDayPrice] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [discountedPrice, setDiscountedPrice] = useState(0); 
    const [contactNo, setContactNo] = useState('');
    const [statuses, setStatuses] = useState([]); // State to store statuses
    const [couponId, setCouponId] = useState(null); // State to store coupon ID
    
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        password: "",
        car_registration_no: "",
        car_model: "",
        car_colour: "",
        car_manufacturer: "",
        departure_terminal: "",
        return_terminal: "",
        departure_flight_number: "",
        return_flight_number: "",
        total_passengers: "",
        card_number: "",
        card_name: "",
        expiry_month: "",
        expiry_year: "",
        cvv: "",
        booking_id : '',
        add_ons : [],
        status: "Pending",
      });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

    const progressPercent = ((currentStep + 1) / steps.length) * 100;

    const labelStyle = { fontWeight: "bold", color: "#555" };
    const inputStyle = {
        width: "100%",
        padding: "10px",
        marginBottom: "15px",
        borderRadius: "5px",
        border: "1px solid #ccc",
    };
    const buttonStyle = {
        padding: "10px 20px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        marginTop: "20px",
    };
    const nextButtonStyle = { ...buttonStyle, backgroundColor: "#2890cd", color: "#fff" };
    const prevButtonStyle = { ...buttonStyle, backgroundColor: "#ccc", color: "#555", marginLeft: "10px" };

    const fetchStatuses = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/core/statuses/"); 
            const data = await response.json();
            setStatuses(data); 
        } catch (error) {
            console.error("Error fetching statuses:", error);
        }
    };

    const fetchServiceDetails = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/services/${slug}`); 
          const data = await response.json();
          setServiceDetails(data);
          setPrice(Number(data.base_price));

          const no_of_days = bookingData?.paymentDetails?.noOfDays;
          setPerDayPrice(data.per_day_price * no_of_days); 

        } catch (error) {
          console.error("Error fetching service details:", error);
        }
    };

    useEffect(() => {
        fetchServiceDetails();
        fetchStatuses();

        if(localStorage.getItem("user")) {
            const user = JSON.parse(localStorage.getItem("user"));
            setFormData((prev) => ({
                ...prev,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                username: user.username,
            }));
            setCurrentStep(1);
        }

    }, [slug]);
    
      // Calculate total price whenever price or booking fee changes
      useEffect(() => {
        setTotalPrice(price + perDayPrice); 
      }, [price, perDayPrice]);


    return (
    <>
    <div
      className="form-banner d-flex flex-column justify-content-center align-items-center text-white text-center"
      style={{ backgroundImage: `url(${parkingImg})`, backgroundRepeat: "no-repeat", backgroundPosition: "0 -70px", backgroundSize: "cover", height: "350px", backgroundBlendMode: "overlay", backgroundColor: "#0106597d"}}
    >
      <h1 style={{fontWeight:700}} className="display-4">Convenient Meet & Greet Parking</h1>
      <h6 style={{fontWeight:500}} className="lead">Enjoy stress-free airport parking with our secure, affordable meet & greet service. Quick drop-off and pickup at Dublin Airport.</h6>
    </div>

    <div style={{  backgroundColor: "#f5f4ee",  padding: "50px 0",  minHeight: "100vh",}} className="container-fluid">
      <div className="row mx-0 justify-content-center">
        <div style={{ width: "60%", maxWidth: "1000px", backgroundColor: "#fff", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)", padding: "30px 40px", marginTop: "30px"}} className="text-center">
            <h2 id="heading" style={{   fontSize: "24px",   fontWeight: "bold",   color: "#010659",   marginBottom: "20px", }}>{serviceDetails?.name}</h2>
            <p style={{ color: "#555", marginBottom: "30px" }}>Fill all form fields to go to the next step</p>

            <ul id="progressbar" style={{   display: "flex",   justifyContent: "space-between",   listStyle: "none",   padding: "0",   marginBottom: "30px", }}>
                {steps.map((step, idx) => (
                <li key={step.id} style={{   flex: "1",   textAlign: "center",   fontWeight: idx <= currentStep ? "bold" : "normal",   color: idx <= currentStep ? "#2890cd" : "#ccc", }}>
                    <strong>{step.label}</strong>
                </li>
                ))}
            </ul>

            <div className="progress" style={{   height: "10px",   backgroundColor: "#e0e0e0",   borderRadius: "5px",   overflow: "hidden",   marginBottom: "30px", }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{   width: `${progressPercent}%`,   backgroundColor: "#2890cd", }}/>
            </div>

            <form id="msform">
                {currentStep === 0 && <Step0BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} setFormData={setFormData} goNext={goNext} nextButtonStyle={nextButtonStyle} />}

                {currentStep === 1 && <Step1BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} goNext={goNext} nextButtonStyle={nextButtonStyle} setFormData={setFormData} setTotalPrice={setTotalPrice} />}

                {currentStep === 2 && <Step2BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} nextButtonStyle={nextButtonStyle} contactNo={contactNo} setContactNo={setContactNo} serviceDetails={serviceDetails} couponId={couponId} totalPrice={totalPrice} discountedPrice={discountedPrice} goNext={goNext} statuses={statuses} goBack={goBack} prevButtonStyle={prevButtonStyle} setFormData={setFormData}/>}

                {currentStep === 3 && <Step3BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} nextButtonStyle={nextButtonStyle} prevButtonStyle={prevButtonStyle} goNext={goNext} goBack={goBack} totalPrice={totalPrice} discountedPrice={discountedPrice} />}

                {currentStep === 4 && <Step4BookingForm />}

            </form>
        </div>

            <PriceSummaryBookingForm serviceDetails={serviceDetails} totalPrice={totalPrice} perDayPrice={perDayPrice} price={price} discountedPrice={discountedPrice} setDiscountedPrice={setDiscountedPrice} setCouponId={setCouponId}/>

        </div>
    </div>
           

        </>
   
  );
};

export default BookingForm;
