import React from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Navigate to the previous page
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>403 - Unauthorized</h1>
      <p style={styles.message}>
        You don't have permission to access this page. Please contact the administrator if you believe this is a mistake.
      </p>
      <button style={styles.button} onClick={handleGoBack}>
        Go Back
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    padding: '20px',
  },
  heading: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#dc3545', // Red color for unauthorized
    marginBottom: '20px',
  },
  message: {
    fontSize: '18px',
    color: '#6c757d', // Gray color for the message
    marginBottom: '30px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#007bff', // Blue button
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: '#0056b3', // Darker blue on hover
  },
};

export default UnauthorizedPage;