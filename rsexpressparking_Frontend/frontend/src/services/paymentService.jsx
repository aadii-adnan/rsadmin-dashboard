import customFetch from "../auth/fetch";

const PAYMENT_ENDPOINTS = {
  CREATE_INTENT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/create-intent/${bookingId}/`,
  CHECK_STATUS: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/status/${bookingId}/`,
  VERIFY_AMOUNT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/verify-amount/${bookingId}/`,
};

export const createPaymentIntent = async (bookingId) => {
  const response = await customFetch(PAYMENT_ENDPOINTS.CREATE_INTENT(bookingId), {
    method: "POST",
  });
  return response.json();
};

export const verifyPaymentAmount = async (bookingId, amount) => {
 
  const response = await customFetch(PAYMENT_ENDPOINTS.VERIFY_AMOUNT(bookingId), {
    method: "POST",
    body: { amount },
  });
  return response.json();
};

export const checkPaymentStatus = async (bookingId) => {
  const response = await customFetch(PAYMENT_ENDPOINTS.CHECK_STATUS(bookingId));
  return response.json();
};