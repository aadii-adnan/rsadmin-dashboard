import React, {useState} from 'react'
import { useAuth } from '../../auth/AuthContext';

const Step0BookingForm = ({ formData, handleChange, labelStyle, inputStyle, setFormData, goNext, nextButtonStyle}) => {
    const { login: loginUser } = useAuth();
    const [login, setLogin] = useState(false);

    const handleLoginOrSignup = async (e) => {
        e.preventDefault();
      
        const trimmedFormData = {
          username: formData.username?.trim(),
          password: formData.password,
          first_name: formData.first_name?.trim(),
          last_name: formData.last_name?.trim(),
          email: formData.email?.trim(),
        };
      
        const errors = [];
      
        if (!login) {
          if (!trimmedFormData.first_name) {
            errors.push("First name is required.");
          }
          if (!trimmedFormData.last_name) {
            errors.push("Last name is required.");
          }
          if (!trimmedFormData.email || !/^\S+@\S+\.\S+$/.test(trimmedFormData.email)) {
            errors.push("A valid email is required.");
          }
          if (!trimmedFormData.username || trimmedFormData.username.length < 3) {
            errors.push("Username must be at least 3 characters.");
          }
        
          if (!trimmedFormData.password || trimmedFormData.password.length < 6) {
            errors.push("Password must be at least 6 characters.");
          }
        }
      
        if (errors.length > 0) {
          alert(errors.join("\n"));
          return;
        }
      
        try {
          if (login) {
            await loginUser(trimmedFormData.username, trimmedFormData.password);
            if(localStorage.getItem("user")) {
                const user = JSON.parse(localStorage.getItem("user"));
                setFormData((prev) => ({
                    ...prev,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    username: user.username,
                }));
            }
            alert("Login successful!");
          } else {
            const registerRes = await fetch('http://localhost:8000/api/auth/register/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                first_name: trimmedFormData.first_name,
                last_name: trimmedFormData.last_name,
                email: trimmedFormData.email,
                username: trimmedFormData.username,
                password: trimmedFormData.password,
              }),
            });
      
            if (!registerRes.ok) {
              const errorData = await registerRes.json();
              throw new Error(errorData.message || "Signup failed.");
            }
      
            // Auto-login after successful signup
            await loginUser(trimmedFormData.username, trimmedFormData.password);
            alert("Signup and login successful!");
          }
      
          goNext(); // Redirect or next action
        } catch (err) {
          console.error(err);
          alert(err.message || "An unexpected error occurred.");
        }
      };


  return (
    <fieldset className="fieldset active">
        <div className="form-card">
        <div className="row">
            <div className="col-7">
            <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>Account Information:</h2>
            </div>
            <div className="col-5">
            <h2 className="steps" style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>Step 1 - 4</h2>
            </div>
        </div>
        {!login && (
            <>
                <label style={labelStyle}>First Name: *</label>
                <input type="text" name="first_name" placeholder="First Name" style={inputStyle} value={formData?.first_name} onChange={handleChange} required />
                <label style={labelStyle}>Last Name: *</label>
                <input type="text" name="last_name" placeholder="Last Name" style={inputStyle} value={formData?.last_name} onChange={handleChange} required />
                <label style={labelStyle}>Email: *</label>
                <input type="email" name="email" placeholder="Email Id" style={inputStyle} value={formData?.email} onChange={handleChange} required />
            </>
        )}
        <label style={labelStyle}>Username: *</label>
        <input type="text" name="username" placeholder="UserName" style={inputStyle} value={formData?.username} onChange={handleChange} required />
        <label style={labelStyle}>Password: *</label>
        <input type="password" name="password" placeholder="Password" style={inputStyle} value={formData?.password} onChange={handleChange} required />

        {/* Login Option */}
        {!login && <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#555" }}> Already have an account?{" "}
                <a onClick={() => setLogin(true)} style={{ color: "#2890cd", textDecoration: "underline", fontWeight: "bold", cursor: "pointer" }}>
                    Login here
                </a>
            </p>
        </div>}

        {login && <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#555" }}> Do not have a account?{" "}
                <a onClick={() => setLogin(false)} style={{ color: "#2890cd", textDecoration: "underline", fontWeight: "bold", cursor: "pointer" }}>
                    Signup here
                </a>
            </p>
        </div>}
        </div>
        <input type="submit" className="next action-button" value={login ? "Login" : "Signup"} onClick={handleLoginOrSignup} style={nextButtonStyle} />
    </fieldset>
  )
}

export default Step0BookingForm