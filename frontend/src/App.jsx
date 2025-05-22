import { Routes, Route, useNavigate } from "react-router-dom";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Header from "./components/Utility/Header";
import Footer from "./components/Utility/Footer"; 
import BookingForm from "./pages/BookingForm";
import { useAuth } from './auth/AuthContext';
import ContactUs from "./pages/ContactUs";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookieBanner from "./components/Utility/CookieBanner";
import { FloatingWhatsApp } from 'react-floating-whatsapp';
import avatar from "./assets/avatar.png";
import 'react-toastify/dist/ReactToastify.css';
import NotFound404 from "./pages/NotFound404";
import ThankYouPage from "./pages/ThankYouPage";

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  logout();
  navigate("/");

  return null; 
}

function App() {
  
  return (
    <>
      <CookieBanner />
      <Header />       
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book/:slug" element={<BookingForm />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/terms-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<NotFound404/>} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/services/standard-meet-and-greet-parking" element={<Home />} />
        <Route path="/services/flexible-meet-and-greet-parking" element={<Home />} />
      </Routes>
      <Footer />
      <FloatingWhatsApp
        phoneNumber="353834896505"
        accountName="Meet & Greet"
        chatMessage="Hi! How can we help you?"
        placeholder="Type your message..."
        avatar={avatar}
        statusMessage="Typically replies immediately"
        allowClickAway={true}
        notification={true} 
        notificationSound={true}
      />      
    </>
  );
}

export default App;