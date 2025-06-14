import customFetch from "../../auth/fetch";

const API_BASE = "/finance/";

export const getBookingsSummary = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + API_BASE + "dashboard/bookings-summary/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch bookings summary");
  return res.json();
};

export const getOrdersCount = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + API_BASE + "dashboard/orders-count/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch orders count");
  return res.json();
};

export const getFinancialOverview = async (month) => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + API_BASE + `overview/?month=${month}`, { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch financial overview");
  return res.json();
};

export const addExpense = async (data) => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + API_BASE + "add-expense/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data,
    useFinanceJwt: true
  });
  if (!res.ok) throw new Error("Failed to add expense");
  return res.json();
};

export const getMonthlyEarnings = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + "/finance/charts/monthly-earnings/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch monthly earnings");
  return res.json();
};

export const getBookingsOverTime = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + "/finance/charts/bookings-over-time/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch bookings over time");
  return res.json();
};

export const getExpenseBreakdown = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + "/finance/charts/expense-breakdown/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch expense breakdown");
  return res.json();
};

export const getProfitMargin = async () => {
  const res = await customFetch(import.meta.env.VITE_API_BASE_URL + "/finance/charts/profit-margin/", { useFinanceJwt: true });
  if (!res.ok) throw new Error("Failed to fetch profit margin");
  return res.json();
};