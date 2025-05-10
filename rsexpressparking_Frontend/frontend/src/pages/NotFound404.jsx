import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound404 = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/'); // Navigate to the home page
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>404 - Page Not Found</h1>
      <p style={styles.message}>
        Oops! The page you're looking for doesn't exist. It might have been removed or the URL might be incorrect.
      </p>
      <button style={styles.button} onClick={handleGoHome}>
        Go to Home
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
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#dc3545', // Red color for emphasis
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

export default NotFound404;