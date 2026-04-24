import React, { useEffect, useState } from 'react';

const CONSENT_STORAGE_KEY = 'cookieConsent';

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let consent;
    try {
      consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      consent = null;
    }

    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleConsent = (choice) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch (error) {
      // Ignore storage failures and still apply in-session behavior.
    }

    if (choice === 'accepted') {
      window.dispatchEvent(new Event('cookie-consent-accepted'));
      window.dispatchEvent(new Event('analytics-consent-granted'));
    } else {
      window.dispatchEvent(new Event('cookie-consent-rejected'));
      window.dispatchEvent(new Event('analytics-consent-denied'));
    }

    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 bg-dark text-white py-4 shadow-lg border-top"
      style={{
        zIndex: 999999999999999, // Ensure it's above all other elements
        position: 'fixed',
        width: '100%',
      }}
    >
      <div className="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
        <div className="text-center text-md-start fs-5">
          We use <strong>essential cookies</strong> that are necessary for the website to function.
          By clicking <strong>"Accept All"</strong>, you agree to the use of additional cookies.
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-underline text-light ms-2"
          >
            Learn more
          </a>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-light btn-lg rounded-pill px-4"
            onClick={() => handleConsent('rejected')}
          >
            Reject All
          </button>
          <button
            className="btn btn-success btn-lg rounded-pill px-4"
            onClick={() => handleConsent('accepted')}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
