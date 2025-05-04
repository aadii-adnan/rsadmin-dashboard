import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import "./App.css";
import { BookingProvider } from "./context/BookingContext"; 
import "./BookingForm.css";
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
   <BookingProvider>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
    </BookingProvider>
  </AuthProvider>
);