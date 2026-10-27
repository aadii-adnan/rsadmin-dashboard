import customFetch from "../../auth/fetch.js";

const getBookingsApiBase = () => `${import.meta.env?.VITE_API_BASE_URL || ""}/bookings/staff/`;

export function buildStaffBookingCreateUrl() {
  return `${getBookingsApiBase()}create/`;
}

export function buildStaffBookingBulkActionUrl(action) {
  return `${getBookingsApiBase()}bulk/${encodeURIComponent(action)}/`;
}

const FILTER_KEYS = [
  "search",
  "departure_date_from",
  "departure_date_to",
  "return_date_from",
  "return_date_to",
  "created_date_from",
  "created_date_to",
  "status",
  "service",
  "website",
  "supplier",
  "source",
  "ordering",
];

export function buildStaffBookingsParams(filters = {}, page = 1) {
  const params = new URLSearchParams({ page: String(page) });

  FILTER_KEYS.forEach((key) => {
    const value = String(filters[key] ?? "").trim();
    if (value) params.set(key, value);
  });

  return params;
}

export async function getStaffBookings(filters, page, signal) {
  const response = await customFetch(
    `${getBookingsApiBase()}?${buildStaffBookingsParams(filters, page).toString()}`,
    { signal },
  );
  const payload = response ? await response.json().catch(() => ({})) : {};

  if (!response?.ok) {
    const detail = payload?.detail
      || payload?.error
      || Object.values(payload || {}).flat().filter(Boolean).join(" ")
      || "Unable to load bookings.";
    throw new Error(detail);
  }

  return payload;
}

export function buildStaffBookingDetailUrl(bookingId) {
  return `${getBookingsApiBase()}${encodeURIComponent(bookingId)}/`;
}

export async function getStaffBooking(bookingId, signal) {
  const response = await customFetch(buildStaffBookingDetailUrl(bookingId), { signal });
  const payload = response ? await response.json().catch(() => ({})) : {};

  if (!response?.ok) {
    const detail = payload?.detail
      || payload?.error
      || Object.values(payload || {}).flat().filter(Boolean).join(" ")
      || "Unable to load this booking.";
    const error = new Error(detail);
    error.status = response?.status;
    throw error;
  }

  return payload;
}

export async function createStaffBooking(payload) {
  const response = await customFetch(buildStaffBookingCreateUrl(), {
    method: "POST",
    body: payload,
  });
  const data = response ? await response.json().catch(() => ({})) : {};

  if (!response?.ok) {
    const error = new Error(
      data?.detail || data?.non_field_errors?.[0] || "Unable to create this booking.",
    );
    error.status = response?.status;
    error.fieldErrors = data;
    throw error;
  }

  return data;
}

export async function updateStaffBooking(bookingId, changes) {
  const response = await customFetch(buildStaffBookingDetailUrl(bookingId), {
    method: "PATCH",
    body: changes,
  });
  const payload = response ? await response.json().catch(() => ({})) : {};

  if (!response?.ok) {
    const detail = payload?.detail
      || payload?.non_field_errors?.[0]
      || "Unable to save this booking.";
    const error = new Error(detail);
    error.status = response?.status;
    error.fieldErrors = payload;
    throw error;
  }

  return payload;
}

export async function updateStaffBookingAndNotify(bookingId, changes) {
  const response = await customFetch(
    buildStaffBookingActionUrl(bookingId, "actions/save-and-notify/"),
    { method: "POST", body: changes },
  );
  const payload = response ? await response.json().catch(() => ({})) : {};
  if (!response?.ok) {
    const error = new Error(
      payload?.detail || payload?.non_field_errors?.[0] || "Unable to save and notify.",
    );
    error.status = response?.status;
    error.fieldErrors = payload;
    throw error;
  }
  return payload;
}

export async function getStaffBookingEditOptions(signal) {
  const apiBase = import.meta.env?.VITE_API_BASE_URL || "";
  const requests = [
    customFetch(`${apiBase}/services/`, { signal }),
    customFetch(`${apiBase}/services/addons/`, { signal }),
    customFetch(`${apiBase}/core/statuses/?type=booking`, { signal }),
  ];
  const responses = await Promise.all(requests);
  if (responses.some((response) => !response?.ok)) {
    throw new Error("Unable to load booking edit options.");
  }
  const [services, addOns, statuses] = await Promise.all(responses.map((response) => response.json()));
  return { services, addOns, statuses };
}

export function buildStaffBookingActionUrl(bookingId, suffix) {
  return `${getBookingsApiBase()}${encodeURIComponent(bookingId)}/${suffix}`;
}

export async function updateStaffBookingStatus(bookingId, status) {
  const response = await customFetch(buildStaffBookingActionUrl(bookingId, "actions/status/"), {
    method: "POST",
    body: { status },
  });
  const payload = response ? await response.json().catch(() => ({})) : {};
  if (!response?.ok) {
    const error = new Error(payload?.status?.[0] || payload?.detail || "Unable to update booking status.");
    error.status = response?.status;
    error.fieldErrors = payload;
    throw error;
  }
  return payload;
}

export async function getStaffBookingDocument(bookingId, documentType) {
  const response = await customFetch(
    buildStaffBookingActionUrl(bookingId, `documents/${documentType}/`),
  );
  if (!response?.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    const error = new Error(payload?.detail || "Unable to download this document.");
    error.status = response?.status;
    throw error;
  }

  return {
    blob: await response.blob(),
    fileName: filenameFromResponse(response, `${documentType}-${bookingId}.pdf`),
  };
}

export async function downloadStaffBookingDocument(bookingId, documentType) {
  const { blob, fileName } = await getStaffBookingDocument(bookingId, documentType);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function filenameFromResponse(response, fallback) {
  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] || fallback;
}

function saveResponseFile(response, blob, fallbackName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFromResponse(response, fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadStaffBookingBulkAction(action, ids, filters = {}) {
  const response = await customFetch(buildStaffBookingBulkActionUrl(action), {
    method: "POST",
    body: {
      ids,
      departure_date_from: filters.departure_date_from || undefined,
      departure_date_to: filters.departure_date_to || undefined,
      return_date_from: filters.return_date_from || undefined,
      return_date_to: filters.return_date_to || undefined,
      created_date_from: filters.created_date_from || undefined,
      created_date_to: filters.created_date_to || undefined,
    },
  });
  if (!response?.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    const detail = payload?.detail
      || Object.values(payload || {}).flat().filter(Boolean).join(" ")
      || "Unable to create this download.";
    const error = new Error(detail);
    error.status = response?.status;
    throw error;
  }

  const extension = action === "xlsx" ? "xlsx" : action === "pdf" ? "pdf" : "zip";
  saveResponseFile(response, await response.blob(), `selected-bookings.${extension}`);
}
