import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FiGrid, FiBookOpen, FiCalendar, FiArrowUpRight, FiShield, FiChevronRight, FiUsers, FiSettings, FiMessageSquare, FiCreditCard } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';
import simpleLogo from '../../assets/logo-238.webp';
import simpleLogo2x from '../../assets/logo-476.webp';
import './operationsShell.css';
import '../BookingsAdmin/bookingsAdmin.css';

export default function OperationsShell({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const role = user?.is_full_super_admin ? 'Super administrator' : user?.is_manager ? 'Manager' : user?.is_supplier ? 'Supplier' : 'Staff';
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || user?.email || 'Staff account';
  return <div className="operations-shell">
    <a className="operations-skip" href="#operations-main">Skip to content</a>
    <aside className="operations-sidebar" aria-label="Operations navigation">
      <Link to="/bookings-admin" className="operations-brand" aria-label="RS Express Parking operations workspace"><img src={simpleLogo} srcSet={`${simpleLogo} 1x, ${simpleLogo2x} 2x`} alt="RS Express Parking" width="238" height="60" decoding="async" style={{ width: "156px", height: "auto", maxWidth: "100%" }} /></Link>
      <span className="operations-nav-label">Workspace</span>
      <nav aria-label="Dashboard"><NavLink to="/bookings-admin"><FiCalendar aria-hidden="true" />Bookings</NavLink>{user?.is_full_super_admin && <><NavLink to="/users-admin"><FiUsers aria-hidden="true" />People & credits</NavLink><NavLink to="/catalog-admin"><FiSettings aria-hidden="true" />Configuration</NavLink><NavLink to="/communications-admin"><FiMessageSquare aria-hidden="true" />Contact & marketing</NavLink><NavLink to="/payments-admin"><FiCreditCard aria-hidden="true" />Payment review</NavLink></>}<NavLink to="/finance-dashboard"><FiGrid aria-hidden="true" />Finance</NavLink><NavLink to="/blog-admin"><FiBookOpen aria-hidden="true" />Blogs</NavLink></nav>
      <a className="operations-admin-link" href="/admin-dashboard/"><FiShield aria-hidden="true" />Django Admin<FiArrowUpRight aria-hidden="true" /></a>
      <div className="operations-sidebar-note">Booking operations<span>Manage the details. Keep journeys moving.</span></div>
    </aside>
    <div className="operations-workspace">
      <header className="operations-topbar"><nav aria-label="Breadcrumb"><Link to="/bookings-admin">Workspace</Link><FiChevronRight aria-hidden="true" /><Link to="/bookings-admin">Bookings</Link>{pathname !== '/bookings-admin' && <><FiChevronRight aria-hidden="true" /><span>Booking details</span></>}</nav><div className="operations-account"><span className="operations-presence" aria-hidden="true" /><span className="operations-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><span>{role}</span></div></div></header>
      <main id="operations-main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
