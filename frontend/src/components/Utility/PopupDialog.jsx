import React from "react";
import Modal from "react-modal";
import "./modalStyles.css";

const PopupDialog = ({ isOpen, onClose, title, message }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="rse-modal-overlay rse-popup-overlay"
      className="rse-modal-content rse-popup-content"
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