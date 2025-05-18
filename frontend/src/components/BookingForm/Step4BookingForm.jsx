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
        
        <div className="row justify-content-center">
            <div className="col-md-7 text-center">
            <h5 className="purple-text text-center" style={{ fontSize: "18px", fontWeight: "bold", color: "rgb(1, 6, 89)", marginTop: "20px" }}>
                Your Payment is still processing. We'll email you with the invoice once confirmed.<br />                
            </h5>
            <p className="text-center" style={{ fontSize: "16px", color: "#555", marginTop: "10px" }}>
                Thank you for choosing our service. We look forward to serving you!
            </p>
            <p className="text-center" style={{ fontSize: "16px", color: "#555", marginTop: "10px" }}>
                If you have any questions, feel free to contact us at <strong> support@rsexpressparking.com </strong>
            </p>
            
            </div>
            
        </div>
        </div>
    </fieldset>
  )
}

export default Step4BookingForm