import React from "react";
import Modal from "react-modal";

const ServiceModal = ({ isOpen, onClose, long_description }) => {
  if (!long_description) return null; // Return null if no service is provided

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.7)", // Dark overlay
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000, // Ensure modal is above other elements
        },
        content: {
          maxWidth: "1200px",
          width: "90%",
          maxHeight: "80%",
          margin: "0 auto",
          padding: "40px 50px",
          borderRadius: "15px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          backgroundColor: "#fff",
          overflowY: "auto", // Enable vertical scrolling
          position: "relative", // Ensure the close button is positioned relative to the modal
        },
      }}
      ariaHideApp={false} // Disable app element warning
    >
      {/* Close Button (Sticky at Top-Right Edge) */}
      <button
  onClick={onClose}
  style={{
    position: "absolute",
    top: "15px",
    right: "15px",
    width: "35px",
    height: "35px",
    backgroundColor: "red",
    color: "white",
    border: "none",
    borderRadius: "50%",
    fontSize: "24px", // slightly bigger for better centering
    fontWeight: "bold",
    cursor: "pointer",
    paddingBottom: "4px", // adjust for better centering
    lineHeight: "1", // important for centering
    padding: "0", // remove default button padding
    zIndex: 1100,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    transition: "background-color 0.2s ease",
  }}
  onMouseOver={(e) => (e.target.style.backgroundColor = "#cc0000")}
  onMouseOut={(e) => (e.target.style.backgroundColor = "red")}
>
  ×
</button>


      {/* Modal Content */}
      <div dangerouslySetInnerHTML={{ __html: long_description }}></div>
    </Modal>
  );
};

export default ServiceModal;