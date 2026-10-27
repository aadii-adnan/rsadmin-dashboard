import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './AdminNavbar.css';

export default function AdminNavbar() {
  const { user } = useAuth();
  const isFullSuperAdmin = Boolean(user?.is_full_super_admin);
  const canAccessDjangoAdmin = Boolean(user?.can_access_staff_dashboard);
  return (
    <Navbar expand="lg" className="admin-navbar" sticky="top">
      <Container fluid className="px-4">
        <Navbar.Brand as={NavLink} to="/finance-dashboard" className="admin-navbar-brand">
          {/* Replace with actual img logo if available */}
          RS Express Admin
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="admin-navbar-nav" />
        <Navbar.Collapse id="admin-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {isFullSuperAdmin && <><Nav.Link as={NavLink} to="/finance-dashboard" className="admin-nav-link" end>
              Finance Dashboard
            </Nav.Link>
            <Nav.Link as={NavLink} to="/blog-admin" className="admin-nav-link">
              Blogs Dashboard
            </Nav.Link></>}
            <Nav.Link as={NavLink} to="/bookings-admin" className="admin-nav-link">
              Bookings
            </Nav.Link>
            {canAccessDjangoAdmin && (
              /* Standard anchor tag to break out of React SPA to Django Admin */
              <a style={{background: "default"}} href="/admin-dashboard/" className="nav-link" id='django-admin-btn'>
                Django Admin Panel
              </a>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
