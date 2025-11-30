import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound404 = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div style={styles.bg}>
      <div style={styles.center}>
        <div style={styles.big404}>404</div>
        <div style={styles.emoji}>🛫</div>
        <h2 style={styles.title}>Oops! Page Not Found</h2>
        <p style={styles.text}>
          Sorry, we can’t find the page you’re looking for.<br />
          It may have been moved or never existed.
        </p>
        <button
          style={styles.button}
          onClick={handleGoHome}
          onMouseOver={e => (e.target.style.backgroundColor = '#0056b3')}
          onMouseOut={e => (e.target.style.backgroundColor = '#2890cd')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

const styles = {
  bg: {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(120deg, #fff 0%, #e3eafc 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Urbanist', sans-serif",
  },
  center: {
    textAlign: 'center',
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
  },
  big404: {
    fontSize: '110px',
    fontWeight: 900,
    color: '#2890cd',
    letterSpacing: '4px',
    marginBottom: '-10px',
    marginTop: '0',
    lineHeight: 1,
  },
  emoji: {
    fontSize: '54px',
    marginBottom: '10px',
    animation: 'float 2s infinite ease-in-out',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 700,
    color: '#010659',
    margin: '0 0 18px 0',
  },
  text: {
    fontSize: '1.1rem',
    color: '#6c757d',
    marginBottom: '32px',
    lineHeight: 1.7,
  },
  button: {
    padding: '14px 36px',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#fff',
    backgroundColor: '#2890cd',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 12px rgba(40,144,205,0.10)',
    letterSpacing: '1px',
  },
};

export default NotFound404;