
const PAYMENT_ENDPOINTS = {
  CREATE_INTENT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/create-intent/${bookingId}/`,
  CHECK_STATUS: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/status/${bookingId}/`,
  VERIFY_AMOUNT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/verify-amount/${bookingId}/`,
};

export const createPaymentIntent = async (bookingId) => {
  const response = await fetch(PAYMENT_ENDPOINTS.CREATE_INTENT(bookingId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export const verifyPaymentAmount = async (bookingId, amount) => {
 
  const response = await fetch(PAYMENT_ENDPOINTS.VERIFY_AMOUNT(bookingId), {
    method: "POST",
    body: JSON.stringify({ amount }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export const checkPaymentStatus = async (bookingId) => {
  const response = await fetch(PAYMENT_ENDPOINTS.CHECK_STATUS(bookingId), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
};