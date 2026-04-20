import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Utility/Header";
import Footer from "./components/Utility/Footer";
import { useAuth } from "./auth/AuthContext";
import CookieBanner from "./components/Utility/CookieBanner";
import avatar from "./assets/avatar.png";
import "react-toastify/dist/ReactToastify.css";

const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const BookingForm = lazy(() => import("./pages/BookingForm"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const BlogDashboard = lazy(() => import("./components/FinanceDashboard/BlogAdmin/BlogDashboard"));
const BlogPostForm = lazy(() => import("./components/FinanceDashboard/BlogAdmin/BlogPostForm"));
const AdminLayout = lazy(() => import("./components/AdminLayout/AdminLayout"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const NotFound404 = lazy(() => import("./pages/NotFound404"));
const FloatingWhatsApp = lazy(() =>
  import("react-floating-whatsapp").then((module) => ({ default: module.FloatingWhatsApp })),
);

function RouteFallback({ label = "Loading page..." }) {
  return (
    <div className="d-flex align-items-center justify-content-center py-5">
      <div className="text-muted">{label}</div>
    </div>
  );
}

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  logout();
  navigate("/");

  return null; 
}

function App() {
  const location = useLocation();
  const [showWhatsAppWidget, setShowWhatsAppWidget] = useState(false);
  const hideHeaderFooter =
    location.pathname.startsWith("/finance-dashboard") ||
    location.pathname.startsWith("/blog-admin");

  useEffect(() => {
    if (hideHeaderFooter) {
      setShowWhatsAppWidget(false);
      return undefined;
    }

    let activated = false;
    const activateWidget = () => {
      if (activated) {
        return;
      }
      activated = true;
      setShowWhatsAppWidget(true);
    };

    // Delay non-essential widget loading to keep first paint/LCP paths lighter.
    const timeoutId = window.setTimeout(activateWidget, 20000);

    const handleUserIntent = () => activateWidget();
    window.addEventListener("pointerdown", handleUserIntent, { once: true });
    window.addEventListener("scroll", handleUserIntent, { once: true, passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", handleUserIntent);
      window.removeEventListener("scroll", handleUserIntent);
    };
  }, [hideHeaderFooter, location.pathname]);
  
  return (
    <>
      <CookieBanner />
      {!hideHeaderFooter && <Header />}   
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </Suspense>
      {!hideHeaderFooter && <Footer />}
      {!hideHeaderFooter && showWhatsAppWidget ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}
    </>
  );
}

export default App;