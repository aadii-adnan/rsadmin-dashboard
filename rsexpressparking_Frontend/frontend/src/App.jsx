import { Routes, Route, useNavigate } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import Home from "./pages/Home";
import SignupPage from "./pages/SignupPage";
import Services from "./pages/Services";
import Header from "./components/Utility/Header";
import Footer from "./components/Utility/Footer"; 
import BookingForm from "./pages/BookingForm";
import { useAuth } from './auth/AuthContext';

function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  logout();
  navigate("/");

  return null; 
}

function App() {
  return (
    <>
      <Header /> 
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book/:slug" element={<BookingForm />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager-dashboard"
          element={
            <ProtectedRoute managerOnly={true}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;