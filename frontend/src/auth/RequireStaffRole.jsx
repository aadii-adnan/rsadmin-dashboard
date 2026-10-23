import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Client-side protection for future staff routes.
 *
 * This is intentionally not the security boundary. Staff API endpoints must
 * use DRF permissions and object-level queryset restrictions independently.
 */
export default function RequireStaffRole() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="route-fallback">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user.can_access_staff_dashboard) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
