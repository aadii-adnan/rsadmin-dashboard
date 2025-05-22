import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import flexible from '../../assets/service.jpg';
import standard from "../../assets/parking.jpg"
import "../../BookingForm.css";
import { useNavigate } from 'react-router-dom';

const ServicesItem = ({ service, openModal, index }) => {
  const { bookingData, setBookingData } = useBooking();
  const [amountSaved, setAmountSaved] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [price, setPrice] = useState(0);
  const navigate = useNavigate();

  const handleBookNow = () => {
    setBookingData({
      ...bookingData,
      bookingDetails: {
        ...bookingData?.bookingDetails,
        service: service.name, // Set the service name
      },
    });
    navigate(`/book/${service.slug}`);
  };

  function calculateTotalPrice() {
    const noOfDays = bookingData?.paymentDetails?.noOfDays || 0;
    const discount = bookingData?.paymentDetails?.discount || 0;
    const basePrice = Number(service?.base_price) || 0;
    const perDayPrice = Number(service?.per_day_price) || 0;

    if (discount > 0) {
      const discountAmount = (basePrice + perDayPrice * noOfDays) * (discount / 100);
      setAmountSaved(discountAmount);
      setDiscountPercentage(discount)
      setPrice(basePrice + perDayPrice * noOfDays - discountAmount);
    } else {
      setPrice(basePrice + perDayPrice * noOfDays);
    }
  }

  useEffect(() => {
    calculateTotalPrice();
  }, []);

  const imageSrc = index === 0 ? standard : flexible;

  return (
    <div className='service-card'
      key={service.id}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.2)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
      }}
    >
      {/* Left Section: Image */}
      <div className='service-card-image'>
        <img
          src={imageSrc}
          alt={service.name}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '10px',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Middle Section: Service Details */}
      <div className='service-card-details'
        
      >
        <h2
          style={{
            color: '#010659',
            fontSize: '22px',
            marginBottom: '20px',
            fontWeight: '600',
          }}
        >
          {service.name}
        </h2>
        {service.description && (
          <div
            style={{
              color: '#555',
              fontSize: '14px',
              marginBottom: '15px',
              lineHeight: '1.6',
            }}
            dangerouslySetInnerHTML={{ __html: service.description }}
          ></div>
        )}
      </div>

      {/* Right Section: Price Details and Buttons */}
      <div className='service-card-actions'>
        <div className='service-card-price'>
          <p style={{   fontSize: '20px',   fontWeight: 'bold',   color: '#010659',   marginBottom: '5px', }}>  €{price.toFixed(2)}</p>
          {amountSaved > 0 && (
            <div style={{   display: 'flex',   flexDirection: 'row',   gap: '4px',   marginBottom: '15px',   justifyContent: "end" }}>
              <div style={{ fontSize: '14px', color: '#28a745', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  strokeWidth="2">
                  <path d="M12 5v14M5 12l7-7 7 7"/>
                </svg>
                You Save:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{ fontSize: '16px', color: '#28a745', fontWeight: 'bold'}}>
                  €{amountSaved.toFixed(2)}
                </span>
                <span style={{ fontSize: '13px', color: '#666', backgroundColor: '#e8f5e9', padding: '2px 6px', borderRadius: '4px', fontWeight: '500'}}>
                  {discountPercentage}% OFF
                </span>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <div
              style={{
                padding: '10px 20px',
                backgroundColor: '#010659',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.3s ease',
                cursor: 'pointer',
              }}
              onClick={handleBookNow}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#0056b3')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#010659')}
            >
              Book Now
            </div>
          <div
            onClick={() => openModal(service)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#ccc')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#e0e0e0')}
          >
            More Details
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesItem;