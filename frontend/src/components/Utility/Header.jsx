import React, {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from "../../context/BookingContext";
import logo from "../../assets/logo-white.webp";
import simpleLogo from "../../assets/logo.webp";
import { FaBars, FaChevronDown, FaPhoneAlt, FaUserCircle } from "react-icons/fa";

const Header = () => {

  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showLegalDropdown, setShowLegalDropdown] = useState(false);
  const [isLegalInfoDropdownOpen, setIsLegalInfoDropdownOpen] = useState(false);
  const { bookingData } = useBooking();
  const { userDetails } = bookingData || {};
  const [isMeDropdownOpen, setIsMeDropdownOpen] = useState(false);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
      setShowLegalDropdown(window.innerWidth <= 1285 && window.innerWidth > 1024);
    };

    // Add listener on mount
    window.addEventListener('resize', handleResize);

    // Initial check in case the component mounts at a different width
    handleResize();

    // Cleanup on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
    {/* Promo Stripe */}
      <div
        className="w-100 text-center"
        style={{
          background: "#010659",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          letterSpacing: "0.5px",
          padding: "7px 0",
          zIndex: 2000,
          width: "100vw",
        }}
      >
        For Discount - USE CODE DUBRS5
      </div>
      {/* Main Header */}
      <div
        data-elementor-type="header"
        data-elementor-id="319"
        className="elementor elementor-319 elementor-location-header"
        data-elementor-post-type="elementor_library"
        >
        
        <div style={{ backgroundColor: "#fff", justifyContent: "space-between" }}
            className="elementor-element elementor-element-71809993 e-con-full e-flex e-con e-parent e-lazyloaded"
            data-id="71809993"
            data-element_type="container"
            data-settings='{"background_background":"classic"}'
            >
            <div className="elementor-element elementor-element-79e6e754 e-con-full e-flex e-con e-child"
              data-id="79e6e754"
              data-element_type="container"
              >
              <div
                  className="elementor-element elementor-element-32b2338c elementor-widget elementor-widget-image"
                  data-id="32b2338c"
                  data-element_type="widget"
                  data-widget_type="image.default"
                  >
                  <div className="elementor-widget-container">
                    <Link to="/">
                    <img
                        fetchPriority="high"
                        width="2170"
                        height="548"
                        src={simpleLogo}
                        className="attachment-full size-full wp-image-323"
                        alt=""
                    
                        sizes="(max-width: 2170px) 100vw, 2170px"
                        />
                    </Link>
                  </div>
              </div>
            </div>
            <div className="elementor-element elementor-element-37937865 e-con-full e-flex e-con e-child" data-id="37937865" data-element_type="container">
              <div className="elementor-element elementor-element-4e6caee5 elementor-widget__width-auto elementor-widget elementor-widget-ekit-nav-menu animated fadeIn" data-id="4e6caee5" data-element_type="widget" data-settings="{}" data-widget_type="ekit-nav-menu.default">
                  <div className="elementor-widget-container">
                    <nav className="ekit-wid-con ekit_menu_responsive_tablet" data-hamburger-icon="icon icon-menu1" data-hamburger-icon-type="icon" data-responsive-breakpoint="1024">
                        <button onClick={() => setIsOpen(prev => !prev)} className="elementskit-menu-hamburger elementskit-menu-toggler" type="button" aria-label="hamburger-icon">
                        <i aria-hidden="true" className="ekit-menu-icon icon icon-menu1"><FaBars aria-hidden="true" /></i>            </button>

                        {((isMobile && isOpen) || !isMobile) && (<>
                        <div id="ekit-megamenu-main-menu" className="active elementskit-menu-container elementskit-menu-offcanvas-elements elementskit-navbar-nav-default ekit-nav-menu-one-page- ekit-nav-dropdown-hover" ekit-dom-added="yes">
                          <ul id="menu-main-menu" className="elementskit-navbar-nav elementskit-menu-po-right submenu-click-on-icon">
                            <li onClick={() => setIsOpen(false)} id="menu-item-925" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-925 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/"}>Home</Link></li>
                            {/* Legal Information Dropdown for 1025px - 1285px */}
                            {showLegalDropdown ? (
                                <li
                                  className={`menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children nav-item elementskit-dropdown-has relative_position elementskit-dropdown-menu-default_width elementskit-mobile-builder-content`}
                                  data-vertical-menu="750px"
                                  onMouseEnter={() => setIsLegalInfoDropdownOpen(true)}
                                  onMouseLeave={() => setIsLegalInfoDropdownOpen(false)}
                                  style={{
                                    position: "relative",
                                    listStyle: "none",
                                    padding: 0,
                                    margin: 0,
                                  }}
                                >
                                  <span
                                    className="ekit-menu-nav-link ekit-menu-dropdown-toggle footer-link"
                                    style={{
                                      cursor: "pointer",
                                      padding: "0px 15px",
                                      color: "#010659",
                                      fontWeight: 600,
                                      borderRadius: "8px",
                                      transition: "background 0.2s, color 0.2s",
                                      background: isLegalInfoDropdownOpen ? "#fff" : "transparent",
                                      fontSize: "14px",
                                      textTransform: "uppercase",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      lineHeight: "1.6",
                                    }}
                                    onClick={() => setIsLegalInfoDropdownOpen(prev => !prev)}
                                  >
                                    Legal Information
                                    <i
                                      aria-hidden="true"
                                      className="icon icon-plus elementskit-submenu-indicator"
                                      style={{
                                        marginLeft: 6,
                                        lineHeight: "1.6",
                                        fontWeight: 600,
                                        transform: isLegalInfoDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: "transform 0.2s ease",
                                        display: "inline-flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <FaChevronDown aria-hidden="true" />
                                    </i>
                                  </span>
                                  <ul
                                    className={`elementskit-dropdown elementskit-submenu-panel${isLegalInfoDropdownOpen ? " elementskit-dropdown-open" : ""}`}
                                    style={{
                                      minWidth: 180,
                                      background: "#fff",
                                      borderRadius: 8,
                                      boxShadow: "0 4px 18px rgba(40,144,205,0.10)",
                                      padding: "8px 0",
                                      marginTop: 4,
                                      position: "absolute",
                                      left: 0,
                                      zIndex: 100,
                                    }}
                                  >
                                    <li
                                      onClick={() => setIsOpen(false)}
                                      className="menu-item"
                                      style={{
                                        padding: 0,
                                      }}
                                    >
                                      <Link
                                        className="footer-link"
                                        to={"/privacy-policy"}
                                        style={{
                                          display: "block",
                                          padding: "10px 18px",
                                          color: "#010659",
                                          fontWeight: 500,
                                          borderRadius: "8px",
                                          transition: "background 0.2s, color 0.2s",
                                        }}
                                      >
                                        Privacy Policy
                                      </Link>
                                    </li>
                                    <li
                                      onClick={() => setIsOpen(false)}
                                      className="menu-item"
                                      style={{
                                        padding: 0,
                                      }}
                                    >
                                      <Link
                                        className="footer-link"
                                        to={"/terms-conditions"}
                                        style={{
                                          display: "block",
                                          padding: "10px 18px",
                                          color: "#010659",
                                          fontWeight: 500,
                                          borderRadius: "8px",
                                          transition: "background 0.2s, color 0.2s",
                                        }}
                                      >
                                        Terms &amp; Conditions
                                      </Link>
                                    </li>
                                  </ul>
                                </li>
                              ) : (
                                <>
                                  <li onClick={() => setIsOpen(false)} id="menu-item-925" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-925 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/privacy-policy"}>Privacy Policy</Link></li>
                                  <li onClick={() => setIsOpen(false)} id="menu-item-924" className="menu-item menu-item-type-post_type menu-item-object-page page_item page-item-596 menu-item-924 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/terms-conditions"}>Terms &amp; Conditions</Link></li>
                                </>
                              )}
                            <li onClick={() => setIsOpen(false)} id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to="/blog"><div className="ekit-menu-nav-link">Blog</div></Link></li>
                            <li onClick={() => setIsOpen(false)} id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/contact-us"}><div className="ekit-menu-nav-link">Contact Us</div></Link></li>
                           {/* Me Dropdown */}
              {isMobile ? <>
                                  <li onClick={() => setIsOpen(false)} id="menu-item-925" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-925 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/customer-dashboard"}>My Bookings</Link></li>
                                  {userDetails?.id ? <li onClick={() => setIsOpen(false)} id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/logout"}><div className="ekit-menu-nav-link">Logout</div></Link></li> : <li onClick={() => setIsOpen(false)} id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link className='footer-link' to={"/login"}><div className="ekit-menu-nav-link">Login</div></Link></li>}
                                </> : <li
                style={{
                  position: "relative",
                }}
                onMouseEnter={() => setIsMeDropdownOpen(true)}
                onMouseLeave={() => setIsMeDropdownOpen(false)}
              >
                <span
                  style={{
                    cursor: "pointer",
                    padding: "0px 15px",
                    color: "#010659",
                    fontWeight: 600,
                    borderRadius: "8px",
                    transition: "background 0.2s, color 0.2s",
                    background: isMeDropdownOpen ? "#fff" : "transparent",
                    fontSize: "14px",
                    textTransform: "uppercase",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    lineHeight: "1.6",
                    gap: 6,
                  }}
                  onClick={() => setIsMeDropdownOpen(prev => !prev)}
                  tabIndex={0}
                >
                  <FaUserCircle
                  style={{
                    fontSize: 20,
                    marginRight: 4,
                    color: userDetails?.id ? "#28a745" : "#888" // Green if logged in, gray if not
                  }} />
                  Me
                  <i
                    aria-hidden="true"
                    className="icon icon-plus elementskit-submenu-indicator"
                    style={{
                      marginLeft: 6,
                      transform: isMeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <FaChevronDown aria-hidden="true" />
                  </i>
                </span>
                <ul
                  style={{
                    display: isMeDropdownOpen ? "block" : "none",
                    minWidth: 180,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 18px rgba(40,144,205,0.10)",
                    padding: "8px 0",
                    marginTop: -4,
                    position: "absolute",
                    left: 0,
                    zIndex: 100,
                    listStyle: "none",
                  }}
                >
                  <li style={{ padding: 0 }}>
                    <Link
                      to="/customer-dashboard"
                      style={{
                        display: "block",
                        padding: "10px 18px",
                        color: "#010659",
                        fontWeight: 500,
                        borderRadius: "8px",
                        transition: "background 0.2s, color 0.2s",
                        textDecoration: "none",
                      }}
                      onClick={() => setIsMeDropdownOpen(false)}
                    >
                      My Bookings
                    </Link>
                  </li>
                  <li style={{ padding: 0 }}>
                    {userDetails?.id ? (
                      <Link
                        to="/logout"
                        style={{
                          display: "block",
                          padding: "10px 18px",
                          color: "#010659",
                          fontWeight: 500,
                          borderRadius: "8px",
                          transition: "background 0.2s, color 0.2s",
                          textDecoration: "none",
                        }}
                        onClick={() => setIsMeDropdownOpen(false)}
                      >
                        Logout
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        style={{
                          display: "block",
                          padding: "10px 18px",
                          color: "#010659",
                          fontWeight: 500,
                          borderRadius: "8px",
                          transition: "background 0.2s, color 0.2s",
                          textDecoration: "none",
                        }}
                        onClick={() => setIsMeDropdownOpen(false)}
                      >
                        Login
                      </Link>
                    )}
                  </li>
                </ul>
              </li>}
                          </ul>
                          <div onClick={() => setIsOpen(false)} className="elementskit-nav-identity-panel">
                              <Link to={"/"} className="elementskit-nav-logo" target="" rel="">
                                <img width="2170" height="548" src={logo} title="logo white" alt="logo white" decoding="async" data-lazy-src={logo} data-ll-status="loaded" className="entered lazyloaded"/>
                                <noscript><img width="2170" height="548" src={logo} title="logo white" alt="logo white" decoding="async" /></noscript>
                              </Link>
                              <button onClick={() => setIsOpen(false)} className="elementskit-menu-close elementskit-menu-toggler" type="button">X</button>
                          </div>
                        </div>
                        <div className="elementskit-menu-overlay elementskit-menu-offcanvas-elements elementskit-menu-toggler ekit-nav-menu--overlay"></div>
                        </>)}

                    </nav>
                  </div>
              </div>
              <div className="elementor-element elementor-element-6096eb18 elementor-mobile-align-right elementor-hidden-mobile elementor-widget elementor-widget-button animated fadeIn" data-id="6096eb18" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:400}" data-widget_type="button.default">
                  <div className="elementor-widget-container">
                    <div className="elementor-button-wrapper">
                        <a className="elementor-button elementor-button-link elementor-size-sm" href="tel:+35319640011">
                          <span className="elementor-button-content-wrapper">
                              <span className="elementor-button-icon">
                                <svg aria-hidden="true" className="e-font-icon-svg e-fas-phone-alt" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z"></path>
                                </svg>
                              </span>
                              <span className="elementor-button-text">+353 1 964 0011</span>
                          </span>
                        </a>
                    </div>
                  </div>
              </div>
              <div className="elementor-element elementor-element-71d1120 elementor-mobile-align-right elementor-hidden-desktop elementor-hidden-tablet elementor-widget elementor-widget-button animated fadeIn" data-id="71d1120" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:400}" data-widget_type="button.default">
                  <div className="elementor-widget-container">
                    <div className="elementor-button-wrapper">
                        <a className="elementor-button elementor-button-link elementor-size-sm" href="tel:+35319640011">
                        <span className="elementor-button-content-wrapper">
                        <span className="elementor-button-icon">
                        <i aria-hidden="true" className="icon icon-phone-handset"><FaPhoneAlt aria-hidden="true" /></i>			</span>
                        </span>
                        </a>
                    </div>
                  </div>
              </div>
            </div>
        </div>
      </div>
      </>
  );
};

export default Header;