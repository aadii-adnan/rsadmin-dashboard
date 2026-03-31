import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import CustomerDashboard from "./pages/CustomerDashboard";
import Login from "./pages/Login";
import FinanceDashboard from "./pages/FinanceDashboard";
import BlogList from "./pages/BlogList";
import BlogDetail from "./pages/BlogDetail";
import BlogDashboard from "./components/FinanceDashboard/BlogAdmin/BlogDashboard";
import BlogPostForm from "./components/FinanceDashboard/BlogAdmin/BlogPostForm";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import SitemapPage from "./pages/SitemapPage";
import { useLocation } from "react-router-dom";

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  logout();
  navigate("/");

  return null; 
}

function App() {
  const location = useLocation();
  const hideHeaderFooter =
    location.pathname.startsWith("/finance-dashboard") ||
    location.pathname.startsWith("/blog-admin");
  
  return (
    <>
      <CookieBanner />
      {!hideHeaderFooter && <Header />}   
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book/:slug" element={<BookingForm />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/terms-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/services/standard-meet-and-greet-parking" element={<Home />} />
        <Route path="/services/flexible-meet-and-greet-parking" element={<Home />} />
        <Route path="/book-now-flexible" element={<Home />} />
        <Route path="/book-now-standard" element={<Home />} />
        <Route path="/book-now" element={<Home />} />
        <Route path="/dublin-airport-parking-offer" element={<Home />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sitemap.html" element={<SitemapPage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="/:slug" element={<BlogDetail />} />

        {/* Admin Routes — wrapped in AdminLayout for persistent AdminNavbar */}
        <Route element={<AdminLayout />}>
          <Route path="/finance-dashboard" element={<FinanceDashboard />} />
          <Route path="/blog-admin" element={<BlogDashboard />} />
          <Route path="/blog-admin/create" element={<BlogPostForm />} />
          <Route path="/blog-admin/edit/:id" element={<BlogPostForm />} />
        </Route>

        {/* Legacy redirects */}
        <Route path="/finance-dashboard/blogs" element={<Navigate to="/blog-admin" replace />} />
        <Route path="/finance-dashboard/blogs/create" element={<Navigate to="/blog-admin/create" replace />} />
        <Route path="/finance-dashboard/blogs/edit/:id" element={<Navigate to="/blog-admin" replace />} />
        <Route path="/finance-dashboard/blog/create" element={<Navigate to="/blog-admin/create" replace />} />
        <Route path="*" element={<NotFound404/>} />
      </Routes>
      {!hideHeaderFooter && <Footer />}
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