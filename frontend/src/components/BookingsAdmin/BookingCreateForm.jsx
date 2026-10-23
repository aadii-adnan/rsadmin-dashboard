import React, { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { createStaffBooking, getStaffBookingEditOptions } from "./bookingAdminApi";

const INITIAL_VALUES = {
  booking_id: "", service: "", add_ons: [], status: "", website: "rsexpressparking",
  first_name: "", last_name: "", email: "", contact_no: "", total_passengers: "1",
  car_registration_no: "", car_manufacturer: "", car_model: "", car_colour: "",
  departure_terminal: "", return_terminal: "", departure_flight_number: "", return_flight_number: "",
  departure_time: "", return_time: "", total_price: "", discounted_price: "",
  coupon: "", bonus_points_used: "0", note: "",
};

function Field({ name, label, errors, children, required = false }) {
  const control = typeof children.type === "string"
    ? children
    : React.cloneElement(children, { isInvalid: Boolean(errors[name]), "aria-describedby": errors[name] ? `create-error-${name}` : undefined });
  return <Form.Group className="mb-3" controlId={`create-${name}`}>
    <Form.Label>{label}{required && <span aria-hidden="true"> *</span>}</Form.Label>
    {control}
    <Form.Control.Feedback id={`create-error-${name}`} type="invalid">{errors[name]?.[0]}</Form.Control.Feedback>
  </Form.Group>;
}

export default function BookingCreateForm({ isSupplier, isManager, onCancel, onCreated }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    getStaffBookingEditOptions(controller.signal)
      .then(setOptions)
      .catch((error) => { if (error.name !== "AbortError") setErrors({ non_field_errors: [error.message] }); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOptions(false); });
    return () => controller.abort();
  }, []);

  const change = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const toggleAddOn = (id) => setValues((current) => ({
    ...current,
    add_ons: current.add_ons.includes(String(id))
      ? current.add_ons.filter((item) => item !== String(id))
      : [...current.add_ons, String(id)],
  }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      ...values,
      service: Number(values.service),
      add_ons: values.add_ons.map(Number),
      total_passengers: Number(values.total_passengers),
      departure_time: values.departure_time ? new Date(values.departure_time).toISOString() : "",
      return_time: values.return_time ? new Date(values.return_time).toISOString() : "",
      total_price: values.total_price,
      discounted_price: values.discounted_price || null,
      coupon: values.coupon ? Number(values.coupon) : null,
      bonus_points_used: values.bonus_points_used || "0",
    };
    if (isSupplier) {
      delete payload.status;
      delete payload.website;
      if (!payload.booking_id.trim()) delete payload.booking_id;
    } else {
      delete payload.booking_id;
    }

    try {
      const booking = await createStaffBooking(payload);
      onCreated(booking);
    } catch (error) {
      setErrors(error.fieldErrors || { non_field_errors: [error.message] });
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) return <div className="booking-list-state" role="status"><Spinner animation="border" size="sm" /> Loading booking options...</div>;

  return <Form className="booking-edit-form booking-create-form" onSubmit={submit} noValidate>
    <div className="booking-form-heading"><div><span className="booking-eyebrow">New operational record</span><h2>Create booking</h2><p>Required fields are validated by the server before the booking is created.</p></div></div>
    {errors.non_field_errors && <Alert variant="danger">{errors.non_field_errors.join(" ")}</Alert>}
    {isSupplier && <Alert variant="info" className="booking-create-supplier-note">This booking will be assigned to your supplier account automatically.</Alert>}

    <h3>Customer information</h3><Row>
      <Col md={6}><Field name="first_name" label="First name" errors={errors} required><Form.Control value={values.first_name} onChange={(event) => change("first_name", event.target.value)} /></Field></Col>
      <Col md={6}><Field name="last_name" label="Last name" errors={errors} required><Form.Control value={values.last_name} onChange={(event) => change("last_name", event.target.value)} /></Field></Col>
      <Col md={6}><Field name="email" label="Email" errors={errors} required><Form.Control type="email" value={values.email} onChange={(event) => change("email", event.target.value)} /></Field></Col>
      <Col md={6}><Field name="contact_no" label="Phone" errors={errors} required><Form.Control value={values.contact_no} onChange={(event) => change("contact_no", event.target.value)} /></Field></Col>
      <Col md={6}><Field name="total_passengers" label="Passengers" errors={errors} required><Form.Control type="number" min="1" value={values.total_passengers} onChange={(event) => change("total_passengers", event.target.value)} /></Field></Col>
      {isSupplier && <Col md={6}><Field name="booking_id" label="Supplier booking ID" errors={errors}><Form.Control value={values.booking_id} onChange={(event) => change("booking_id", event.target.value)} placeholder="Required only if your supplier uses custom IDs" /></Field></Col>}
    </Row>

    <h3>Vehicle and travel</h3><Row>
      {[["car_registration_no", "Registration"], ["car_manufacturer", "Manufacturer"], ["car_model", "Model"], ["car_colour", "Colour"], ["departure_terminal", "Departure terminal"], ["return_terminal", "Return terminal"], ["departure_flight_number", "Departure flight"], ["return_flight_number", "Return flight"]].map(([name, label]) => <Col md={6} key={name}><Field name={name} label={label} errors={errors} required={!name.includes("flight")}><Form.Control value={values[name]} onChange={(event) => change(name, event.target.value)} /></Field></Col>)}
      <Col md={6}><Field name="departure_time" label="Departure time" errors={errors} required><Form.Control type="datetime-local" value={values.departure_time} onChange={(event) => change("departure_time", event.target.value)} /></Field></Col>
      <Col md={6}><Field name="return_time" label="Return time" errors={errors} required><Form.Control type="datetime-local" value={values.return_time} onChange={(event) => change("return_time", event.target.value)} /></Field></Col>
    </Row>

    <h3>Service, status, and price</h3><Row>
      <Col md={6}><Field name="service" label="Service" errors={errors} required><Form.Select value={values.service} onChange={(event) => change("service", event.target.value)}><option value="">Select service</option>{options?.services?.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Form.Select></Field></Col>
      {!isSupplier && <Col md={6}><Field name="status" label="Status" errors={errors} required><Form.Select value={values.status} onChange={(event) => change("status", event.target.value)}><option value="">Select status</option>{options?.statuses?.filter((status) => !isManager || !["pending", "payment failed"].includes(String(status.name).toLowerCase())).map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</Form.Select></Field></Col>}
      {!isSupplier && <Col md={6}><Field name="website" label="Website" errors={errors} required><Form.Select value={values.website} onChange={(event) => change("website", event.target.value)}><option value="rsexpressparking">RS Express Parking</option><option value="dublinairportparking">Dublin Airport Parking</option></Form.Select></Field></Col>}
      <Col md={4}><Field name="total_price" label="Total price" errors={errors} required><Form.Control type="number" min="0" step="0.01" value={values.total_price} onChange={(event) => change("total_price", event.target.value)} /></Field></Col>
      <Col md={4}><Field name="discounted_price" label="Discounted price" errors={errors}><Form.Control type="number" min="0" step="0.01" value={values.discounted_price} onChange={(event) => change("discounted_price", event.target.value)} /></Field></Col>
      <Col md={4}><Field name="coupon" label="Coupon ID" errors={errors}><Form.Control type="number" min="1" value={values.coupon} onChange={(event) => change("coupon", event.target.value)} /></Field></Col>
      <Col md={4}><Field name="bonus_points_used" label="Bonus points used" errors={errors}><Form.Control type="number" min="0" step="0.01" value={values.bonus_points_used} onChange={(event) => change("bonus_points_used", event.target.value)} /></Field></Col>
      <Col xs={12}><Field name="add_ons" label="Add-ons" errors={errors}><div className="booking-addon-list">{options?.addOns?.map((addOn) => <Form.Check key={addOn.id} type="checkbox" label={addOn.name} checked={values.add_ons.includes(String(addOn.id))} onChange={() => toggleAddOn(addOn.id)} />)}</div></Field></Col>
      <Col xs={12}><Field name="note" label="Internal note" errors={errors}><Form.Control as="textarea" rows={3} value={values.note} onChange={(event) => change("note", event.target.value)} /></Field></Col>
    </Row>

    <div className="booking-edit-actions"><Button type="submit" className="finance-primary-btn" disabled={saving}>{saving ? "Creating..." : <><FiPlus aria-hidden="true" />Create booking</>}</Button><Button type="button" variant="outline-secondary" onClick={onCancel} disabled={saving}><FiArrowLeft aria-hidden="true" />Back to list</Button></div>
  </Form>;
}
