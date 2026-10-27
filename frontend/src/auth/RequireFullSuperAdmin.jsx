import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isUsableToken } from "./fetch";

// Navigation protection only. Every management endpoint independently checks
// IsFullSuperAdmin in Django.
export default function RequireFullSuperAdmin() {
  const { loading, user } = useAuth();
  const location = useLocation();
  const legacyParams = new URLSearchParams(location.search);
  const legacyAccess = legacyParams.get("access");
  const legacyRefresh = legacyParams.get("refresh");

  // Older Django-Admin links issued a finance/blog token in the URL. Consume
  // it once as the normal application session, remove it from the URL, then
  // allow AuthContext to restore the shared user profile after reload.
  if (!isUsableToken(localStorage.getItem("access_token"))
    && isUsableToken(legacyAccess)
    && isUsableToken(legacyRefresh)) {
    localStorage.setItem("access_token", legacyAccess);
    localStorage.setItem("refresh_token", legacyRefresh);
    legacyParams.delete("access");
    legacyParams.delete("refresh");
    window.location.replace(`${location.pathname}${legacyParams.toString() ? `?${legacyParams}` : ""}`);
    return <div className="route-fallback">Restoring account...</div>;
  }
  if (loading) return <div className="route-fallback">Loading account...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.is_full_super_admin) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
