import React, {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
import { useBooking } from "../../context/BookingContext";
import logo from "../../assets/logo-white.webp";
import simpleLogo from "../../assets/logo.png";

const Header = () => {

  const [isMobile, setIsMobile] = useState(true);
  const [isLegalInfoDropdownOpen, setIsLegalInfoDropdownOpen] = useState(false);
  const { bookingData } = useBooking();
  const { userDetails } = bookingData || {};


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth > 1024);
    };

    // Add listener on mount
    window.addEventListener('resize', handleResize);

    // Initial check in case the component mounts at a different width
    handleResize();

    // Cleanup on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
      <div
        data-elementor-type="header"
        data-elementor-id="319"
        className="elementor elementor-319 elementor-location-header"
        data-elementor-post-type="elementor_library"
        >
        <div style={{ backgroundColor: "#F5F4EE" }}
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
                        <button onClick={() => setIsMobile(prev => !prev)} className="elementskit-menu-hamburger elementskit-menu-toggler" type="button" aria-label="hamburger-icon">
                        <i aria-hidden="true" className="ekit-menu-icon icon icon-menu1"></i>            </button>

                        {isMobile && (<>
                        <div id="ekit-megamenu-main-menu" className="active elementskit-menu-container elementskit-menu-offcanvas-elements elementskit-navbar-nav-default ekit-nav-menu-one-page- ekit-nav-dropdown-hover" ekit-dom-added="yes">
                          <ul id="menu-main-menu" className="elementskit-navbar-nav elementskit-menu-po-right submenu-click-on-icon">
                              {/* <li id="menu-item-576" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-home menu-item-576 nav-item elementskit-mobile-builder-content active" data-vertical-menu="750px"><Link to={"/"} className="ekit-menu-nav-link">Home</Link></li> */}
                                                      
                              
                              
                              {/* <li id="menu-item-922" className="menu-item menu-item-type-custom menu-item-object-custom current-menu-ancestor current-menu-parent menu-item-has-children menu-item-922 nav-item elementskit-dropdown-has relative_position elementskit-dropdown-menu-default_width elementskit-mobile-builder-content" data-vertical-menu="750px">
                                <Link to={"#"} className="ekit-menu-nav-link ekit-menu-dropdown-toggle">Legal Information<i onClick={() => setIsLegalInfoDropdownOpen(prev => !prev)} aria-hidden="true" className="icon icon-plus elementskit-submenu-indicator"></i></Link>
                                <ul className={`elementskit-dropdown elementskit-submenu-panel ${(isMobile && isLegalInfoDropdownOpen) ? "elementskit-dropdown-open" : ""}`}> */}
                              <li onClick={() => setIsMobile(false)} id="menu-item-925" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-925 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link to={"/privacy-policy"}>Privacy Policy</Link></li>
                              <li onClick={() => setIsMobile(false)} id="menu-item-924" className="menu-item menu-item-type-post_type menu-item-object-page page_item page-item-596 menu-item-924 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link to={"/terms-and-conditions"}>Terms &amp; Conditions</Link></li>
                                {/* </ul>
                              </li> */}

                              <li onClick={() => setIsMobile(false)} id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link to={"/contact-us"}><div className="ekit-menu-nav-link">Contact Us</div></Link></li>

                              {userDetails?.id && <li id="menu-item-754" className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><Link to={"/logout"}><div className="ekit-menu-nav-link">Logout</div></Link></li>}
                              
                          </ul>
                          <div onClick={() => setIsMobile(false)} className="elementskit-nav-identity-panel">
                              <Link to={"/"} className="elementskit-nav-logo" target="" rel="">
                                <img width="2170" height="548" src={logo} title="logo white" alt="logo white" decoding="async" data-lazy-src={logo} data-ll-status="loaded" className="entered lazyloaded"/>
                                <noscript><img width="2170" height="548" src={logo} title="logo white" alt="logo white" decoding="async" /></noscript>
                              </Link>
                              <button onClick={() => setIsMobile(false)} className="elementskit-menu-close elementskit-menu-toggler" type="button">X</button>
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
                        <i aria-hidden="true" className="icon icon-phone-handset"></i>			</span>
                        </span>
                        </a>
                    </div>
                  </div>
              </div>
            </div>
        </div>
      </div>
  );
};

export default Header;