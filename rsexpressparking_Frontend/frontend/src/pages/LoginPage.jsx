import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Helmet } from 'react-helmet-async';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);

      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.is_manager) {
        navigate("/manager-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <>
    <Helmet>
        <title>Login | RS Express Parking</title>
        <meta name="description" content="Login to book and manage your RS Express Parking bookings." />
    </Helmet>
    <div style={{ padding: "30px" }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: "400px" }}>
        <div>
          <label>Email:</label><br />
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "15px" }}
          />
        </div>

        <div>
          <label>Password:</label><br />
          <input
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "15px" }}
          />
        </div>

        {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

        <button type="submit" style={{ padding: "10px 20px" }}>Login</button>
      </form>
    </div>
    </>
  );
}

export default LoginPage;
