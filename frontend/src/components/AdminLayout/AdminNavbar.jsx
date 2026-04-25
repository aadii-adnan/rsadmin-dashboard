import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import './AdminNavbar.css';

export default function AdminNavbar() {
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
            <Nav.Link as={NavLink} to="/finance-dashboard" className="admin-nav-link" end>
              Finance Dashboard
            </Nav.Link>
            <Nav.Link as={NavLink} to="/blog-admin" className="admin-nav-link">
              Blogs Dashboard
            </Nav.Link>
            {/* Standard anchor tag to break out of React SPA to Django Admin */}
            <a style={{background: "default"}} href="/admin-dashboard/" className="nav-link" id='django-admin-btn'>
              Django Admin Panel
            </a>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
