import React, { useState } from "react";
import { Link } from "react-router-dom";
import PopupDialog from "../components/Utility/PopupDialog";
import bannerImg from "../assets/banner-img1.webp";

const getWebsiteFromHost = () => {
  const host = (window.location.hostname || "").toLowerCase();
  if (host.includes("dublinairport")) {
    return "dublinairportparking";
  }
  return "rsexpressparking";
};

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ open: false, message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setPopup({ open: true, message: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            website: getWebsiteFromHost(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to process your request right now.");
      }

      setPopup({
        open: true,
        message:
          data.message ||
          "If an account with this email exists, password reset instructions have been sent.",
      });
      setEmail("");
    } catch (error) {
      setPopup({
        open: true,
        message: error.message || "An unexpected error occurred.",
      });
    }
    setLoading(false);
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex align-items-stretch justify-content-center p-0"
      style={{ background: "linear-gradient(120deg, #fff 0%, #e3eafc 100%)" }}
    >
      <div className="row flex-grow-1 w-100 m-0">
        <div
          className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center p-0"
          style={{ background: "#010659" }}
        >
          <div
            style={{
              width: "100%",
              height: "-webkit-fill-available",
              minHeight: 500,
              backgroundImage: `linear-gradient(120deg,rgba(1,6,89,0.68),rgba(40,144,205,0.38)),url(${bannerImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 32px",
              boxSizing: "border-box",
            }}
          >
            <h2
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "2.2rem",
                margin: "0 0 12px 0",
                letterSpacing: "1px",
                textAlign: "center",
                textShadow: "0 2px 16px rgba(1,6,89,0.18)",
              }}
            >
              Forgot Your Password?
            </h2>
            <p
              style={{
                color: "#e3eafc",
                fontSize: "1.1rem",
                marginBottom: 24,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: 400,
                textShadow: "0 2px 8px rgba(1,6,89,0.18)",
                background: "rgba(1,6,89,0.18)",
                borderRadius: "8px",
                padding: "10px 16px",
              }}
            >
              Enter your account email and we will send password reset instructions.
            </p>
          </div>
        </div>

        <div
          className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-0"
          style={{ background: "transparent" }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              boxShadow: "0 8px 32px rgba(40,144,205,0.10)",
              maxWidth: "550px",
              width: "100%",
              padding: "38px 32px 32px 32px",
              margin: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h2
              style={{
                color: "#2890cd",
                fontWeight: 700,
                fontSize: "1.6rem",
                marginBottom: 16,
                textAlign: "center",
                letterSpacing: "1px",
              }}
            >
              Reset Password
            </h2>
            <p style={{ color: "#6c757d", fontSize: "15px", textAlign: "center", marginBottom: 20 }}>
              We will email you a secure reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={styles.label}>Email *</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your account email"
                autoComplete="email"
              />

              <button
                type="submit"
                style={styles.button}
                disabled={loading}
                onMouseOver={(event) => (event.target.style.backgroundColor = "#0056b3")}
                onMouseOut={(event) => (event.target.style.backgroundColor = "#2890cd")}
              >
                {loading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </form>

            <div style={styles.switchText}>
              Remembered your password?
              <Link to="/login" style={styles.link}>
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PopupDialog
        isOpen={popup.open}
        onClose={() => setPopup({ open: false, message: "" })}
        title=""
        message={popup.message}
      />
    </div>
  );
};

const styles = {
  label: {
    fontWeight: 600,
    color: "#010659",
    fontSize: "15px",
    marginBottom: "2px",
    marginTop: "8px",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #e3eafc",
    fontSize: "15px",
    marginBottom: "8px",
    outline: "none",
    transition: "border 0.2s",
    background: "#f8fafc",
    width: "100%",
  },
  button: {
    marginTop: "16px",
    padding: "12px 0",
    backgroundColor: "#2890cd",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1.05rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 2px 12px rgba(40,144,205,0.10)",
    letterSpacing: "0.5px",
  },
  switchText: {
    marginTop: "16px",
    textAlign: "center",
    color: "#6c757d",
    fontSize: "15px",
  },
  link: {
    color: "#2890cd",
    fontWeight: 700,
    textDecoration: "underline",
    marginLeft: "8px",
  },
};

export default ForgotPassword;
