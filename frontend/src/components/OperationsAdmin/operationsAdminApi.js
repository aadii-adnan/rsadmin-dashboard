import customFetch from "../../auth/fetch.js";

const apiBase = () => import.meta.env?.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await customFetch(`${apiBase()}${path}`, options);
  const payload = response ? await response.json().catch(() => ({})) : {};
  if (!response?.ok) {
    const error = new Error(payload?.detail || Object.values(payload).flat().filter(Boolean).join(" ") || "The operation could not be completed.");
    error.status = response?.status;
    error.fieldErrors = payload;
    throw error;
  }
  return payload;
}

export const getStaffUsers = () => request("/auth/staff/users/");
export const updateStaffUser = (id, values) => request(`/auth/staff/users/${id}/`, { method: "PATCH", body: values });
export const getStaffSuppliers = () => request("/auth/staff/suppliers/");
export const createStaffSupplier = (values) => request("/auth/staff/suppliers/", { method: "POST", body: values });
export const updateStaffSupplier = (id, values) => request(`/auth/staff/suppliers/${id}/`, { method: "PATCH", body: values });
export const getCreditLedger = () => request("/payments/staff/credits/");
export const createCreditAdjustment = (values) => request("/payments/staff/credits/", { method: "POST", body: values });

export const resources = {
  services: { label: "Services", path: "/services/staff/services/" },
  addons: { label: "Add-ons", path: "/services/staff/addons/" },
  coupons: { label: "Coupons", path: "/services/staff/coupons/" },
  statuses: { label: "Statuses", path: "/core/staff/statuses/" },
};
export const getResource = (resource) => request(resources[resource].path);
export const createResource = (resource, values) => request(resources[resource].path, { method: "POST", body: values });
export const updateResource = (resource, id, values) => request(`${resources[resource].path}${id}/`, { method: "PATCH", body: values });
export const getBookingSettings = () => request("/core/staff/booking-settings/");
export const saveBookingSettings = (values) => request("/core/staff/booking-settings/", { method: "PUT", body: values });
export const getCommunications = (kind) => request(({ contacts: "/contact/staff/", faqs: "/faqs/staff/", leads: "/core/staff/marketing-leads/", unsubscribes: "/core/staff/unsubscribes/", redirects: "/blogs/staff/redirect-rules/" })[kind]);
export const createCommunication = (kind, values) => request(({ faqs: "/faqs/staff/", redirects: "/blogs/staff/redirect-rules/" })[kind], { method: "POST", body: values });
export const updateCommunication = (kind, id, values) => request(({ faqs: `/faqs/staff/${id}/`, redirects: `/blogs/staff/redirect-rules/${id}/` })[kind], { method: "PATCH", body: values });
export const getStaffPayments = (filters = {}) => request(`/payments/staff/records/?${new URLSearchParams(filters).toString()}`);
