import React, { useState } from 'react';
import customFetch from '../../auth/fetch';
import { useBooking } from "../../context/BookingContext";

const PriceSummaryBookingForm = ({ serviceDetails, totalPrice, price, perDayPrice, setCouponId, discountedPrice, setDiscountedPrice }) => {
    const { bookingData } = useBooking();
    const [discount, setDiscount] = useState(0); // State to store the discount percentage
    const [amountSaved, setAmountSaved] = useState(0); // State to store the amount saved
    const [isCouponApplied, setIsCouponApplied] = useState(false); // State to track if a coupon is applied
    const [coupon, setCoupon] = useState(""); // State to store the coupon code

  const handleApplyCoupon = async () => {
    if (isCouponApplied) {
      // Remove coupon logic
      setCoupon("");
      setDiscount(0);
      setAmountSaved(0);
       (totalPrice + amountSaved); // Reset the total price
      setIsCouponApplied(false);
      alert("Coupon removed.");
    } else {
      // Apply coupon logic
      try {
        if(!coupon) {
          alert("Please enter a coupon code.");
          return;
        }
        const response = await customFetch("http://localhost:8000/api/services/coupons/validate/", {
          method: "POST",
          body: { code : coupon.trim() },
        });
        const data = await response.json();

        if (response.ok) {
          const discountPercentage = data.discount_percent; // Assume the API returns a discount percentage
          const savedAmount = (totalPrice * discountPercentage) / 100;
          console.log(data.id)
          setCouponId(data.id); // Store the coupon ID for later use
          setDiscount(discountPercentage);
          setAmountSaved(savedAmount);
          setDiscountedPrice(totalPrice - savedAmount); // Update the total price
          setIsCouponApplied(true);
          alert(`Coupon applied! You saved €${savedAmount.toFixed(2)}.`);
        } else {
          alert(data.message || "Invalid coupon code.");
        }
      } catch (error) {
        console.error("Error validating coupon:", error);
        alert("An error occurred while applying the coupon.");
      }
    }
  };

  return (
    <div style={{ height: "fit-content", width: "30%", maxWidth: "400px", backgroundColor: "#fff", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)", padding: "20px", marginTop: "30px", marginLeft: "20px" }}>
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
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                Base Price:{" "}
                <span id="parkingPrice" style={{ fontWeight: "bold", color: "#2890cd" }}>€{price}</span>
              </h6>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                Price Per Day:{" "}
                <span style={{ fontWeight: "bold", color: "#2890cd" }}>€{serviceDetails?.per_day_price}</span>
              </h6>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
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

          {bookingData?.carFlightDetails?.addOnsDetails?.length > 0 && (<>          
            <h6 className="pt-1 cl" style={{ fontSize: "14px", fontWeight: "bold", color: "#010659", marginBottom: "15px", textAlign: "center" }}>Add Ons</h6>

            {bookingData?.carFlightDetails?.addOnsDetails?.map((addon) => (
              <div key={addon.id} className="row">
                <div className="col">
                  <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                    {addon.name}:{" "}
                    <span style={{ fontWeight: "bold", color: "#2890cd" }}>€{addon.price}</span>
                  </h6>
                </div>
              </div>
            ))}</>
          )}
          

          {/* Coupon Section */}
          {localStorage.getItem('access_token') && (<div className="row">
            <div className="col">
                <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                <input type="text" id="coupon" name="coupon" placeholder="Enter coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} style={{ flex: "1", padding: "10px", borderRadius: "5px 0 0 5px", border: "1px solid #ccc", borderRight: "none", }} disabled={isCouponApplied} />
                <button onClick={handleApplyCoupon} style={{ padding: "10px 20px", backgroundColor: isCouponApplied ? "#ff4d4d" : "#2890cd", color: "#fff", border: "none", borderRadius: "0 5px 5px 0", cursor: "pointer", fontWeight: "bold"}}>
                    {isCouponApplied ? "Remove" : "Apply"}
                </button>
                </div>
            </div>
        </div>)}

          {/* Discount Details */}
          {discount > 0 && (
            <div className="row">
              <div className="col">
                <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                  Discount Applied:{" "}
                  <span style={{ fontWeight: "bold", color: "#2890cd" }}>{discount}%</span>
                </h6>
                <h6 style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                  Amount Saved:{" "}
                  <span style={{ fontWeight: "bold", color: "#2890cd" }}>€{amountSaved.toFixed(2)}</span>
                </h6>
              </div>
            </div>
          )}

          {/* Modern Separator */}
          <div className="separator mb-3 mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginRight: "5px" }}></span>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#2890cd" }}></span>
            <span style={{ display: "inline-block", width: "40px", height: "2px", backgroundColor: "#2890cd", marginLeft: "5px" }}></span>
          </div>

          <div className="row">
            <div className="col">
              <h5 className="prices" style={{ fontSize: "16px", fontWeight: "bold", color: "#010659", marginBottom: "15px" }}>
                Total to pay:{" "}
                <span style={{ color: "#2890cd" }}>€{isCouponApplied ? discountedPrice : totalPrice}</span>
              </h5>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <p className="by-details" style={{ fontSize: "12px", color: "#555" }}>
                By reserving parking you agree to our booking{" "}
                <a href="#" data-bs-toggle="modal" data-bs-target="#exampleModal" style={{ color: "#2890cd", textDecoration: "underline" }}>terms and conditions</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceSummaryBookingForm;