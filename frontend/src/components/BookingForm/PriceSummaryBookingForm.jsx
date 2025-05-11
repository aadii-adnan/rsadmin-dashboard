import React, { useEffect, useState } from 'react';
import { useBooking } from "../../context/BookingContext";
import { Link } from 'react-router-dom';

const PriceSummaryBookingForm = ({ serviceDetails, totalPrice, price, perDayPrice, setCouponId, discountedPrice, setDiscountedPrice, addOnsDetails }) => {
    const { bookingData } = useBooking();
    const [discount, setDiscount] = useState(0); 
    const [amountSaved, setAmountSaved] = useState(0); 
    const [isCouponApplied, setIsCouponApplied] = useState(false); 
    const [coupon, setCoupon] = useState(""); 

  const calculateDiscountedPrice = async () => {
    
      try {      
          if(bookingData?.paymentDetails?.discount > 0){
            const discountPercentage = bookingData?.paymentDetails?.discount;
            const savedAmount = (totalPrice * discountPercentage) / 100;
          
            setCouponId(bookingData?.paymentDetails?.couponId); 
            setCoupon(bookingData?.paymentDetails?.coupon)
            setDiscount(discountPercentage);
            setAmountSaved(savedAmount);
            setDiscountedPrice(totalPrice - savedAmount); 
            setIsCouponApplied(true);            
          }      
        
      } catch (error) {
        alert("An error occurred while calculating the amounts.");
      }
  };

  useEffect(() => {
    calculateDiscountedPrice();
  }, [totalPrice])

  return (
    <div className='price-summary' style={{ height: "fit-content", backgroundColor: "#fff", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)", padding: "20px", marginTop: "30px" }}>
      <div className="panel panel-default">
        <div className="panel-body">
          <div className="row">
            <h5 className="pt-1 cl" style={{ fontSize: "18px", fontWeight: "bold", color: "#010659", marginBottom: "15px", textAlign: "center" }}>{serviceDetails?.name || "Loading..."}</h5>
          </div>

          {/* Modern Separator */}
          <div className="separator mb-3 mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginRight: "5px" }}></span>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#2890cd" }}></span>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginLeft: "5px" }}></span>
          </div>

          {/* Arrival and Departure Dates */}
          <div>
            <div className="row mt-2">
              <div className="col">
                <h6 className="mb-3" style={{ fontSize: "14px", color: "#555" }}>
                  <span className="text-grey" style={{ fontWeight: "bold" }}>From:</span>{" "}
                  <span className="green" style={{ color: "#2890cd" }}>{new Date(bookingData?.bookingDates?.parkingFromDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}, {bookingData?.bookingDates?.parkingFromTime}</span>
                </h6>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <h6 className="m-0" style={{ fontSize: "14px", color: "#555" }}>
                  <span className="text-grey" style={{ fontWeight: "bold" }}>To:</span>{" "}
                  <span className="green" style={{ color: "#2890cd" }}>{new Date(bookingData?.bookingDates?.carCollectionDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}, {bookingData?.bookingDates?.carCollectionTime}</span>
                </h6>
              </div>
            </div>

            {/* Modern Separator */}
            <div className="separator mb-3 mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginRight: "5px" }}></span>
              <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#2890cd" }}></span>
              <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginLeft: "5px" }}></span>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="row">
            <div className="col">
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
                Base Price:{" "}
                <span id="parkingPrice" style={{ fontWeight: "bold", color: "#2890cd" }}>€{price}</span>
              </h6>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
                Price Per Day:{" "}
                <span style={{ fontWeight: "bold", color: "#2890cd" }}>€{serviceDetails?.per_day_price}</span>
              </h6>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
                Price for {bookingData?.paymentDetails?.noOfDays} day(s):{" "}
                <span style={{ fontWeight: "bold", color: "#2890cd" }}>{bookingData?.paymentDetails?.noOfDays} day(s) X €{serviceDetails?.per_day_price} = €{perDayPrice}</span>
              </h6>
            </div>
          </div>
          

          {/* Modern Separator */}
          <div className="separator mb-3 mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginRight: "5px" }}></span>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#2890cd" }}></span>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginLeft: "5px" }}></span>
          </div>

          {addOnsDetails.length > 0 && (<>          
            <h6 className="pt-1 cl" style={{ fontSize: "14px", fontWeight: "bold", color: "#010659", marginBottom: "15px", textAlign: "center" }}>Add Ons</h6>

            {addOnsDetails.map((addon) => (
              <div key={addon.id} className="row">
                <div className="col">
                  <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
                    {addon.name}:{" "}
                    <span style={{ fontWeight: "bold", color: "#2890cd" }}>€{addon.price}</span>
                  </h6>
                </div>
              </div>
            ))}
            
            {/* Modern Separator */}
            <div className="separator mb-3 mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginRight: "5px" }}></span>
              <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#2890cd" }}></span>
              <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginLeft: "5px" }}></span>
            </div>
          </>
          )}          

          {/* Discount Details */}
          {discount > 0 && (
            <div className="row">
              <div className="col">
                <h6 style={{ fontSize: "14px", color: "#010659", marginBottom: "10px" }}>
                  Coupon:{" "}
                  <span style={{ color: "#2890cd" }}>{coupon}</span>
                </h6>
                <h6 style={{ fontSize: "14px", color: "#010659", marginBottom: "20px" }}>
                  Amount Saved:{" "}
                  <span style={{ color: "#2890cd" }}>€{amountSaved.toFixed(2)}</span>
                </h6>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col">
              <h5 className="prices" style={{ fontSize: "16px", fontWeight: "bold", color: "#010659", marginBottom: "15px" }}>
                Total to pay:{" "}
                <span style={{ color: "#2890cd" }}>€{isCouponApplied ? discountedPrice.toFixed(2) : totalPrice.toFixed(2)}</span>
              </h5>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <p className="by-details" style={{ fontSize: "12px", color: "#555" }}>
                By reserving parking you agree to our booking{" "}
                <Link to={"/terms-and-conditions"} data-bs-toggle="modal" data-bs-target="#exampleModal" style={{ color: "#2890cd", textDecoration: "underline" }}>terms and conditions</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceSummaryBookingForm;