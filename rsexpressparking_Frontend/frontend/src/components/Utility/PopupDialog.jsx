import React from "react";
import Modal from "react-modal";

const PopupDialog = ({ isOpen, onClose, title, message }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.7)", // Darker overlay for better focus
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          position: "relative",
          maxWidth: "500px",
          width: "90%", // Responsive width
          maxHeight: "90%", // Prevent overflow
          margin: "0 auto",
          padding: "30px",
          borderRadius: "15px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
          backgroundColor: "#fff",
          textAlign: "center",
          overflow: "auto", // Handle long content gracefully
        },
      }}
      ariaHideApp={false} // Disable app element warning
    >
      <h2 style={{ color: "#2890cd", fontSize: "24px", marginBottom: "20px" }}>
        {title}
      </h2>
      <p style={{ color: "#555", fontSize: "16px", marginBottom: "30px" }}>
        {message}
      </p>
      <button
        onClick={onClose}
        style={{
          padding: "12px 25px",
          backgroundColor: "#2890cd",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          transition: "background-color 0.3s ease",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#2890cd")}
      >
        Close
      </button>
    </Modal>
  );
};

export default PopupDialog;