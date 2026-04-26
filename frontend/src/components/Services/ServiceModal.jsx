import React from "react";
import Modal from "react-modal";
import "../Utility/modalStyles.css";

const ServiceModal = ({ isOpen, onClose, long_description }) => {
  const modalContent = long_description?.trim()
    ? long_description
    : "<p>More details are not available for this service yet.</p>";

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="rse-modal-overlay rse-service-overlay"
      className="rse-modal-content rse-service-content"
      ariaHideApp={false} // Disable app element warning
    >
      {/* Close Button (Sticky at Top-Right Edge) */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "15px", right: "15px", width: "35px", height: "35px", backgroundColor: "red", color: "white", border: "none", borderRadius: "50%", fontSize: "24px", fontWeight: "bold", cursor: "pointer", paddingBottom: "4px", lineHeight: "1", padding: "0", zIndex: 1100, boxShadow: "0 2px 6px rgba(0,0,0,0.2)", transition: "background-color 0.2s ease",}}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#cc0000")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "red")}
      >
        ×
    </button>


      {/* Modal Content */}
      <div dangerouslySetInnerHTML={{ __html: modalContent }}></div>
    </Modal>
  );
};

export default ServiceModal;