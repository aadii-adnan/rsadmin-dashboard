import React from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Navigate to the previous page
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <h1 style={styles.heading}>403 - Unauthorized</h1>
        <p style={styles.message}>
          You don't have permission to access this page.<br />
          Please contact the administrator if you believe this is a mistake.
        </p>
        <button
          style={styles.button}
          onClick={handleGoBack}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#20435c')}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = '#447e9b')}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

const styles = {
  bg: {
    minHeight: '100vh',
    background: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(68,126,155,0.12)',
    padding: '48px 32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid #e5e5e5',
  },
  heading: {
    fontSize: '2.2rem',
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: '18px',
    letterSpacing: '1px',
  },
  message: {
    fontSize: '1.1rem',
    color: '#20435c',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  button: {
    padding: '12px 32px',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#447e9b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 8px rgba(68,126,155,0.08)',
  },
};

export default UnauthorizedPage;