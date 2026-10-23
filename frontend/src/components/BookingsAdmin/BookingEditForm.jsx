import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Col, Form, Row, Spinner } from "react-bootstrap";
import {
  getStaffBookingEditOptions,
  updateStaffBooking,
  updateStaffBookingAndNotify,
} from "./bookingAdminApi";

function toInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValues(booking) {
  return {
    first_name: booking.customer?.first_name || "", last_name: booking.customer?.last_name || "",
    email: booking.customer?.email || "", contact_no: booking.customer?.contact_no || "",
    total_passengers: booking.customer?.total_passengers ?? "",
    car_registration_no: booking.vehicle?.registration || "", car_manufacturer: booking.vehicle?.manufacturer || "",
    car_model: booking.vehicle?.model || "", car_colour: booking.vehicle?.colour || "",
    departure_terminal: booking.travel?.departure_terminal || "", return_terminal: booking.travel?.return_terminal || "",
    departure_flight_number: booking.travel?.departure_flight_number || "", return_flight_number: booking.travel?.return_flight_number || "",
    departure_time: toInputDateTime(booking.travel?.departure_time), return_time: toInputDateTime(booking.travel?.return_time),
    service: booking.service_details?.id || "", add_ons: booking.service_details?.add_ons?.map((addOn) => String(addOn.id)) || [],
    status: booking.status_details?.id || "", note: booking.status_details?.note || "",
    customer_experience: booking.customer_experience?.experience || "", customer_experience_details: booking.customer_experience?.details || "",
    total_price: booking.pricing?.total || "", discounted_price: booking.pricing?.discounted || "",
    coupon: booking.pricing?.coupon_id || "", bonus_points_used: booking.pricing?.bonus_points_used || "",
    previous_price: booking.pricing?.previous_price || "", supplier_extended_amount: booking.pricing?.supplier_extended_amount || "",
  };
}

function Field({ name, label, editable, errors, children }) {
  if (!editable) return null;
  return <Form.Group className="mb-3" controlId={`edit-${name}`}><Form.Label>{label}</Form.Label>{React.isValidElement(children) ? React.cloneElement(children, { "aria-describedby": errors[name] ? `error-${name}` : undefined }) : children}<Form.Control.Feedback id={`error-${name}`} type="invalid" className={errors[name] ? "d-block" : ""}>{errors[name]?.[0]}</Form.Control.Feedback></Form.Group>;
}

export default function BookingEditForm({ booking, onCancel, onSaved, onNotification }) {
  const [values, setValues] = useState(() => initialValues(booking));
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [dirtyFields, setDirtyFields] = useState(() => new Set());
  const editable = useMemo(() => new Set(booking.editable_fields || []), [booking.editable_fields]);

  useEffect(() => {
    const controller = new AbortController();
    getStaffBookingEditOptions(controller.signal)
      .then(setOptions)
      .catch((error) => { if (error.name !== "AbortError") setErrors({ non_field_errors: [error.message] }); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOptions(false); });
    return () => controller.abort();
  }, []);

  const change = (name, value) => {
    setDirtyFields((current) => new Set(current).add(name));
    setValues((current) => ({ ...current, [name]: value }));
  };
  const toggleAddOn = (id) => {
    setDirtyFields((current) => new Set(current).add("add_ons"));
    setValues((current) => ({
    ...current,
    add_ons: current.add_ons.includes(String(id))
      ? current.add_ons.filter((item) => item !== String(id))
      : [...current.add_ons, String(id)],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {};
    dirtyFields.forEach((field) => {
      let value = values[field];
      if (["total_passengers", "service", "status", "coupon"].includes(field)) value = value === "" ? null : Number(value);
      if (field === "add_ons") value = value.map(Number);
      if (["departure_time", "return_time"].includes(field) && value) value = new Date(value).toISOString();
      if (["total_price", "discounted_price", "bonus_points_used", "previous_price", "supplier_extended_amount"].includes(field)) value = value === "" ? null : value;
      if (["customer_experience"].includes(field)) value = value || null;
      payload[field] = value;
    });
    if (!Object.keys(payload).length) {
      onCancel();
      return;
    }
    try {
      const shouldNotify = event.nativeEvent.submitter?.value === "notify";
      if (shouldNotify) {
        const result = await updateStaffBookingAndNotify(booking.id, payload);
        onSaved(result.booking);
        onNotification?.(result.notification);
      } else {
        const updated = await updateStaffBooking(booking.id, payload);
        onSaved(updated);
      }
    } catch (error) {
      setErrors(error.fieldErrors || { non_field_errors: [error.message] });
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) return <div className="booking-list-state"><Spinner animation="border" size="sm" /> Loading edit options...</div>;

  return <Form className="booking-edit-form" onSubmit={submit}>
    {errors.non_field_errors && <Alert variant="danger">{errors.non_field_errors.join(" ")}</Alert>}
    <h2>Edit booking</h2>
    <h3>Customer information</h3><Row><Col md={6}><Field name="first_name" label="First name" editable={editable.has("first_name")} errors={errors}><Form.Control value={values.first_name} onChange={(event) => change("first_name", event.target.value)} isInvalid={Boolean(errors.first_name)} /></Field></Col><Col md={6}><Field name="last_name" label="Last name" editable={editable.has("last_name")} errors={errors}><Form.Control value={values.last_name} onChange={(event) => change("last_name", event.target.value)} isInvalid={Boolean(errors.last_name)} /></Field></Col><Col md={6}><Field name="email" label="Email" editable={editable.has("email")} errors={errors}><Form.Control type="email" value={values.email} onChange={(event) => change("email", event.target.value)} isInvalid={Boolean(errors.email)} /></Field></Col><Col md={6}><Field name="contact_no" label="Phone" editable={editable.has("contact_no")} errors={errors}><Form.Control value={values.contact_no} onChange={(event) => change("contact_no", event.target.value)} isInvalid={Boolean(errors.contact_no)} /></Field></Col><Col md={6}><Field name="total_passengers" label="Passengers" editable={editable.has("total_passengers")} errors={errors}><Form.Control type="number" min="1" value={values.total_passengers} onChange={(event) => change("total_passengers", event.target.value)} isInvalid={Boolean(errors.total_passengers)} /></Field></Col></Row>
    <h3>Vehicle and travel</h3><Row>{[["car_registration_no", "Registration"], ["car_manufacturer", "Manufacturer"], ["car_model", "Model"], ["car_colour", "Colour"], ["departure_terminal", "Departure terminal"], ["return_terminal", "Return terminal"], ["departure_flight_number", "Departure flight"], ["return_flight_number", "Return flight"]].map(([name, label]) => <Col md={6} key={name}><Field name={name} label={label} editable={editable.has(name)} errors={errors}><Form.Control value={values[name]} onChange={(event) => change(name, event.target.value)} isInvalid={Boolean(errors[name])} /></Field></Col>)}<Col md={6}><Field name="departure_time" label="Departure time" editable={editable.has("departure_time")} errors={errors}><Form.Control type="datetime-local" value={values.departure_time} onChange={(event) => change("departure_time", event.target.value)} isInvalid={Boolean(errors.departure_time)} /></Field></Col><Col md={6}><Field name="return_time" label="Return time" editable={editable.has("return_time")} errors={errors}><Form.Control type="datetime-local" value={values.return_time} onChange={(event) => change("return_time", event.target.value)} isInvalid={Boolean(errors.return_time)} /></Field></Col></Row>
    <h3>Service and status</h3><Row><Col md={6}><Field name="service" label="Service" editable={editable.has("service")} errors={errors}><Form.Select value={values.service} onChange={(event) => change("service", event.target.value)} isInvalid={Boolean(errors.service)}><option value="">Select service</option>{options?.services?.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Form.Select></Field></Col><Col md={6}><Field name="status" label="Status" editable={editable.has("status")} errors={errors}><Form.Select value={values.status} onChange={(event) => change("status", event.target.value)} isInvalid={Boolean(errors.status)}><option value="">No status</option>{options?.statuses?.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</Form.Select></Field></Col><Col xs={12}><Field name="add_ons" label="Add-ons" editable={editable.has("add_ons")} errors={errors}><div className="booking-addon-list">{options?.addOns?.map((addOn) => <Form.Check id={`addon-${addOn.id}`} key={addOn.id} type="checkbox" label={addOn.name} checked={values.add_ons.includes(String(addOn.id))} onChange={() => toggleAddOn(addOn.id)} />)}</div></Field></Col><Col xs={12}><Field name="note" label="Internal note" editable={editable.has("note")} errors={errors}><Form.Control as="textarea" rows={3} value={values.note} onChange={(event) => change("note", event.target.value)} isInvalid={Boolean(errors.note)} /></Field></Col></Row>
    {(editable.has("customer_experience") || editable.has("customer_experience_details")) && <><h3>Customer experience</h3><Row><Col md={6}><Field name="customer_experience" label="Review" editable={editable.has("customer_experience")} errors={errors}><Form.Select value={values.customer_experience} onChange={(event) => change("customer_experience", event.target.value)} isInvalid={Boolean(errors.customer_experience)}><option value="">No review</option><option value="good">Good</option><option value="bad">Bad</option></Form.Select></Field></Col><Col md={6}><Field name="customer_experience_details" label="Review details" editable={editable.has("customer_experience_details")} errors={errors}><Form.Control as="textarea" rows={2} value={values.customer_experience_details} onChange={(event) => change("customer_experience_details", event.target.value)} isInvalid={Boolean(errors.customer_experience_details)} /></Field></Col></Row></>}
    {booking.pricing && <><h3>Pricing</h3><Row>{[["total_price", "Total price"], ["discounted_price", "Discounted price"], ["coupon", "Coupon ID"], ["bonus_points_used", "Bonus points used"], ["previous_price", "Previous price"], ["supplier_extended_amount", "Supplier extension"]].map(([name, label]) => <Col md={4} key={name}><Field name={name} label={label} editable={editable.has(name)} errors={errors}><Form.Control type="number" min="0" step="0.01" value={values[name]} onChange={(event) => change(name, event.target.value)} isInvalid={Boolean(errors[name])} /></Field></Col>)}</Row></>}
    <div className="booking-edit-actions"><Button type="submit" value="save" className="finance-primary-btn" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button><Button type="submit" value="notify" variant="outline-primary" disabled={saving}>{saving ? "Saving..." : "Save and notify customer"}</Button><Button type="button" variant="outline-secondary" onClick={onCancel} disabled={saving}>Cancel</Button></div>
  </Form>;
}
