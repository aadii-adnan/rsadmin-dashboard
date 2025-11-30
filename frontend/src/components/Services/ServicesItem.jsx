import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import flexible from '../../assets/service.jpg';
import standard from "../../assetsparking2.webp"
import "../../BookingForm.css";
import { useNavigate } from 'react-router-dom';

const ServicesItem = ({ service, openModal, index, setPopupMessage, setIsPopupOpen }) => {
  const { bookingData, setBookingData } = useBooking();
  const [amountSaved, setAmountSaved] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [price, setPrice] = useState(0);
  const navigate = useNavigate();

  const handleBookNow = async () => {
    // Get selected drop-off date from bookingData
    const bookingDates = bookingData?.bookingDates;
    if (!bookingDates?.parkingFromDate) {
      setPopupMessage("Please select your drop-off date and time first.");
      setIsPopupOpen(true);
      return;
    }

    // Fetch order limit for this service and date
    const bookingDate = bookingDates.parkingFromDate;
    const serviceSlug = service.slug;
    const limitRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/core/order-limit/?date=${bookingDate}&service=${serviceSlug}`);
    const limitData = await limitRes.json();

    if (limitData.max_orders !== null && limitData.max_orders !== -1) {
      // Fetch current order count
      const countRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/core/orders-count/?date=${bookingDate}&service=${serviceSlug}`);
      const countData = await countRes.json();
      if (countData.count >= limitData.max_orders) {
        setPopupMessage("Sorry, we are fully booked for this service on the selected date.");
        setIsPopupOpen(true);
        return;
      }
    }

    setBookingData({
      ...bookingData,
      bookingDetails: {
        ...bookingData?.bookingDetails,
        service: service.name,
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

  const imageSrc = service.image
  ? `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${service.image}`
  : (index === 0 ? standard : flexible);

  return (
    <div className='service-card'
      key={service.id}
      style={{
        opacity: service.enabled ? 1 : 0.6,
        pointerEvents: 'auto'
      }}
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
      <div className='service-card-image' style={{width: '-webkit-fill-available'}}>
        <img
          src={imageSrc}
          alt={service.name}
          style={{
            width: '100%',
            height: '210px',
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
                backgroundColor: service.enabled ? '#010659' : '#aaa',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.3s ease',
                cursor: service.enabled ? 'pointer' : 'not-allowed',
                opacity: service.enabled ? 1 : 0.7
              }}
              onClick={service.enabled ? handleBookNow : undefined}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#0056b3')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#010659')}
              disabled={!service.enabled}
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
        {!service.enabled && (
          <div
            style={{
              marginTop: '20px',
              textAlign: 'right',
              background: '#ffeaea',
              color: '#e53935',
              fontSize: '15px',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid #e53935',
              display: 'inline-block',
              letterSpacing: '0.5px'
            }}
          >
            Not Available
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesItem;