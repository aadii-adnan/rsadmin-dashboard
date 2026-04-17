import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PopupDialog from "../components/Utility/PopupDialog";
import bannerImg from "../assets/banner-img1.webp";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validatingLink, setValidatingLink] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirectAfterPopup, setRedirectAfterPopup] = useState(false);
  const [popup, setPopup] = useState({ open: false, message: "" });

  useEffect(() => {
    const validateLink = async () => {
      if (!uid || !token) {
        setIsLinkValid(false);
        setValidationMessage("Invalid reset link. Please request a new password reset.");
        setValidatingLink(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/reset-password/validate/?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.valid) {
          setIsLinkValid(false);
          setValidationMessage(data.message || "Invalid or expired reset link.");
        } else {
          setIsLinkValid(true);
        }
      } catch (error) {
        setIsLinkValid(false);
        setValidationMessage("Unable to validate reset link. Please try again.");
      }

      setValidatingLink(false);
    };

    validateLink();
  }, [uid, token]);

  const handlePopupClose = () => {
    setPopup({ open: false, message: "" });
    if (redirectAfterPopup) {
      navigate("/login");
    }
  };

  const extractApiError = (data) => {
    if (!data || typeof data !== "object") {
      return "Unable to reset password. Please try again.";
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data.new_password) && data.new_password.length > 0) {
      return data.new_password[0];
    }

    if (Array.isArray(data.confirm_password) && data.confirm_password.length > 0) {
      return data.confirm_password[0];
    }

    return "Unable to reset password. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setPopup({ open: true, message: "Please fill in both password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPopup({ open: true, message: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/reset-password/confirm/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            token,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractApiError(data));
      }

      setRedirectAfterPopup(true);
      setPopup({
        open: true,
        message: data.message || "Password has been reset successfully. Please login.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPopup({ open: true, message: error.message || "An unexpected error occurred." });
    }
    setSubmitting(false);
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
              }}
            >
              Set a New Password
            </h2>
            <p
              style={{
                color: "#e3eafc",
                fontSize: "1.1rem",
                marginBottom: 24,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: 400,
                background: "rgba(1,6,89,0.18)",
                borderRadius: "8px",
                padding: "10px 16px",
              }}
            >
              Choose a strong password you have not used before.
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

            {validatingLink ? (
              <p style={{ color: "#555", textAlign: "center", marginBottom: 0 }}>
                Validating reset link...
              </p>
            ) : isLinkValid ? (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={styles.label}>New Password *</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={{ ...styles.input, marginBottom: 0 }}
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    style={styles.showBtn}
                    tabIndex={-1}
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <label style={styles.label}>Confirm Password *</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={{ ...styles.input, marginBottom: 0 }}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    style={styles.showBtn}
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <button
                  type="submit"
                  style={styles.button}
                  disabled={submitting}
                  onMouseOver={(event) => (event.target.style.backgroundColor = "#0056b3")}
                  onMouseOut={(event) => (event.target.style.backgroundColor = "#2890cd")}
                >
                  {submitting ? "Updating..." : "Update Password"}
                </button>
              </form>
            ) : (
              <>
                <p style={{ color: "#dc3545", textAlign: "center", marginBottom: 10 }}>
                  {validationMessage}
                </p>
                <div style={styles.switchText}>
                  <Link to="/forgot-password" style={styles.link}>
                    Request a new reset link
                  </Link>
                </div>
              </>
            )}

            {!validatingLink && (
              <div style={styles.switchText}>
                <Link to="/login" style={styles.link}>
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <PopupDialog
        isOpen={popup.open}
        onClose={handlePopupClose}
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
  passwordWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
  },
  showBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "0.9rem",
    cursor: "pointer",
    color: "#2890cd",
    padding: 0,
    outline: "none",
    fontWeight: 700,
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
  },
};

export default ResetPassword;
