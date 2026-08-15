import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaInstagram, FaPhone, FaPhoneAlt } from 'react-icons/fa';
import logo from '../../assets/logo-white-240.webp?no-inline';
import logo2x from '../../assets/logo-white-480.webp?no-inline';
import './Footer.css';

const quickLinks = [
  { label: 'Home', to: '/' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact-us' },
  { label: 'My Bookings', to: '/customer-dashboard' },
  { label: 'Login/Signup', to: '/login' },
  { label: 'Sitemap', to: '/sitemap.html' },
];

function Footer() {
  return (
    <footer id="site-footer" className="rse-footer">
      <div className="rse-footer__grid">
        <div className="rse-footer__brand">
          <Link to="/" aria-label="RS Express Parking home">
            <img
              src={logo}
              srcSet={`${logo} 1x, ${logo2x} 2x`}
              width="240"
              height="61"
              loading="lazy"
              decoding="async"
              alt="RS Express Parking"
            />
          </Link>
          <p>
            RS Express Parking provides convenient, secure meet and greet parking at
            Dublin Airport with a focus on safety and affordability.
          </p>
          <a
            className="rse-footer__social"
            href="https://www.instagram.com/rsexpressparking/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RS Express Parking on Instagram"
          >
            <FaInstagram aria-hidden="true" />
          </a>
        </div>

        <nav className="rse-footer__section" aria-label="Footer navigation">
          <h2>Quick Links</h2>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="rse-footer__section" aria-label="Legal information">
          <h2>Legal Information</h2>
          <ul>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms-conditions">Terms &amp; Conditions</Link></li>
          </ul>
        </nav>

        <address className="rse-footer__section rse-footer__contact">
          <h2>Contact Us</h2>
          <a href="tel:+35319640011">
            <FaPhoneAlt aria-hidden="true" />
            <span><small>Customer Support</small>+353 1 964 0011</span>
          </a>
          <a href="tel:+353834896505">
            <FaPhone aria-hidden="true" />
            <span><small>Driver</small>+353 83 489 6505</span>
          </a>
          <a href="tel:+353838208082">
            <FaPhone aria-hidden="true" />
            <span><small>Driver</small>+353 83 820 8082</span>
          </a>
          <a href="mailto:support@rsexpressparking.com">
            <FaEnvelope aria-hidden="true" />
            <span>support@rsexpressparking.com</span>
          </a>
        </address>
      </div>

      <div className="rse-footer__bottom">
        <p>
          Copyright ©2025 RS Express Parking. Website &amp; Marketing by{' '}
          <a href="https://xelensoft.com/" target="_blank" rel="noopener noreferrer">
            Xelensoft
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
