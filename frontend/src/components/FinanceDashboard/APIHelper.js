import customFetch from "../../auth/fetch.js";

const getApiBase = () => `${import.meta.env?.VITE_API_BASE_URL || ""}/finance`;

export function buildFinanceParams(filters = {}) {
  const params = new URLSearchParams();
  const periodType = filters.periodType || "range";
  params.set("period_type", periodType);
  params.set("website", filters.website || "all");

  if (periodType === "range") {
    params.set("start_month", filters.startMonth);
    params.set("end_month", filters.endMonth || filters.startMonth);
  } else if (periodType === "year") {
    params.set("year", filters.year);
  }

  return params;
}

async function requestJson(path, { signal, ...options } = {}) {
  const response = await customFetch(`${getApiBase()}${path}`, {
    ...options,
    signal,
    useFinanceJwt: true,
  });
  if (!response) {
    throw new Error("Your session has expired.");
  }
  const data = await response.json();
  if (!response.ok) {
    const detail =
      data.error ||
      data.detail ||
      Object.values(data).flat().filter(Boolean).join(" ") ||
      "The finance data could not be loaded.";
    throw new Error(detail);
  }
  return data;
}

export const getFinancialOverview = (filters, signal) =>
  requestJson(`/overview/?${buildFinanceParams(filters)}`, { signal });

export const getBookingsSummary = (filters, signal) =>
  requestJson(`/dashboard/bookings-summary/?${buildFinanceParams(filters)}`, { signal });

export const getOrdersCount = (filters, signal) =>
  requestJson(`/dashboard/orders-count/?${buildFinanceParams(filters)}`, { signal });

export const getBookingsOverTime = (filters, signal) =>
  requestJson(`/charts/bookings-over-time/?${buildFinanceParams(filters)}`, { signal });

export const saveExpense = (expenseId, data) =>
  requestJson(expenseId ? `/expense/${expenseId}/update/` : "/add-expense/", {
    method: expenseId ? "PUT" : "POST",
    body: data,
  });

export const deleteExpense = (expenseId) =>
  requestJson(`/expense/${expenseId}/delete/`, { method: "DELETE" });

export const getSupplierFinanceDetail = (supplierId, filters, signal) =>
  requestJson(`/supplier/${supplierId}/?${buildFinanceParams(filters)}`, { signal });

export async function downloadSupplierInvoice(supplierId, month, year, supplierName) {
  const response = await customFetch(
    `${getApiBase()}/supplier/${supplierId}/invoice/?month=${month}&year=${year}`,
    { useFinanceJwt: true },
  );
  if (!response?.ok) {
    throw new Error("Failed to generate invoice.");
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `invoice-${supplierName}-${year}-${String(month).padStart(2, "0")}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export const queueEmailDeliverabilityTest = (campaign) =>
  requestJson("/email-deliverability-test/", {
    method: "POST",
    body: { campaign },
  });
