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
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';

const steps = [
  { id: "account", label: "Account" },
  { id: "car", label: "Provide Details" },
  { id: "addons", label: "Add Ons" },
  { id: "payment", label: "Payment" },
//   { id: "confirm", label: "Success" },
];

const BookingForm = () => {
    const { slug } = useParams();
    const { bookingData, setBookingData } = useBooking();
    const [currentStep, setCurrentStep] = useState(0);
    const [serviceDetails, setServiceDetails] = useState(null);
    const [price, setPrice] = useState(0);
    const [perDayPrice, setPerDayPrice] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [discountedPrice, setDiscountedPrice] = useState(0); 
    const [contactNo, setContactNo] = useState('');
    const [statuses, setStatuses] = useState([]); // State to store statuses
    const [couponId, setCouponId] = useState(null); // State to store coupon ID
    const [selectedAddOns, setSelectedAddOns] = useState([]);
    const [addOnsDetails, setAddOnsDetails] = useState([]);
    const navigate = useNavigate();
    
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
        total_passengers: 0,
        card_number: "",
        card_name: "",
        expiry_month: "",
        expiry_year: "",
        cvv: "",
        booking_id : '',
        add_ons : [],
        status_name: "Pending",
      });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/core/statuses/`); 
            const data = await response.json();
            setStatuses(data); 
        } catch (error) {
            console.error("Error fetching statuses:", error);
        }
    };

    const fetchServiceDetails = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/${slug}`); 
          const data = await response.json();
          setServiceDetails(data);
          setPrice(Number(data.base_price));

          const no_of_days = bookingData?.paymentDetails?.noOfDays;
          setPerDayPrice(data.per_day_price * no_of_days); 

          if (bookingData?.bookingDetails?.booking_id > 0) {
            setTotalPrice(bookingData?.bookingDetails?.total_price);
            setAddOnsDetails(bookingData?.carFlightDetails?.addOnsDetails);
          }else{
            setTotalPrice(Number(data.base_price) + (data.per_day_price * no_of_days))
          }         

        } catch (error) {
          console.error("Error fetching service details:", error);
        }
    };

    useEffect(() => {
        fetchServiceDetails();
        fetchStatuses(); // Fetch statuses when the component mounts        
    }, [slug]);

    useEffect(() => {
        window.scrollTo(0, 300)
      }, []);

    useEffect(() => {
      let isMounted = true; // For cleanup
  
      const initializeBookingForm = async () => {
          try {
              
  
              // Get booking data from localStorage
              const storedBookingData = localStorage.getItem("bookingData");
              if (storedBookingData) {
                  const parsedData = JSON.parse(storedBookingData);
                  if (!parsedData?.bookingDates?.parkingFromDate || !parsedData?.bookingDates?.carCollectionDate) {
                      setBookingData((prev) => ({
                        ...prev,
                        bookingDates: null,
                        bookingDetails: null,
                        paymentDetails: null,
                      }));
                      alert("Please fill in the booking dates first.");
                      navigate("/");
                      return;
                  }
              }
  
              const bookingDetails = storedBookingData ? JSON.parse(storedBookingData).bookingDetails : null;
  
              if (bookingDetails?.booking_id && isMounted) {
                  try {
                      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bookings/${bookingDetails.booking_id}/`, {
                          method: "GET",
                          headers: {
                              "Content-Type": "application/json",
                          },
                        });

                      const booking = await response.json();
                      
                      if (booking && isMounted) {
                          setFormData(prev => ({
                              ...prev,
                              booking_id: bookingDetails.booking_id
                          }));

                          if (currentStep < 3 && localStorage.getItem("payment_status") !== "succeeded") {
                              setCurrentStep(3);
                          }else if (currentStep < 4 && localStorage.getItem("payment_status") === "succeeded") {
                              setCurrentStep(4);
                          }
                      } else {
                        setBookingData((prev) => ({
                            ...prev,
                            bookingDates: null,
                            bookingDetails: null,
                            paymentDetails: null,
                          }));
                      }
                  } catch (error) {
                      console.error("Error verifying booking:", error);
                      setBookingData((prev) => ({
                        ...prev,
                        bookingDates: null,
                        bookingDetails: null,
                        paymentDetails: null,
                      }));
                  }
              }
  
              // Handle logged-in user
              const storedUser = bookingData?.userDetails;
              if (storedUser?.id && isMounted) {
                  const user = storedUser;
                  setFormData(prev => ({
                      ...prev,
                      first_name: user.first_name,
                      last_name: user.last_name,
                      email: user.email,
                      username: user.username,                      
                  }));
                  setContactNo(user?.phone);
                  if (currentStep === 0) {
                      setCurrentStep(1);
                  }
              }
          } catch (error) {
              console.error("Error initializing booking form:", error);
          }
      };
  
      initializeBookingForm();
  
      // Cleanup function
      return () => {
          isMounted = false;
      };
  }, [currentStep]);


    return (
    <>
    <Helmet>
      <title>Book Dublin Airport Meet & Greet Parking Today</title>
      <meta name="description" content="Don’t wait! Reserve your meet and greet parking now for a stress-free, secure, and seamless start to your journey. Enjoy convenience, professional service."/>
      <meta name="robots" content="index, follow"/>
      <link rel="canonical" href="https://rsexpressparking.com/book/standard-meet-greet-parking/"/>
      <meta property="og:title" content="Book Now - RS Express Parking"/>
      <meta property="og:description" content="Reserve your Dublin Airport parking for a secure, hassle-free experience."/>
      <meta property="og:type" content="website"/>
      <meta property="og:url" content="https://rsexpressparking.com/book-now/"/>
      <meta property="og:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>
      <meta property="og:site_name" content="RS Express Parking"/>
      <meta property="og:locale" content="en_US"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:title" content="Book Now - RS Express Parking"/>
      <meta name="twitter:description" content="Secure your meet and greet parking spot at Dublin Airport now."/>
      <meta name="twitter:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>

    </Helmet>
    <div
      className="form-banner d-flex flex-column justify-content-center align-items-center text-white text-center booking-form-banner"
      style={{ backgroundImage: `url(${parkingImg})`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundBlendMode: "overlay", backgroundColor: "#0106597d"}}
    >
      <h1 style={{fontWeight:700}} className="display-5 display-md-4">Convenient Meet & Greet Parking</h1>
      <h6 style={{fontWeight:400}} className="lead d-none d-sm-block">Enjoy stress-free airport parking with our secure, affordable meet & greet service. Quick drop-off and pickup at Dublin Airport.</h6>
    </div>

    <div style={{ backgroundColor: "#f5f4ee", minHeight: "100vh"}} className="container-fluid" id="booking-form">
      <div className="row mx-0 justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6 text-center px-3 px-md-4 py-4 w-sm-95" style={{ backgroundColor: "#fff", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)", marginTop: "30px"}}>
            <h2 id="heading" style={{   fontSize: "24px",   fontWeight: "bold",   color: "#010659",   marginBottom: "20px", }}>{serviceDetails?.name}</h2>
            <p style={{ color: "#555", marginBottom: "30px" }}>Fill all form fields to go to the next step</p>

            <ul id="progressbar" className="d-flex flex-wrap justify-content-between list-unstyled mb-4 px-1">
              {steps.map((step, idx) => (
                <li
                  key={step.id}
                  className="flex-grow-1 text-center progressbar-item"
                  style={{
                    fontWeight: idx <= currentStep ? "bold" : "normal",
                    color: idx <= currentStep ? "#2890cd" : "#ccc",

                  }}>
                  <strong>{step.label}</strong>
                </li>
              ))}
            </ul>

            <div className="progress" style={{   height: "10px",   backgroundColor: "#e0e0e0",   borderRadius: "5px",   overflow: "hidden",   marginBottom: "30px", }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{   width: `${progressPercent}%`,   backgroundColor: "#2890cd", }}/>
            </div>

            <form id="msform">
                {currentStep === 0 && <Step0BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} setFormData={setFormData} goNext={goNext} nextButtonStyle={nextButtonStyle} contactNo={contactNo} setContactNo={setContactNo}/>}

                {currentStep === 1 && <Step1BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} goNext={goNext} nextButtonStyle={nextButtonStyle} goBack={goBack} prevButtonStyle={prevButtonStyle} contactNo={contactNo} setContactNo={setContactNo}/>}

                {currentStep === 2 && <Step2BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} nextButtonStyle={nextButtonStyle} contactNo={contactNo} setContactNo={setContactNo} serviceDetails={serviceDetails} couponId={couponId} totalPrice={totalPrice} discountedPrice={discountedPrice} goNext={goNext} statuses={statuses} goBack={goBack} prevButtonStyle={prevButtonStyle} setFormData={setFormData} addOnsDetails={addOnsDetails} setTotalPrice={setTotalPrice}  selectedAddOns={selectedAddOns} setSelectedAddOns={setSelectedAddOns} setAddOnsDetails={setAddOnsDetails}/>}

                {currentStep === 3 && <Step3BookingForm formData={formData} handleChange={handleChange} labelStyle={labelStyle} inputStyle={inputStyle} nextButtonStyle={nextButtonStyle} prevButtonStyle={prevButtonStyle} goNext={goNext} goBack={goBack} totalPrice={totalPrice} discountedPrice={discountedPrice} />}

                {currentStep === 4 && <Step4BookingForm />}

            </form>
        </div>

            <PriceSummaryBookingForm serviceDetails={serviceDetails} totalPrice={totalPrice} perDayPrice={perDayPrice} price={price} discountedPrice={discountedPrice} setDiscountedPrice={setDiscountedPrice} setCouponId={setCouponId} addOnsDetails={addOnsDetails}/>

        </div>
    </div>
           

        </>
   
  );
};

export default BookingForm;
