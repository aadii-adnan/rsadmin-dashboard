import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
import OperationsShell from './OperationsShell';

export default function AdminLayout() {
  const { pathname } = useLocation();
  if (pathname === '/bookings-admin' || pathname.startsWith('/bookings-admin/') || pathname.startsWith('/users-admin') || pathname.startsWith('/catalog-admin') || pathname.startsWith('/communications-admin') || pathname.startsWith('/payments-admin')) {
    return <OperationsShell><Outlet /></OperationsShell>;
  }
  return <div className="admin-layout-wrapper"><AdminNavbar /><main><Outlet /></main></div>;
}
