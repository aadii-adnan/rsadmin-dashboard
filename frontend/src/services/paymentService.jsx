
const PAYMENT_ENDPOINTS = {
  CREATE_INTENT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/create-intent/${bookingId}/`,
  CHECK_STATUS: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/status/${bookingId}/`,
  VERIFY_AMOUNT: (bookingId) => `${import.meta.env.VITE_API_BASE_URL}/payments/verify-amount/${bookingId}/`,
};

export const createPaymentIntent = async (bookingId, extraAmount = null, isRescheduleExtra = false, bonusPointsUsed = 0) => {
  const response = await fetch(PAYMENT_ENDPOINTS.CREATE_INTENT(bookingId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      amount: extraAmount, 
      is_reschedule_extra: isRescheduleExtra,
      bonus_points_used: bonusPointsUsed
    }),
  });
  return response.json();
};

// Update function signature:
export const verifyPaymentAmount = async (bookingId, amount, isRescheduleExtra = false) => {
  const response = await fetch(PAYMENT_ENDPOINTS.VERIFY_AMOUNT(bookingId), {
    method: "POST",
    body: JSON.stringify({ amount, is_reschedule_extra: isRescheduleExtra }),
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