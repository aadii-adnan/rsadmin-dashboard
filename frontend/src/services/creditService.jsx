import customFetch from "../auth/fetch";

const CREDIT_ENDPOINTS = {
  CREATE_TOPUP_INTENT: () => `${import.meta.env.VITE_API_BASE_URL}/payments/credits/create-intent/`,
  TOPUP_STATUS: (transactionId) => `${import.meta.env.VITE_API_BASE_URL}/payments/credits/status/${transactionId}/`,
  HISTORY: (page) => `${import.meta.env.VITE_API_BASE_URL}/payments/credits/history/?page=${page}`,
  TOPUP_INVOICE: (transactionId) => `${import.meta.env.VITE_API_BASE_URL}/payments/credits/invoice/${transactionId}/`,
  PAY_WITH_CREDITS: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/pay-with-credits/${bookingId}/`,
};

// Server-enforced limits, mirrored here for instant validation feedback
export const TOPUP_MIN = 5;
export const TOPUP_MAX = 1000;
export const TOPUP_PRESETS = [200, 500, 1000];

export const createTopUpIntent = async (amount) => {
  const response = await customFetch(CREDIT_ENDPOINTS.CREATE_TOPUP_INTENT(), {
    method: "POST",
    body: { amount, website: "rsexpressparking" },
  });
  if (!response) return {};
  return response.json();
};

export const checkTopUpStatus = async (transactionId) => {
  const response = await customFetch(CREDIT_ENDPOINTS.TOPUP_STATUS(transactionId));
  if (!response) return {};
  return response.json();
};

export const fetchCreditHistory = async (page = 1) => {
  const response = await customFetch(CREDIT_ENDPOINTS.HISTORY(page));
  if (!response) return {};
  return response.json();
};

export const payBookingWithCredits = async (bookingId) => {
  const response = await customFetch(CREDIT_ENDPOINTS.PAY_WITH_CREDITS(bookingId), {
    method: "POST",
    body: {},
  });
  if (!response) return { ok: false, data: {} };
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
};

// Downloads the top-up invoice PDF (needs the Bearer token, so no plain link)
export const downloadTopUpInvoice = async (transactionId) => {
  const response = await customFetch(CREDIT_ENDPOINTS.TOPUP_INVOICE(transactionId), {
    headers: { Accept: "application/pdf" },
  });
  if (!response || !response.ok) {
    throw new Error("Failed to download invoice.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Credit-TopUp-Invoice-${transactionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
