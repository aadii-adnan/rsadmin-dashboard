import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = Cookies.get('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    Cookies.set('cookie_consent', 'accepted', { expires: 365 });
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.banner}>
        <div style={styles.text}>
          <strong>We use cookies</strong> to ensure you get the best experience on our website.
          By continuing to use this site, you accept our use of cookies and Privacy Policy.
        </div>
        <button style={styles.button} onClick={handleAccept}>Accept All</button>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1e1e1e',
    padding: '20px',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
  },
  banner: {
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    fontSize: '16px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  text: {
    flex: 1,
    lineHeight: 1.5,
  },
  button: {
    backgroundColor: '#00aaff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }
};

export default CookieBanner;
