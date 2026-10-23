import React from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FiSearch, FiSliders, FiX } from "react-icons/fi";

const TEXT_FILTERS = [
  { key: "status", label: "Status ID", placeholder: "Optional status ID", type: "number" },
  { key: "service", label: "Service ID", placeholder: "Optional service ID", type: "number" },
];

export default function BookingFilters({ filters, onChange, onSubmit, onClear, isFullSuperAdmin, loading }) {
  const update = (key, value) => onChange((current) => ({ ...current, [key]: value }));

  return (
    <Form className="booking-filter-card" onSubmit={onSubmit}>
      <Row className="g-3">
        <Col lg={4}>
          <Form.Label htmlFor="booking-search">Search bookings</Form.Label>
          <InputGroup><InputGroup.Text aria-hidden="true"><FiSearch /></InputGroup.Text><Form.Control
            id="booking-search" type="search"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Booking ID, customer, phone, vehicle…"
          /></InputGroup>
        </Col>
        <Col lg={4}>
          <Form.Label htmlFor="booking-order">Sort by</Form.Label>
          <Form.Select id="booking-order" value={filters.ordering} onChange={(event) => update("ordering", event.target.value)}>
            <option value="-created_at">Newest created</option>
            <option value="created_at">Oldest created</option>
            <option value="departure_time">Departure: earliest first</option>
            <option value="-departure_time">Departure: latest first</option>
            <option value="return_time">Return: earliest first</option>
            <option value="-return_time">Return: latest first</option>
            <option value="booking_id">Booking ID: A–Z</option>
            <option value="-booking_id">Booking ID: Z–A</option>
            <option value="status">Status: A–Z</option>
            <option value="service">Service: A–Z</option>
          </Form.Select>
        </Col>
        {TEXT_FILTERS.map(({ key, label, placeholder, type }) => (
          <Col md={6} lg={2} key={key}>
            <Form.Label htmlFor={`filter-${key}`}>{label}</Form.Label>
            <Form.Control
              id={`filter-${key}`}
              type={type}
              min="1"
              value={filters[key]}
              onChange={(event) => update(key, event.target.value)}
              placeholder={placeholder}
            />
          </Col>
        ))}
      </Row>

      <details className="booking-advanced-filters"><summary><FiSliders aria-hidden="true" /> More filters: dates and scope</summary><fieldset className="booking-filter-fieldset">
        <legend>Operational dates</legend>
        <Row className="g-3">
          {[
            ["departure_date_from", "Departure from"], ["departure_date_to", "Departure to"],
            ["return_date_from", "Return from"], ["return_date_to", "Return to"],
            ["created_date_from", "Created from"], ["created_date_to", "Created to"],
          ].map(([key, label]) => (
            <Col sm={6} lg={2} key={key}>
              <Form.Label htmlFor={`filter-${key}`}>{label}</Form.Label>
              <Form.Control id={`filter-${key}`} type="date" value={filters[key]} onChange={(event) => update(key, event.target.value)} />
            </Col>
          ))}
        </Row>
      </fieldset>

      {isFullSuperAdmin && (
        <fieldset className="booking-filter-fieldset">
          <legend>Full administrator filters</legend>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label htmlFor="filter-website">Website</Form.Label>
              <Form.Control id="filter-website" value={filters.website} onChange={(event) => update("website", event.target.value)} placeholder="e.g. rsexpressparking" />
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="filter-supplier">Supplier</Form.Label>
              <Form.Control id="filter-supplier" value={filters.supplier} onChange={(event) => update("supplier", event.target.value)} placeholder="Supplier ID or all_suppliers" />
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="filter-source">Source</Form.Label>
              <Form.Control id="filter-source" value={filters.source} onChange={(event) => update("source", event.target.value)} placeholder="e.g. Google Ads" />
            </Col>
          </Row>
        </fieldset>
      )}

      </details>
      <div className="booking-filter-actions">
        <Button type="submit" className="finance-primary-btn" disabled={loading}>
          <FiSearch aria-hidden="true" />
          {loading ? "Applying…" : "Apply filters"}
        </Button>
        <Button type="button" className="finance-secondary-btn" onClick={onClear} disabled={loading}>
          <FiX aria-hidden="true" />
          Clear
        </Button>
      </div>
    </Form>
  );
}
