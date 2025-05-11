import React from 'react';

const PaymentStatus = ({ message, error, processing }) => {
  if (!message && !error && !processing) return null;

  const getStatusStyle = () => {
    if (error) return {
      color: "#dc3545",
      backgroundColor: "#f8d7da",
      border: "1px solid #f5c6cb"
    };
    if (processing) return {
      color: "#0c5460",
      backgroundColor: "#d1ecf1",
      border: "1px solid #bee5eb"
    };
    return {
      color: "#155724",
      backgroundColor: "#d4edda",
      border: "1px solid #c3e6cb"
    };
  };

  return (
    <div
      style={{
        padding: "1rem",
        marginTop: "1rem",
        borderRadius: "0.25rem",
        textAlign: "center",
        ...getStatusStyle()
      }}
    >
      {error || message || (processing && "Processing payment...")}
    </div>
  );
};

export default PaymentStatus;