import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Navigation protection only. Every management endpoint independently checks
// IsFullSuperAdmin in Django.
export default function RequireFullSuperAdmin() {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-fallback">Loading account...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.is_full_super_admin) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
