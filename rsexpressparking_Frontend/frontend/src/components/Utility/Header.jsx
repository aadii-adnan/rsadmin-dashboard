import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <div
      data-elementor-type="header"
      data-elementor-id="319"
      className="elementor elementor-319 elementor-location-header"
      data-elementor-post-type="elementor_library"
    >
      <div
        className="elementor-element elementor-element-71809993 e-con-full e-flex e-con e-parent e-lazyloaded"
        data-id="71809993"
        data-element_type="container"
        data-settings='{"background_background":"classic"}'
      >
        <div
          className="elementor-element elementor-element-79e6e754 e-con-full e-flex e-con e-child"
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
                  src="https://rsexpressparking.com/wp-content/uploads/2025/01/logo.png"
                  className="attachment-full size-full wp-image-323"
                  alt=""
                  srcSet="https://rsexpressparking.com/wp-content/uploads/2025/01/logo.png 2170w, https://rsexpressparking.com/wp-content/uploads/2025/01/logo-300x76.png 300w, https://rsexpressparking.com/wp-content/uploads/2025/01/logo-1024x259.png 1024w, https://rsexpressparking.com/wp-content/uploads/2025/01/logo-768x194.png 768w, https://rsexpressparking.com/wp-content/uploads/2025/01/logo-1536x388.png 1536w, https://rsexpressparking.com/wp-content/uploads/2025/01/logo-2048x517.png 2048w"
                  sizes="(max-width: 2170px) 100vw, 2170px"
                />
              </Link>
            </div>
          </div>
        </div>
        <div
          className="elementor-element elementor-element-37937865 e-con-full e-flex e-con e-child"
          data-id="37937865"
          data-element_type="container"
        >
          <div
            className="elementor-element elementor-element-4e6caee5 elementor-widget__width-auto elementor-widget elementor-widget-ekit-nav-menu animated fadeIn"
            data-id="4e6caee5"
            data-element_type="widget"
            data-settings="{}"
            data-widget_type="ekit-nav-menu.default"
          >
            <div className="elementor-widget-container">
              <nav
                className="ekit-wid-con ekit_menu_responsive_tablet"
                data-hamburger-icon="icon icon-menu1"
                data-hamburger-icon-type="icon"
                data-responsive-breakpoint="1024"
              >
                <button
                  className="elementskit-menu-hamburger elementskit-menu-toggler"
                  type="button"
                  aria-label="hamburger-icon"
                >
                  <i aria-hidden="true" className="ekit-menu-icon icon icon-menu1"></i>
                </button>
                <div
                  id="ekit-megamenu-main-menu"
                  className="elementskit-menu-container elementskit-menu-offcanvas-elements elementskit-navbar-nav-default ekit-nav-menu-one-page- ekit-nav-dropdown-hover"
                  ekit-dom-added="yes"
                >
                  <ul
                    id="menu-main-menu"
                    className="elementskit-navbar-nav elementskit-menu-po-right submenu-click-on-icon"
                  >
                    <li
                      id="menu-item-576"
                      className="menu-item menu-item-type-post_type menu-item-object-page menu-item-home current-menu-item page_item page-item-88 current_page_item menu-item-576 nav-item elementskit-mobile-builder-content active"
                      data-vertical-menu="750px"
                    >
                      <Link to="/" className="ekit-menu-nav-link active">
                        Home
                      </Link>
                    </li>
                    <li id="menu-item-922" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-922 nav-item elementskit-dropdown-has relative_position elementskit-dropdown-menu-default_width elementskit-mobile-builder-content" data-vertical-menu="750px"><a href="#" class="ekit-menu-nav-link ekit-menu-dropdown-toggle">Legal Information<i aria-hidden="true" class="icon icon-plus elementskit-submenu-indicator"></i></a>
                      <ul class="elementskit-dropdown elementskit-submenu-panel">
                        <li id="menu-item-924" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-924 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><a href="https://rsexpressparking.com/terms-conditions/" class=" dropdown-item">Terms &amp; Conditions</a>	</li><li id="menu-item-925" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-925 nav-item elementskit-mobile-builder-content" data-vertical-menu="750px"><a href="https://rsexpressparking.com/privacy-policy/" class=" dropdown-item">Privacy Policy</a></li></ul>
                      </li>
                    <li
                      id="menu-item-754"
                      className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content"
                      data-vertical-menu="750px"
                    >
                      <Link to="/contact-us" className="ekit-menu-nav-link">
                        Contact Us
                      </Link>
                    </li>
                    <li
                      id="menu-item-754"
                      className="menu-item menu-item-type-post_type menu-item-object-page menu-item-754 nav-item elementskit-mobile-builder-content"
                      data-vertical-menu="750px"
                    >
                      {localStorage.getItem("access_token") && <Link to="/logout" className="ekit-menu-nav-link">
                        Logout
                      </Link>}
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;