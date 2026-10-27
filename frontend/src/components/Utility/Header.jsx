import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/logo-white-240.webp?no-inline";
import logo2x from "../../assets/logo-white-480.webp?no-inline";
import simpleLogo from "../../assets/logo-238.webp";
import simpleLogo2x from "../../assets/logo-476.webp";
import {
  FaBars,
  FaChevronDown,
  FaPhoneAlt,
  FaTimes,
  FaUserCircle,
} from "react-icons/fa";
import "./Header.css";

const navigationItems = [
  { label: "Home", to: "/" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms-conditions" },
  { label: "Blog", to: "/blog" },
  { label: "Contact Us", to: "/contact-us" },
];

const mobileHeaderQuery = "(max-width: 1024px)";

function mobileHeaderMatches() {
  return typeof window !== "undefined" && window.matchMedia(mobileHeaderQuery).matches;
}

function Header() {
  const [isMobileHeader, setIsMobileHeader] = useState(mobileHeaderMatches);
  const [isOpen, setIsOpen] = useState(false);
  const [isMeDropdownOpen, setIsMeDropdownOpen] = useState(false);
  const accountCloseTimerRef = useRef(null);
  const { bookingData } = useBooking();
  const { user } = useAuth();
  // AuthContext is the authoritative source for account capabilities. Keep
  // the booking-context value only as a short-lived compatibility fallback.
  const userDetails = user || bookingData?.userDetails;
  const canAccessDashboard = Boolean(user?.can_access_staff_dashboard);
  const location = useLocation();

  useEffect(() => {
    const mobileViewport = window.matchMedia(mobileHeaderQuery);
    const handleViewportChange = (event) => {
      setIsMobileHeader(event.matches);
      if (!event.matches) {
        setIsOpen(false);
      }
    };

    setIsMobileHeader(mobileViewport.matches);
    mobileViewport.addEventListener("change", handleViewportChange);

    return () => {
      mobileViewport.removeEventListener("change", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsMeDropdownOpen(false);
  }, [location.pathname]);

  useEffect(
    () => () => {
      if (accountCloseTimerRef.current) {
        window.clearTimeout(accountCloseTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const accountAction = userDetails?.id
    ? { label: "Logout", to: "/logout" }
    : { label: "Login", to: "/login" };

  const clearAccountCloseTimer = () => {
    if (accountCloseTimerRef.current) {
      window.clearTimeout(accountCloseTimerRef.current);
      accountCloseTimerRef.current = null;
    }
  };

  const openAccountMenu = () => {
    clearAccountCloseTimer();
    setIsMeDropdownOpen(true);
  };

  const scheduleAccountMenuClose = () => {
    clearAccountCloseTimer();
    accountCloseTimerRef.current = window.setTimeout(() => {
      setIsMeDropdownOpen(false);
      accountCloseTimerRef.current = null;
    }, 220);
  };

  const closeMobileMenu = () => setIsOpen(false);

  return (
    <header className="rs-site-header">
      <div className="rs-promo-bar">For Discount — Use Code DUBRS5</div>

      <div className="rs-header-main">
        <Link className="rs-header-logo" to="/" aria-label="RS Express Parking home">
          <img
            src={simpleLogo}
            srcSet={`${simpleLogo} 1x, ${simpleLogo2x} 2x`}
            alt="RS Express Parking"
            width="238"
            height="60"
            decoding="async"
          />
        </Link>

        {!isMobileHeader && (
          <nav className="rs-desktop-nav" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rs-desktop-nav-link${isActive ? " is-active" : ""}`
                }
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}

            <div
              className="rs-account-menu"
              onMouseEnter={openAccountMenu}
              onMouseLeave={scheduleAccountMenuClose}
            >
              <button
                className="rs-account-trigger"
                type="button"
                aria-expanded={isMeDropdownOpen}
                aria-controls="rs-account-dropdown"
                onClick={() => {
                  clearAccountCloseTimer();
                  setIsMeDropdownOpen((open) => !open);
                }}
              >
                <FaUserCircle
                  aria-hidden="true"
                  className={userDetails?.id ? "is-signed-in" : ""}
                />
                <span>Me</span>
                <FaChevronDown aria-hidden="true" className="rs-account-chevron" />
              </button>

              {isMeDropdownOpen && (
                <div id="rs-account-dropdown" className="rs-account-dropdown">
                  <Link to="/customer-dashboard" onClick={() => setIsMeDropdownOpen(false)}>
                    My Bookings
                  </Link>
                  {canAccessDashboard && (
                    <Link to="/bookings-admin" onClick={() => setIsMeDropdownOpen(false)}>
                      Admin Dashboard
                    </Link>
                  )}
                  <Link to={accountAction.to} onClick={() => setIsMeDropdownOpen(false)}>
                    {accountAction.label}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}

        <div className="rs-header-actions">
          {isMobileHeader ? (
            <>
              <a
                className="rs-mobile-action rs-mobile-phone"
                href="tel:+35319640011"
                aria-label="Call RS Express Parking"
              >
                <FaPhoneAlt aria-hidden="true" />
              </a>

              <button
                className="rs-mobile-action rs-menu-toggle"
                type="button"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
                aria-controls="rs-mobile-menu"
                onClick={() => setIsOpen((open) => !open)}
              >
                {isOpen ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
              </button>
            </>
          ) : (
            <a className="rs-desktop-phone" href="tel:+35319640011">
              <FaPhoneAlt aria-hidden="true" />
              <span>+353 1 964 0011</span>
            </a>
          )}
        </div>
      </div>

      {isMobileHeader && isOpen && (
        <div className="rs-mobile-menu-layer">
          <button
            className="rs-mobile-menu-overlay"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          />

          <aside
            id="rs-mobile-menu"
            className="rs-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="rs-mobile-menu-header">
              <Link to="/" onClick={closeMobileMenu} aria-label="RS Express Parking home">
                <img
                  src={logo}
                  srcSet={`${logo} 1x, ${logo2x} 2x`}
                  alt="RS Express Parking"
                  width="240"
                  height="61"
                  decoding="async"
                />
              </Link>
              <button
                type="button"
                className="rs-mobile-menu-close"
                aria-label="Close navigation menu"
                onClick={closeMobileMenu}
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <nav className="rs-mobile-nav" aria-label="Mobile main navigation">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rs-mobile-nav-link${isActive ? " is-active" : ""}`
                  }
                  end={item.to === "/"}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="rs-mobile-account">
              <p>Your account</p>
              <Link to="/customer-dashboard" onClick={closeMobileMenu}>
                <FaUserCircle aria-hidden="true" />
                My Bookings
              </Link>
              {canAccessDashboard && (
                <Link to="/bookings-admin" onClick={closeMobileMenu}>
                  Admin Dashboard
                </Link>
              )}
              <Link to={accountAction.to} onClick={closeMobileMenu}>
                {accountAction.label}
              </Link>
            </div>

            <a className="rs-mobile-call-cta" href="tel:+35319640011">
              <FaPhoneAlt aria-hidden="true" />
              <span>
                <small>Need help?</small>
                +353 1 964 0011
              </span>
            </a>
          </aside>
        </div>
      )}
    </header>
  );
}

export default Header;
