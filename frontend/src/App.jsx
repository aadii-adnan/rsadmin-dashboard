import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Utility/Header";
import Footer from "./components/Utility/Footer";
import { useAuth } from "./auth/AuthContext";
import CookieBanner from "./components/Utility/CookieBanner";
import avatar from "./assets/avatar.png";
import { captureAttribution } from "./utils/attribution";
import Home from "./pages/Home";
import VoucherToast from "./components/Utility/VoucherToast";

function lazyWithLegacyStyles(loader) {
  return lazy(async () => {
    const [, module] = await Promise.all([
      import("./styles/legacyBootstrap"),
      loader(),
    ]);
    return module;
  });
}

const Services = lazyWithLegacyStyles(() => import("./pages/Services"));
const BookingForm = lazyWithLegacyStyles(() => import("./pages/BookingForm"));
const BlogList = lazyWithLegacyStyles(() => import("./pages/BlogList"));
const BlogDetail = lazyWithLegacyStyles(() => import("./pages/BlogDetail"));
const ContactUs = lazyWithLegacyStyles(() => import("./pages/ContactUs"));
const TermsAndConditions = lazyWithLegacyStyles(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazyWithLegacyStyles(() => import("./pages/PrivacyPolicy"));
const UnauthorizedPage = lazyWithLegacyStyles(() => import("./pages/UnauthorizedPage"));
const ThankYouPage = lazyWithLegacyStyles(() => import("./pages/ThankYouPage"));
const CustomerDashboard = lazyWithLegacyStyles(() => import("./pages/CustomerDashboard"));
const ManageBookingLookup = lazyWithLegacyStyles(() => import("./pages/ManageBookingLookup"));
const ManageBooking = lazyWithLegacyStyles(() => import("./pages/ManageBooking"));
const Login = lazyWithLegacyStyles(() => import("./pages/Login"));
const ForgotPassword = lazyWithLegacyStyles(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithLegacyStyles(() => import("./pages/ResetPassword"));
const FinanceDashboard = lazyWithLegacyStyles(() => import("./pages/FinanceDashboard"));
const BlogDashboard = lazyWithLegacyStyles(() => import("./components/FinanceDashboard/BlogAdmin/BlogDashboard"));
const BlogPostForm = lazyWithLegacyStyles(() => import("./components/FinanceDashboard/BlogAdmin/BlogPostForm"));
const AdminLayout = lazyWithLegacyStyles(() => import("./components/AdminLayout/AdminLayout"));
const SitemapPage = lazyWithLegacyStyles(() => import("./pages/SitemapPage"));
const NotFound404 = lazyWithLegacyStyles(() => import("./pages/NotFound404"));
const FloatingWhatsApp = lazy(() =>
  import("react-floating-whatsapp").then((module) => ({ default: module.FloatingWhatsApp })),
);

function RouteFallback({ label = "Loading page..." }) {
  return (
    <div className="route-fallback">
      <div>{label}</div>
    </div>
  );
}

function PublicWhatsAppWidget() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let activated = false;
    const activateWidget = () => {
      if (activated) {
        return;
      }
      activated = true;
      setIsVisible(true);
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
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
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
  const isAdminDashboard =
    location.pathname.startsWith("/finance-dashboard") ||
    location.pathname.startsWith("/blog-admin");

  // Capture first-touch marketing attribution on initial load.
  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app-route-changed", {
      detail: { pathname: location.pathname },
    }));
  }, [location.pathname]);
  
  return (
    <>
      <CookieBanner />
      {!isAdminDashboard && <VoucherToast />}
      {!isAdminDashboard && <Header />}
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
          <Route path="/manage-booking" element={<ManageBookingLookup />} />
          <Route path="/manage-booking/booking" element={<ManageBooking />} />
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
      {!isAdminDashboard && <Footer />}
      {!isAdminDashboard && <PublicWhatsAppWidget />}
    </>
  );
}

export default App;
