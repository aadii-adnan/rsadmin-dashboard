// src/context/BookingContext.js
import { createContext, useContext, useState, useEffect } from "react";

const BookingContext = createContext();

export const useBooking = () => useContext(BookingContext);

const defaultState = {
  bookingDates: {},
  selectedOption: null,
  userDetails: {},
  carFlightDetails: { addOnsDetails : []},
  paymentDetails: {},
  bookingDetails: {},
};

export const BookingProvider = ({ children }) => {
  const [bookingData, setBookingData] = useState(() => {
    const saved = localStorage.getItem("bookingData");
    return saved ? JSON.parse(saved) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem("bookingData", JSON.stringify(bookingData));
  }, [bookingData]);

  return (
    <BookingContext.Provider value={{ bookingData, setBookingData }}>
      {children}
    </BookingContext.Provider>
  );
};
