import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import flexible from '../../assets/service.jpg';
import standard from "../../assets/parking.jpg"
import "../../BookingForm.css";

const ServicesItem = ({ service, openModal, index }) => {
  const { bookingData } = useBooking();
  const [amountSaved, setAmountSaved] = useState(0);
  const [price, setPrice] = useState(0);

  function calculateTotalPrice() {
    const noOfDays = bookingData?.paymentDetails?.noOfDays || 0;
    const discount = bookingData?.paymentDetails?.discount || 0;
    const basePrice = Number(service?.base_price) || 0;
    const perDayPrice = Number(service?.per_day_price) || 0;

    if (discount > 0) {
      const discountAmount = (basePrice + perDayPrice * noOfDays) * (discount / 100);
      setAmountSaved(discountAmount);
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
      <div className='service-card-actions'
        
      >
        <div style={{marginBottom:"20px"}}>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#010659',
              marginBottom: '5px',
            }}
          >
            €{price.toFixed(2)}
          </p>
          {amountSaved > 0 && (
            <p
              style={{
                fontSize: '14px',
                color: '#28a745',
                fontWeight: 'bold',
                marginBottom: '15px',
              }}
            >
              You saved €{amountSaved.toFixed(2)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Link style={{ textDecoration: 'none' }} to={`/book/${service.slug}`}>
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
              onMouseOver={(e) => (e.target.style.backgroundColor = '#0056b3')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#010659')}
            >
              Book Now
            </div>
          </Link>
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