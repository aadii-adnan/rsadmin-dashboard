import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useBooking } from "../../context/BookingContext";
import PopupDialog from "../Utility/PopupDialog";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const Step0BookingForm = ({
  formData,
  handleChange,
  labelStyle,
  inputStyle,
  setFormData,
  goNext,
  nextButtonStyle,
  contactNo, setContactNo
}) => {
  const { login: loginUser } = useAuth();
  const [login, setLogin] = useState(false);
  const [rescheduleOption, setRescheduleOption] = useState(false); // Checkbox state
  const { bookingData: { userDetails } } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingBookingUser, setPendingBookingUser] = useState(false);

  const validateFields = (fields) => {
  const errors = [];

  if (!login) {

    if (!fields.first_name) {
      errors.push("First name is required.");
    }
    if (!fields.last_name) {
      errors.push("Last name is required.");
    }
    if (!fields.contact_no || fields.contact_no.length < 10) {
      errors.push("Contact number must be at least 10 digits.");
    }
    if (!fields.email || !/^\S+@\S+\.\S+$/.test(fields.email)) {
      errors.push("A valid email is required.");
    }
  }

  if (rescheduleOption) {
    if (!login) {
      if (!fields.username || fields.username.length < 3) {
        errors.push("Username must be at least 3 characters.");
      }
      if (!fields.password || fields.password.length < 6) {
        errors.push("Password must be at least 6 characters.");
      }
    }
  }

  return errors;
};

  const handleLoginOrSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

  const trimmedFormData = {
    username: formData.username?.trim(),
    password: formData.password,
    first_name: formData.first_name?.trim(),
    last_name: formData.last_name?.trim(),
    email: formData.email?.trim(),
    contact_no: contactNo.trim(),
  };

  const errors = validateFields(trimmedFormData);

  if (errors.length > 0) {
    setError(errors[0]);
    setIsPopupOpen(true);
    setLoading(false);
    return;
  }

  try {
    const bookingUserBody = {
      first_name: trimmedFormData.first_name,
      last_name: trimmedFormData.last_name,
      email: trimmedFormData.email,
      contact_no: trimmedFormData.contact_no,
    };
    
    if (rescheduleOption && login) {
      await loginUser(trimmedFormData.username, trimmedFormData.password);
      setPendingBookingUser(true);
      setLoading(false);
      return;
      
    } else if (rescheduleOption && !login) {
      const registerRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: trimmedFormData.first_name,
            last_name: trimmedFormData.last_name,
            email: trimmedFormData.email,
            username: trimmedFormData.username,
            password: trimmedFormData.password,
            phone: trimmedFormData.contact_no,
          }),
        }
      );

      if (registerRes.status === 409) {
        setLoading(false);
        throw new Error("Username already exists");
      }
      if (!registerRes.ok) {
        const errorData = await registerRes.json();
        setLoading(false);
        throw new Error(errorData.message || "Signup failed.");
      }

      // Auto-login after successful signup
      await loginUser(trimmedFormData.username, trimmedFormData.password);
      setLoading(false);
    }

    // 1. Always create BookingUser
    const bookingUserRes = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/bookings/booking-user/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingUserBody),
      }
    );
    const bookingUserData = await bookingUserRes.json();
    if (!bookingUserRes.ok) {
      setLoading(false);
      throw new Error(bookingUserData?.error || "Failed to save contact info.");
    }

    // 2. Save bookingUserId in formData
    setFormData((prev) => ({
      ...prev,
      booking_user_id: bookingUserData.id,
    }));

    goNext(); // Redirect or next action
  } catch (err) {
    console.error(err);
    alert(err.message || "An unexpected error occurred.");
    setLoading(false);
  }
};

useEffect(() => {
    window.scrollTo(0, 300)
  }, []);

  useEffect(() => {
    if (pendingBookingUser && userDetails?.id) {
      // Now userDetails is available, create booking user
      const bookingUserBody = {
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        email: userDetails.email,
        contact_no: userDetails.phone,
      };
      (async () => {
        setLoading(true);
        try {
          const bookingUserRes = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/bookings/booking-user/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bookingUserBody),
            }
          );
          const bookingUserData = await bookingUserRes.json();
          if (!bookingUserRes.ok) {
            throw new Error(bookingUserData?.error || "Failed to save contact info.");
          }
          setFormData((prev) => ({
            ...prev,
            booking_user_id: bookingUserData.id,
          }));
          setPendingBookingUser(false);
          goNext();
        } catch (err) {
          alert(err.message || "An unexpected error occurred.");
          setPendingBookingUser(false);
        }
        setLoading(false);
      })();
    }
  }, [pendingBookingUser, userDetails]);

  return (
    <>
    <fieldset className="fieldset active">
      <div className="form-card">
        <div className="row">
          <div className="col-7">
            <h2
              className="fs-title"
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#010659",
                marginBottom: "20px",
              }}
            >
              Account Information:
            </h2>
          </div>
          <div className="col-5">
            <h2
              className="steps"
              style={{
                fontSize: "16px",
                color: "#555",
                marginBottom: "20px",
              }}
            >
              Step 1 - 4
            </h2>
          </div>
        </div>

        {/* Checkbox for Reschedule Option */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "14px", color: "#555" }}>
            <input
              type="checkbox"
              checked={rescheduleOption}
              onChange={(e) => setRescheduleOption(e.target.checked)}
              style={{ marginRight: "10px", width: "auto" }}
            />
            I want to reschedule or view my bookings (Login/Signup required)
          </label>
        </div>

        {/* Common Fields */}
        {!(login && rescheduleOption) && (
        <> 
          <label style={labelStyle}>First Name: *</label>
          <input type="text" name="first_name" placeholder="First Name" style={inputStyle} value={formData?.first_name} onChange={handleChange} required/>
          <label style={labelStyle}>Last Name: *</label>
          <input type="text" name="last_name" placeholder="Last Name" style={inputStyle} value={formData?.last_name} onChange={handleChange} required/>
          <label style={labelStyle}>Email: *</label>
          <input type="email" name="email" placeholder="Email Id" style={inputStyle} value={formData?.email} onChange={handleChange} required/>
          <div className="row">
                <div className="col" style={{ width: "50%", paddingLeft: "10px", marginBottom: "10px" }}>
                    <label style={labelStyle}>Contact No: *</label>
                    <PhoneInput
                    defaultCountry="ie"
                    value={contactNo}
                    onChange={(phone) => setContactNo(phone)}
                    />
                </div>
            </div>
        </>
        )}

        {/* Conditional Fields for Login/Signup */}
        {rescheduleOption && (
          <>
            <label style={labelStyle}>Username: *</label>
            <input
              type="text"
              name="username"
              placeholder="UserName"
              style={styles.input}
              value={formData?.username}
              onChange={handleChange}
              required
            />
            <label style={labelStyle}>Password: *</label>
            <div style={styles.passwordWrap}>
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData?.password}
                onChange={handleChange}
                required />
                <button
                    type="button"
                    style={styles.showBtn}
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🔒" : "👁️‍🗨️"}
                  </button>
              </div>
            {login && (
              <div style={{ textAlign: "right", marginBottom: "8px" }}>
                <Link to="/forgot-password" style={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Login Option */}
            {!login && (
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "#555" }}>
                  Already have an account?{" "}
                  <a
                    onClick={() => setLogin(true)}
                    style={{
                      color: "#2890cd",
                      textDecoration: "underline",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Login here
                  </a>
                </p>
              </div>
            )}

            {login && (
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "#555" }}>
                  Do not have an account?{" "}
                  <a
                    onClick={() => setLogin(false)}
                    style={{
                      color: "#2890cd",
                      textDecoration: "underline",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Signup here
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <input
        type="submit"
        className="next action-button next-button"
        value={
          loading
            ? "loading..."
            : rescheduleOption
            ? login
              ? "Login"
              : "Signup"
            : "Next"
        }
        onClick={handleLoginOrSignup}
        style={nextButtonStyle}
      />
    </fieldset>
    {/* Popup Dialog */}
    <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title=""
        message={error}
      />
      </>
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
  forgotLink: {
    color: "#2890cd",
    fontWeight: 600,
    textDecoration: "underline",
    fontSize: "14px",
  },
};

export default Step0BookingForm;