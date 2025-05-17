import React, { useEffect, useState } from 'react'
import { useBooking } from "../../context/BookingContext";
import { useRef } from 'react';

const Step4BookingForm = () => {
    const { bookingData } = useBooking();
    const booking_id = bookingData?.bookingDetails?.booking_id;
    const iframeRef = useRef(null);
    const [coupon, setCoupon] = useState("");

    const downloadInvoice = async() => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/invoice/${booking_id}/`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (!response.ok) {
            throw new Error("Failed to fetch invoice");
          }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
    
            // Set the iframe source
            iframeRef.current.src = url;
    
            // Wait for the iframe to load, then print
            iframeRef.current.onload = () => {
              iframeRef.current.contentWindow.focus();
              iframeRef.current.contentWindow.print();
            };
          
    
          } catch (error) {
            console.error("Error fetching invoice:", error);
          }
        }
    
    const getLatestCoupon = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/coupons/latest/`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            const data = await response.json();
            if (response.ok) {
                setCoupon(data.code);
            } else {
                console.error("Error fetching latest coupon:", data);
            }
        } catch (error) {
            console.error("Error fetching latest coupon:", error);
        }
    }

    useEffect(() => {
        getLatestCoupon();
    }, []);

  return (
    <fieldset className="fieldset active">
        <div className="form-card">
        
        {localStorage.getItem("payment_status") === "succeeded" && 
        <>
            <h2 className="purple-text text-center" style={{ fontSize: "24px", fontWeight: "bold", color: "rgb(1, 6, 89)", marginBottom: "20px" }}>
                SUCCESS!
            </h2>
            <div className="row justify-content-center">
                <div className="col-3">
                <img
                    src="https://i.imgur.com/GwStPmg.png"
                    className="fit-image"
                    alt="success"
                    style={{
                        height: "150px",
                        width: "auto",
                        borderRadius: "10px",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
                    }}
                />
                </div>
            </div>
        </>}
        <div className="row justify-content-center">
            <div className="col-md-7 text-center">
            {localStorage.getItem("payment_status") === "succeeded" ? <h5 className="purple-text text-center" style={{ fontSize: "18px", fontWeight: "bold", color: "rgb(1, 6, 89)", marginTop: "20px" }}>
                Your booking has been successfully completed!<br />                
            </h5>
            : <h5 className="purple-text text-center" style={{ fontSize: "18px", fontWeight: "bold", color: "rgb(1, 6, 89)", marginTop: "20px" }}>
                Your Payment is still processing. We'll email you with the invoice once confirmed.<br />                
            </h5>}
            <p className="text-center" style={{ fontSize: "16px", color: "#555", marginTop: "10px" }}>
                Thank you for choosing our service. We look forward to serving you!
            </p>
            <p className="text-center" style={{ fontSize: "16px", color: "#555", marginTop: "10px" }}>
                If you have any questions, feel free to contact us at <strong> support@rsexpressparking.com </strong>
            </p>
            {localStorage.getItem("payment_status") === "succeeded" && <button
                className="btn btn-primary mt-4"
                onClick={downloadInvoice}
                type="button"
                style={{
                backgroundColor: "rgb(1, 6, 89)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
                }}> Download Invoice</button>}
            <iframe ref={iframeRef} style={{ display: 'none' }} title="Invoice PDF" />
            </div>
            {(localStorage.getItem("payment_status") === "succeeded" && coupon) && <h5 className="purple-text text-center" style={{ fontSize: "18px", color: "rgb(1, 6, 89)", marginTop: "70px" }}>
                You can use the following code to get a discount on your next booking: <strong>{coupon}</strong>
            </h5>}
            
        </div>
        </div>
    </fieldset>
  )
}

export default Step4BookingForm