import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import { BookingProvider } from "./context/BookingContext"; 
import "./Home.css"; // Base theme (CSS variables, .btn-modern, Urbanist) — must load on every page, not just Home


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
