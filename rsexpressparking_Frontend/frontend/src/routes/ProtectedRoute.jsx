import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute({ children, managerOnly = false }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (managerOnly && !user.is_manager) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
