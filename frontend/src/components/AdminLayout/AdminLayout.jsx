import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

export default function AdminLayout() {
  return (
    <div className="admin-layout-wrapper">
      <AdminNavbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
