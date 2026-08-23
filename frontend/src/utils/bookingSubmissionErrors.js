export const BOOKING_FIELD_LABELS = {
  car_registration_no: "Car registration",
  car_model: "Car model",
  car_colour: "Car color",
  car_manufacturer: "Car manufacturer",
  total_passengers: "Total passengers",
  departure_terminal: "Departure terminal",
  return_terminal: "Return terminal",
  departure_flight_number: "Departure flight number",
  return_flight_number: "Return flight number",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  contact_no: "Contact number",
};

const API_FIELD_LABELS = {
  ...BOOKING_FIELD_LABELS,
  service: "Parking service",
  booking_user: "Customer details",
  user: "Customer account",
  departure_time: "Drop-off date and time",
  return_time: "Collection date and time",
  total_price: "Booking price",
  discounted_price: "Discounted price",
  coupon: "Coupon",
  add_ons: "Add-ons",
  status: "Booking status",
  website: "Booking website",
};

const SUMMARY_KEYS = new Set(["error", "message", "detail", "non_field_errors"]);

const unique = (values) => [...new Set(values.filter(Boolean))];

const sentence = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
};

const actionableMessage = (value) => {
  const message = sentence(value);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("coupon has been fully used")) {
    return "This coupon has reached its usage limit. Remove it or apply another coupon, then try again.";
  }

  if (lowerMessage.includes("invalid or expired coupon")) {
    return "This coupon is invalid or has expired. Remove it or apply another coupon, then try again.";
  }

  if (lowerMessage.includes("minimum order")) {
    return `${message} Remove the coupon or increase the booking total, then try again.`;
  }

  return message;
};

const flattenMessages = (value) => {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number") {
    return [actionableMessage(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenMessages);
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenMessages);
  }
  return [];
};

const friendlyLabel = (key) => {
  if (API_FIELD_LABELS[key]) return API_FIELD_LABELS[key];
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const normalizeBookingSubmissionError = (
  payload,
  { status = 0, networkError = false } = {},
) => {
  if (networkError) {
    return {
      fieldErrors: {},
      summaryMessages: [
        "We could not connect to the booking service. Check your internet connection and try again; your details are still here.",
      ],
    };
  }

  if (status >= 500) {
    return {
      fieldErrors: {},
      summaryMessages: [
        "The booking service is temporarily unavailable. Wait a moment and try again; your details are still here.",
      ],
    };
  }

  const fieldErrors = {};
  const summaryMessages = [];

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    Object.entries(payload).forEach(([key, value]) => {
      const messages = unique(flattenMessages(value));
      if (!messages.length) return;

      if (BOOKING_FIELD_LABELS[key]) {
        fieldErrors[key] = messages;
        return;
      }

      if (SUMMARY_KEYS.has(key)) {
        summaryMessages.push(...messages);
        return;
      }

      const label = friendlyLabel(key);
      summaryMessages.push(...messages.map((message) => `${label}: ${message}`));
    });
  } else {
    summaryMessages.push(...flattenMessages(payload));
  }

  if (!Object.keys(fieldErrors).length && !summaryMessages.length) {
    summaryMessages.push(
      "The booking service did not explain the problem. Review your details and try again; your entries are still here.",
    );
  }

  return {
    fieldErrors,
    summaryMessages: unique(summaryMessages),
  };
};

export const parseBookingErrorResponse = async (response) => {
  let payload = null;

  try {
    const responseText = await response.text();
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  return normalizeBookingSubmissionError(payload, { status: response.status });
};
