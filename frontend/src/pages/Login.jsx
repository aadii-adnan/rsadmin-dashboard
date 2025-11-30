import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PopupDialog from "../components/Utility/PopupDialog";
import parkingImg from "../assets/parking.webp";
import bannerImg from "../assets/banner-img1.webp";

const Login = () => {
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ open: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validate = () => {
    if (!isLogin) {
      if (!formData.first_name) return "First name is required.";
      if (!formData.last_name) return "Last name is required.";
      if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email))
        return "A valid email is required.";
      if (!formData.phone || formData.phone.length < 10)
        return "Phone must be at least 10 digits.";
      if (!formData.username || formData.username.length < 3)
        return "Username must be at least 3 characters.";
      if (!formData.password || formData.password.length < 6)
        return "Password must be at least 6 characters.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const error = validate();
    if (error) {
      setPopup({ open: true, message: error });
      setLoading(false);
      return;
    }
    try {
      if (isLogin) {
        await loginUser(formData.username.trim(), formData.password);
        navigate("/");
      } else {
        // Signup
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/register/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              email: formData.email.trim(),
              username: formData.username.trim(),
              password: formData.password,
              phone: formData.phone.trim(),
            }),
          }
        );
        if (res.status === 409) throw new Error("Username already exists");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Signup failed.");
        }
        // Auto-login after signup
        await loginUser(formData.username.trim(), formData.password);
        navigate("/");
      }
    } catch (err) {
      setPopup({ open: true, message: err.message || "An error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-stretch justify-content-center p-0" style={{background: "linear-gradient(120deg, #fff 0%, #e3eafc 100%)"}}>
      <div className="row flex-grow-1 w-100 m-0">
        {/* Left Banner */}
        <div className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center p-0" style={{background: "#010659"}}>
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
            <div style={{
              marginBottom: 18,
              background: "rgba(255,255,255,0.85)",
              borderRadius: "50%",
              padding: 6,
              boxShadow: "0 2px 12px rgba(40,144,205,0.10)",
            }}>
              <img src="/images/icon.webp" alt="RS Express Parking" style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                objectFit: "cover",
                background: "#fff",
              }} />
            </div>
            <h2 style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: "2.3rem",
              margin: "18px 0 8px 0",
              letterSpacing: "1px",
              textAlign: "center",
              textShadow: "0 2px 16px rgba(1,6,89,0.18)",
            }}>Welcome to RS Express Parking</h2>
            <p style={{
              color: "#e3eafc",
              fontSize: "1.2rem",
              marginBottom: 24,
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: 360,
              textShadow: "0 2px 8px rgba(1,6,89,0.18)",
              background: "rgba(1,6,89,0.18)",
              borderRadius: "8px",
              padding: "8px 16px",
            }}>
              Secure, affordable, and stress-free airport parking.<br />
              Book, manage, and travel with confidence.
            </p>
          </div>
        </div>
        {/* Right Form */}
        <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-0" style={{background: "transparent"}}>
          <div style={{
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
          }}>
            <h2 style={{
              color: "#2890cd",
              fontWeight: 700,
              fontSize: "1.6rem",
              marginBottom: 24,
              textAlign: "center",
              letterSpacing: "1px",
            }}>
              {isLogin ? "Sign In to Your Account" : "Create Your Account"}
            </h2>
            <form style={{display: "flex", flexDirection: "column", gap: "10px"}} onSubmit={handleSubmit} autoComplete="off">
              {!isLogin && (
                <div className="row">
                  <div className="col-12 col-md-6 mb-2 mb-md-0">
                    <label style={styles.label}>First Name *</label>
                    <input
                      style={styles.input}
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="First Name"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label style={styles.label}>Last Name *</label>
                    <input
                      style={styles.input}
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Last Name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              )}
              {!isLogin && (
                <>
                  <label style={styles.label}>Email *</label>
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    autoComplete="email"
                  />
                  <label style={styles.label}>Phone *</label>
                  <input
                    style={styles.input}
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone"
                    autoComplete="tel"
                  />
                </>
              )}
              <label style={styles.label}>Username *</label>
              <input
                style={styles.input}
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                autoComplete="username"
              />
              <label style={styles.label}>Password *</label>
              <div style={styles.passwordWrap}>
                <input
                  style={{ ...styles.input, marginBottom: 0 }}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
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
              <button
                type="submit"
                style={styles.button}
                disabled={loading}
                onMouseOver={e => (e.target.style.backgroundColor = "#0056b3")}
                onMouseOut={e => (e.target.style.backgroundColor = "#2890cd")}
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                  ? "Login"
                  : "Sign Up"}
              </button>
              <div style={styles.switchText}>
                {isLogin ? (
                  <>
                    Don't have an account?{" "}
                    <span
                      style={styles.link}
                      onClick={() => setIsLogin(false)}
                    >
                      Sign Up
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span
                      style={styles.link}
                      onClick={() => setIsLogin(true)}
                    >
                      Login
                    </span>
                  </>
                )}
              </div>
            </form>
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
    fontSize: "1.2rem",
    cursor: "pointer",
    color: "#2890cd",
    padding: 0,
    outline: "none",
  },
  button: {
    marginTop: "18px",
    padding: "12px 0",
    backgroundColor: "#2890cd",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1.1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 2px 12px rgba(40,144,205,0.10)",
    letterSpacing: "1px",
  },
  switchText: {
    marginTop: "18px",
    textAlign: "center",
    color: "#6c757d",
    fontSize: "15px",
  },
  link: {
    color: "#2890cd",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline",
    marginLeft: "4px",
  },
};

export default Login;