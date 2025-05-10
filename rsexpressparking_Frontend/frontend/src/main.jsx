import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import "./App.css";
import { BookingProvider } from "./context/BookingContext"; 
import "./ContactUs.css"
import 'bootstrap/dist/css/bootstrap.min.css';
import "./style.css"
import "./BookingForm.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <BookingProvider>
    <AuthProvider>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </AuthProvider>
  </BookingProvider>
);