import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaBalanceScale,
  FaChartLine,
  FaEdit,
  FaEuroSign,
  FaExternalLinkAlt,
  FaEye,
  FaFileInvoice,
  FaPaperPlane,
  FaPlus,
  FaReceipt,
  FaShieldAlt,
  FaTrash,
} from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  deleteExpense,
  downloadSupplierInvoice,
  getBookingsOverTime,
  getBookingsSummary,
  getFinancialOverview,
  getOrdersCount,
  getSupplierFinanceDetail,
  queueEmailDeliverabilityTest,
  saveExpense,
} from "../components/FinanceDashboard/APIHelper";
import {
  FINANCE_TABS,
  FinanceChartTooltip,
  FinanceFilters,
  FinanceTabs,
  MetricCard,
  PanelState,
  SectionHeading,
  TableEmptyRow,
  formatCurrency,
  formatDate,
  formatNumber,
} from "../components/FinanceDashboard/FinanceDashboardUI";
import "../FinanceDashboard.css";

const DELIVERABILITY_CAMPAIGNS = {
  rs_promotional: {
    label: "RS Express regular promotion",
    sender: "RS Express Parking <hello@rsexpressparking.com>",
    subject: "Park With Us Again & Save 10%",
  },
  rs_pending: {
    label: "RS Express pending-booking reminder",
    sender: "RS Express Parking <hello@rsexpressparking.com>",
    subject: "Complete Your Booking & Save 10% Today!",
  },
  dublin_promotional: {
    label: "Dublin regular promotion",
    sender: "Dublin Airport Express Parking <hello@dublinairportexpressparking.ie>",
    subject: "Park With Us Again & Save 10%",
  },
  dublin_pending: {
    label: "Dublin pending-booking reminder",
    sender: "Dublin Airport Express Parking <hello@dublinairportexpressparking.ie>",
    subject: "Complete Your Booking & Save 10% Today!",
  },
};

const CHART_COLORS = ["#1769aa", "#37a0d4", "#72b6a1", "#e7a83e", "#8b6fc0", "#d66b6b"];
const VALID_TABS = new Set(FINANCE_TABS.map((tab) => tab.id));
const VALID_WEBSITES = new Set(["all", "rsexpressparking", "dublinairportparking"]);
const VALID_PERIODS = new Set(["range", "year", "all"]);

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function readFilters(params) {
  const fallbackMonth = currentMonth();
  const periodType = VALID_PERIODS.has(params.get("period_type"))
    ? params.get("period_type")
    : "range";
  const website = VALID_WEBSITES.has(params.get("website"))
    ? params.get("website")
    : "all";
  const startMonth = /^\d{4}-\d{2}$/.test(params.get("start_month") || "")
    ? params.get("start_month")
    : fallbackMonth;
  const endMonth = /^\d{4}-\d{2}$/.test(params.get("end_month") || "")
    ? params.get("end_month")
    : startMonth;
  const year = /^\d{4}$/.test(params.get("year") || "")
    ? params.get("year")
    : String(new Date().getFullYear());
  return { periodType, website, startMonth, endMonth, year };
}

function useFinanceJwtFromUrl() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (!access || !refresh) return;

    localStorage.setItem("finance_jwt", access);
    localStorage.setItem("finance_jwt_refresh", refresh);
    params.delete("access");
    params.delete("refresh");
    const query = params.toString();
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);
}

function compactCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function emptyExpense(filters) {
  return {
    name: "",
    amount: "",
    recurring: false,
    for_month: filters.startMonth || currentMonth(),
    recurring_start_month: filters.startMonth || currentMonth(),
    recurring_end_month: "",
    website: filters.website === "all" ? "both" : filters.website,
  };
}

function FinanceDashboard() {
  useFinanceJwtFromUrl();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const activeTab = VALID_TABS.has(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "overview";

  const [draftFilters, setDraftFilters] = useState(filters);
  const [filterError, setFilterError] = useState("");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState(null);

  const [operations, setOperations] = useState({
    summary: {},
    orders: { services: [], addons: [] },
    timeline: [],
  });
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState("");
  const [operationsRefreshKey, setOperationsRefreshKey] = useState(0);

  const [revenueView, setRevenueView] = useState("services");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(() => emptyExpense(filters));
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState("");
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [expenseDeleting, setExpenseDeleting] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);
  const [supplierDetailError, setSupplierDetailError] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSupplier, setInvoiceSupplier] = useState(null);
  const [invoicePeriod, setInvoicePeriod] = useState(() => currentMonth());
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  const [deliverabilityCampaign, setDeliverabilityCampaign] = useState("rs_promotional");
  const [showDeliverabilityModal, setShowDeliverabilityModal] = useState(false);
  const [deliverabilityLoading, setDeliverabilityLoading] = useState(false);
  const [deliverabilityAlert, setDeliverabilityAlert] = useState(null);

  useEffect(() => setDraftFilters(filters), [filters]);

  useEffect(() => {
    if (!authLoading && !localStorage.getItem("finance_jwt")) {
      navigate("/unauthorized", { replace: true });
    }
  }, [authLoading, navigate]);

  const loadOverview = useCallback((signal) => {
    setOverviewLoading(true);
    setOverviewError("");
    setOverview(null);
    return getFinancialOverview(filters, signal)
      .then(setOverview)
      .catch((error) => {
        if (error.name !== "AbortError") setOverviewError(error.message);
      })
      .finally(() => {
        if (!signal?.aborted) setOverviewLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview, refreshKey]);

  const loadOperations = useCallback((signal) => {
    setOperationsLoading(true);
    setOperationsError("");
    setOperations({ summary: {}, orders: { services: [], addons: [] }, timeline: [] });
    return Promise.all([
      getBookingsSummary(filters, signal),
      getOrdersCount(filters, signal),
      getBookingsOverTime(filters, signal),
    ])
      .then(([summary, orders, timeline]) => setOperations({ summary, orders, timeline }))
      .catch((error) => {
        if (error.name !== "AbortError") setOperationsError(error.message);
      })
      .finally(() => {
        if (!signal?.aborted) setOperationsLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    if (activeTab !== "operations") return undefined;
    const controller = new AbortController();
    loadOperations(controller.signal);
    return () => controller.abort();
  }, [activeTab, loadOperations, operationsRefreshKey]);

  const changeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilterError("");
    if (
      draftFilters.periodType === "range" &&
      (!draftFilters.startMonth || !draftFilters.endMonth)
    ) {
      setFilterError("Choose both a start and end month.");
      return;
    }
    if (
      draftFilters.periodType === "range" &&
      draftFilters.startMonth > draftFilters.endMonth
    ) {
      setFilterError("The start month cannot be after the end month.");
      return;
    }

    const next = new URLSearchParams();
    next.set("tab", activeTab);
    next.set("website", draftFilters.website);
    next.set("period_type", draftFilters.periodType);
    if (draftFilters.periodType === "range") {
      next.set("start_month", draftFilters.startMonth);
      next.set("end_month", draftFilters.endMonth);
    } else if (draftFilters.periodType === "year") {
      next.set("year", draftFilters.year);
    }
    setSearchParams(next, { replace: true });
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm(emptyExpense(filters));
    setExpenseFormError("");
    setShowExpenseModal(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      name: expense.name || "",
      amount: expense.amount ?? "",
      recurring: Boolean(expense.recurring),
      for_month: expense.for_month?.slice(0, 7) || "",
      recurring_start_month: expense.recurring_start_month?.slice(0, 7) || "",
      recurring_end_month: expense.recurring_end_month?.slice(0, 7) || "",
      website: expense.website || "both",
    });
    setExpenseFormError("");
    setShowExpenseModal(true);
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setExpenseSaving(true);
    setExpenseFormError("");
    const data = {
      ...expenseForm,
      amount: Number(expenseForm.amount),
      for_month: !expenseForm.recurring && expenseForm.for_month
        ? `${expenseForm.for_month}-01`
        : null,
      recurring_start_month: expenseForm.recurring && expenseForm.recurring_start_month
        ? `${expenseForm.recurring_start_month}-01`
        : null,
      recurring_end_month: expenseForm.recurring && expenseForm.recurring_end_month
        ? `${expenseForm.recurring_end_month}-01`
        : null,
    };
    try {
      await saveExpense(editingExpense?.id, data);
      setShowExpenseModal(false);
      setNotice({
        type: "success",
        message: editingExpense ? "Expense updated successfully." : "Expense added successfully.",
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setExpenseFormError(error.message);
    } finally {
      setExpenseSaving(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setExpenseDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
      setNotice({ type: "success", message: "Expense deleted successfully." });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setNotice({ type: "danger", message: error.message });
      setExpenseToDelete(null);
    } finally {
      setExpenseDeleting(false);
    }
  };

  const openSupplierDetail = async (supplierId) => {
    setShowSupplierModal(true);
    setSupplierDetail(null);
    setSupplierDetailError("");
    setSupplierDetailLoading(true);
    try {
      setSupplierDetail(await getSupplierFinanceDetail(supplierId, filters));
    } catch (error) {
      setSupplierDetailError(error.message);
    } finally {
      setSupplierDetailLoading(false);
    }
  };

  const openInvoice = (supplier) => {
    setInvoiceSupplier(supplier);
    setInvoiceError("");
    if (filters.periodType === "range") setInvoicePeriod(filters.endMonth);
    else if (filters.periodType === "year") setInvoicePeriod(`${filters.year}-12`);
    setShowInvoiceModal(true);
  };

  const downloadInvoice = async () => {
    if (!invoiceSupplier || !invoicePeriod) return;
    const [year, month] = invoicePeriod.split("-").map(Number);
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      await downloadSupplierInvoice(
        invoiceSupplier.supplier_id,
        month,
        year,
        invoiceSupplier.supplier_name,
      );
      setShowInvoiceModal(false);
    } catch (error) {
      setInvoiceError(error.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const sendDeliverabilityTest = async () => {
    setDeliverabilityLoading(true);
    setDeliverabilityAlert(null);
    try {
      const result = await queueEmailDeliverabilityTest(deliverabilityCampaign);
      setShowDeliverabilityModal(false);
      setDeliverabilityAlert({
        type: "success",
        message: `${result.label} was queued for ${result.recipient_count} GMass inboxes.`,
      });
    } catch (error) {
      setDeliverabilityAlert({ type: "danger", message: error.message });
    } finally {
      setDeliverabilityLoading(false);
    }
  };

  const websiteLabel = {
    all: "All websites",
    rsexpressparking: "RS Express Parking",
    dublinairportparking: "Dublin Airport Express Parking",
  }[filters.website];
  const comparison = overview?.comparison;
  const trend = overview?.trend || [];
  const serviceDetails = overview?.details?.service_details || [];
  const addonDetails = overview?.details?.addon_details || [];
  const sourceDetails = overview?.details?.source_details || [];
  const fixedExpenses = overview?.details?.fixed_expenses || [];
  const recurringExpenses = overview?.details?.recurring_expenses || [];
  const suppliers = overview?.supplier_summary?.suppliers || [];
  const supplierTotals = overview?.supplier_summary?.totals || {};
  const allExpenses = [...fixedExpenses, ...recurringExpenses];
  const fixedTotal = fixedExpenses.reduce((sum, expense) => sum + Number(expense.total), 0);
  const recurringTotal = recurringExpenses.reduce((sum, expense) => sum + Number(expense.total), 0);
  const parkingValue = overview
    ? overview.balance - Number(overview.details?.all_addons_total || 0)
    : 0;

  const renderOverview = () => (
    <>
      <div className="finance-metric-grid">
        <MetricCard
          label="Net booking revenue"
          value={overview?.balance}
          comparison={comparison?.balance}
          definition="Booking value after supplier share for bookings created in this period. Pending and payment-failed bookings are excluded."
          icon={<FaEuroSign />}
        />
        <MetricCard
          label="Realized earnings"
          value={overview?.earnings}
          comparison={comparison?.earnings}
          definition="Earnings from completed, cancelled and no-show bookings, plus started supplier bookings."
          icon={<FaChartLine />}
        />
        <MetricCard
          label="Total expenses"
          value={overview?.expenses}
          comparison={comparison?.expenses}
          inverse
          definition="Fixed expenses plus recurring expenses counted for each applicable month."
          icon={<FaReceipt />}
        />
        <MetricCard
          label="Net profit / loss"
          value={overview?.profit_or_loss}
          comparison={comparison?.profit_or_loss}
          emphasis
          negative={Number(overview?.profit_or_loss) < 0}
          definition="Realized earnings minus expenses for the selected period."
          icon={<FaBalanceScale />}
        />
      </div>

      <section className="finance-card finance-chart-card">
        <SectionHeading
          eyebrow="Performance"
          title="Earnings, expenses and profit"
          description="Uses the same calculation rules and scope as the headline figures above."
        />
        {trend.length ? (
          <div className="finance-chart" role="img" aria-label="Earnings, expenses and profit trend">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={trend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="#e8edf3" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "#687586", fontSize: 12 }} />
                <YAxis tickFormatter={compactCurrency} tick={{ fill: "#687586", fontSize: 12 }} />
                <Tooltip content={<FinanceChartTooltip />} />
                <Legend />
                <Bar dataKey="earnings" name="Earnings" fill="#1769aa" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#d9a441" radius={[5, 5, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="profit_or_loss"
                  name="Net profit"
                  stroke="#16815d"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="finance-empty-state">No trend data for this period.</div>
        )}
      </section>

      <div className="finance-summary-grid">
        <article className="finance-card finance-summary-card">
          <span>Revenue excluding booked add-ons</span>
          <strong>{formatCurrency(parkingValue)}</strong>
          <small>Net booking revenue minus the booked add-on value.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Booked add-ons value</span>
          <strong>{formatCurrency(overview?.details?.all_addons_total || 0)}</strong>
          <small>Non-cancelled add-ons booked during the selected period.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Suppliers active in period</span>
          <strong>{formatNumber(suppliers.length)}</strong>
          <small>Supplier settlements use departure date rather than booking-created date.</small>
        </article>
      </div>
    </>
  );

  const renderRevenue = () => (
    <>
      <SectionHeading
        eyebrow="Revenue detail"
        title="Understand where revenue comes from"
        description="Review services, add-ons and first-touch booking sources without losing the selected dashboard scope."
      />
      <div className="finance-summary-grid">
        <article className="finance-card finance-summary-card">
          <span>Net booking revenue</span>
          <strong>{formatCurrency(overview?.balance || 0)}</strong>
          <small>After supplier share.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Realized earnings</span>
          <strong>{formatCurrency(overview?.earnings || 0)}</strong>
          <small>Based on eligible realized statuses.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Booked add-ons</span>
          <strong>{formatCurrency(overview?.details?.all_addons_total || 0)}</strong>
          <small>Supplier add-ons are excluded from our add-on earnings below.</small>
        </article>
      </div>

      <section className="finance-card">
        <div className="finance-breakdown-tabs" role="tablist" aria-label="Revenue breakdown">
          {[
            ["services", "Services"],
            ["addons", "Add-ons"],
            ["sources", "Booking sources"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={revenueView === id}
              className={revenueView === id ? "is-active" : ""}
              onClick={() => setRevenueView(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {revenueView === "services" && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <caption>Service earnings for bookings created in the selected period.</caption>
              <thead><tr>
                <th>Service</th>
                <th className="numeric">Eligible bookings</th>
                <th className="numeric">Cancelled</th>
                <th className="numeric">Completed earnings</th>
                <th className="numeric">Cancelled earnings</th>
              </tr></thead>
              <tbody>
                {serviceDetails.map((service) => (
                  <tr key={service.service_id}>
                    <td><strong>{service.service_name}</strong></td>
                    <td className="numeric">{formatNumber(service.eligible_orders ?? service.completed_orders)}</td>
                    <td className="numeric">{formatNumber(service.cancelled_orders)}</td>
                    <td className="numeric">{formatCurrency(service.completed_earning)}</td>
                    <td className="numeric">{formatCurrency(service.cancelled_earning)}</td>
                  </tr>
                ))}
                {!serviceDetails.length && <TableEmptyRow colSpan={5} />}
              </tbody>
            </table>
          </div>
        )}

        {revenueView === "addons" && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <caption>Add-on activity; supplier add-on value is excluded from our earnings.</caption>
              <thead><tr>
                <th>Add-on</th>
                <th className="numeric">Eligible orders</th>
                <th className="numeric">Cancelled</th>
                <th className="numeric">Our add-on earnings</th>
              </tr></thead>
              <tbody>
                {addonDetails.map((addon) => (
                  <tr key={addon.addon_id}>
                    <td><strong>{addon.addon_name}</strong></td>
                    <td className="numeric">{formatNumber(addon.completed_orders)}</td>
                    <td className="numeric">{formatNumber(addon.cancelled_orders)}</td>
                    <td className="numeric">{formatCurrency(addon.completed_earning)}</td>
                  </tr>
                ))}
                {!addonDetails.length && <TableEmptyRow colSpan={4} />}
              </tbody>
              {!!addonDetails.length && (
                <tfoot><tr>
                  <td>All add-ons</td>
                  <td className="numeric">{formatNumber(addonDetails.reduce((sum, item) => sum + item.completed_orders, 0))}</td>
                  <td className="numeric">{formatNumber(addonDetails.reduce((sum, item) => sum + item.cancelled_orders, 0))}</td>
                  <td className="numeric">{formatCurrency(addonDetails.reduce((sum, item) => sum + item.completed_earning, 0))}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
        )}

        {revenueView === "sources" && (
          <div className="finance-table-wrap">
            <table className="finance-table">
              <caption>First-touch marketing source for bookings created in this period.</caption>
              <thead><tr>
                <th>Source</th>
                <th className="numeric">Bookings</th>
                <th className="numeric">Realized earnings</th>
              </tr></thead>
              <tbody>
                {sourceDetails.map((source) => (
                  <tr key={source.source_channel}>
                    <td><strong>{source.source_channel}</strong></td>
                    <td className="numeric">{formatNumber(source.total_orders)}</td>
                    <td className="numeric">{formatCurrency(source.earning)}</td>
                  </tr>
                ))}
                {!sourceDetails.length && <TableEmptyRow colSpan={3} />}
              </tbody>
              {!!sourceDetails.length && (
                <tfoot><tr>
                  <td>All sources</td>
                  <td className="numeric">{formatNumber(sourceDetails.reduce((sum, item) => sum + item.total_orders, 0))}</td>
                  <td className="numeric">{formatCurrency(sourceDetails.reduce((sum, item) => sum + item.earning, 0))}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </>
  );

  const renderExpenses = () => (
    <>
      <SectionHeading
        eyebrow="Expense management"
        title="Fixed and recurring expenses"
        description="Recurring amounts are multiplied by the number of applicable months in the selected period."
        action={
          <Button className="finance-primary-btn" onClick={openAddExpense}>
            <FaPlus aria-hidden="true" /> Add expense
          </Button>
        }
      />
      <div className="finance-summary-grid">
        <article className="finance-card finance-summary-card">
          <span>Total expenses</span><strong>{formatCurrency(overview?.expenses || 0)}</strong>
          <small>All expenses counted in scope.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Fixed expenses</span><strong>{formatCurrency(fixedTotal)}</strong>
          <small>{formatNumber(fixedExpenses.length)} item(s).</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Recurring expenses</span><strong>{formatCurrency(recurringTotal)}</strong>
          <small>{formatNumber(recurringExpenses.length)} active item(s).</small>
        </article>
      </div>
      <section className="finance-card">
        <div className="finance-table-wrap">
          <table className="finance-table">
            <caption>Expenses included in the current dashboard scope.</caption>
            <thead><tr>
              <th>Expense</th>
              <th>Website</th>
              <th>Type</th>
              <th>Applicable period</th>
              <th className="numeric">Monthly amount</th>
              <th className="numeric">Counted total</th>
              <th className="actions">Actions</th>
            </tr></thead>
            <tbody>
              {allExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td><strong>{expense.name}</strong></td>
                  <td>{{
                    both: "Both websites",
                    rsexpressparking: "RS Express",
                    dublinairportparking: "Dublin Express",
                  }[expense.website] || expense.website}</td>
                  <td><span className="finance-type-pill">{expense.recurring ? "Recurring" : "Fixed"}</span></td>
                  <td>
                    {expense.recurring
                      ? `${expense.recurring_start_month?.slice(0, 7) || "Open"} – ${expense.recurring_end_month?.slice(0, 7) || "Ongoing"}`
                      : expense.for_month?.slice(0, 7) || "—"}
                  </td>
                  <td className="numeric">{formatCurrency(expense.amount)}</td>
                  <td className="numeric">
                    <strong>{formatCurrency(expense.total)}</strong>
                    {expense.months_counted > 1 && <small className="table-subline">{expense.months_counted} months</small>}
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="finance-icon-btn"
                      onClick={() => openEditExpense(expense)}
                      aria-label={`Edit ${expense.name}`}
                    ><FaEdit /></button>
                    <button
                      type="button"
                      className="finance-icon-btn is-danger"
                      onClick={() => setExpenseToDelete(expense)}
                      aria-label={`Delete ${expense.name}`}
                    ><FaTrash /></button>
                  </td>
                </tr>
              ))}
              {!allExpenses.length && <TableEmptyRow colSpan={7} message="No expenses apply to this period." />}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderSuppliers = () => (
    <>
      <SectionHeading
        eyebrow="Supplier settlements"
        title="Supplier and vendor earnings"
        description="This tab uses booking departure dates within the selected period. Eligible statuses are Cancelled, Started, Completed and No Show."
      />
      <div className="finance-summary-grid finance-summary-grid-four">
        <article className="finance-card finance-summary-card">
          <span>Revenue base</span><strong>{formatCurrency(supplierTotals.total_supplier_revenue || 0)}</strong>
          <small>Commission calculation base.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Supplier share</span><strong>{formatCurrency(supplierTotals.total_given_to_suppliers || 0)}</strong>
          <small>Amount allocated to suppliers.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Our share</span><strong>{formatCurrency(supplierTotals.total_kept_from_suppliers || 0)}</strong>
          <small>Retained share including extensions.</small>
        </article>
        <article className="finance-card finance-summary-card">
          <span>Extended amount</span><strong>{formatCurrency(supplierTotals.total_extended_amount || 0)}</strong>
          <small>Supplier booking extensions.</small>
        </article>
      </div>
      <section className="finance-card">
        <div className="finance-table-wrap">
          <table className="finance-table finance-supplier-table">
            <caption>Supplier settlements based on departure date.</caption>
            <thead><tr>
              <th>Supplier</th>
              <th>Prefix</th>
              <th className="numeric">Bookings</th>
              <th className="numeric">Revenue base</th>
              <th className="numeric">Extended</th>
              <th className="numeric">Supplier share</th>
              <th className="numeric">Our share</th>
              <th className="numeric">Commission</th>
              <th className="actions finance-supplier-actions">Actions</th>
            </tr></thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.supplier_id}>
                  <td><strong>{supplier.supplier_name}</strong></td>
                  <td>{supplier.prefix}</td>
                  <td className="numeric">{formatNumber(supplier.total_bookings)}</td>
                  <td className="numeric">{formatCurrency(supplier.total_revenue)}</td>
                  <td className="numeric">{formatCurrency(supplier.extended_amount || 0)}</td>
                  <td className="numeric">{formatCurrency(supplier.supplier_share)}</td>
                  <td className="numeric is-positive">{formatCurrency(supplier.our_share)}</td>
                  <td className="numeric">{supplier.commission_percentage.toFixed(2)}%</td>
                  <td className="actions finance-supplier-actions">
                    <span className="finance-action-group">
                      <button
                        type="button"
                        className="finance-icon-btn"
                        onClick={() => openSupplierDetail(supplier.supplier_id)}
                        aria-label={`View ${supplier.supplier_name} details`}
                      ><FaEye /></button>
                      <button
                        type="button"
                        className="finance-icon-btn"
                        onClick={() => openInvoice(supplier)}
                        aria-label={`Download ${supplier.supplier_name} invoice`}
                      ><FaFileInvoice /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {!suppliers.length && <TableEmptyRow colSpan={9} message="No supplier settlements for this period." />}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const statusData = Object.entries(operations.summary)
    .map(([status, count]) => ({ status, count }))
    .filter((item) => item.count > 0);
  const serviceOrderData = operations.orders.services.filter((item) => item.orders_count > 0);

  const renderOperations = () => (
    <>
      <SectionHeading
        eyebrow="Operations"
        title="Booking activity"
        description="All charts use booking-created date and the same website and period selected above."
      />
      <PanelState
        loading={operationsLoading}
        error={operationsError}
        onRetry={() => setOperationsRefreshKey((value) => value + 1)}
        empty={!operations.timeline.length && !statusData.length && !serviceOrderData.length}
      >
        <div className="finance-operations-grid">
          <section className="finance-card finance-chart-card finance-chart-wide">
            <SectionHeading title="Bookings over time" description="Pending and payment-failed bookings are excluded." />
            <div className="finance-chart" role="img" aria-label="Bookings over time">
              <ResponsiveContainer width="100%" height={310}>
                <AreaChart data={operations.timeline}>
                  <defs>
                    <linearGradient id="financeBookingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1769aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1769aa" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e8edf3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#687586", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#687586", fontSize: 11 }} />
                  <Tooltip content={<FinanceChartTooltip currency={false} valueLabel="Bookings" />} />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#1769aa"
                    strokeWidth={2}
                    fill="url(#financeBookingsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="finance-card finance-chart-card">
            <SectionHeading title="Bookings by status" description="Current status of bookings created in scope." />
            <div className="finance-chart" role="img" aria-label="Bookings by status">
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={statusData} layout="vertical" margin={{ left: 12, right: 20 }}>
                  <CartesianGrid stroke="#e8edf3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="status" width={95} tick={{ fontSize: 11 }} />
                  <Tooltip content={<FinanceChartTooltip currency={false} />} />
                  <Bar dataKey="count" name="Bookings" fill="#1769aa" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="finance-card finance-chart-card">
            <SectionHeading title="Service mix" description="Booking volume by parking service." />
            <div className="finance-chart" role="img" aria-label="Service mix">
              <ResponsiveContainer width="100%" height={310}>
                <PieChart>
                  <Pie
                    data={serviceOrderData}
                    dataKey="orders_count"
                    nameKey="service_name"
                    innerRadius={65}
                    outerRadius={98}
                    paddingAngle={2}
                  >
                    {serviceOrderData.map((entry, index) => (
                      <Cell key={entry.service_id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<FinanceChartTooltip currency={false} />} />
                  <Legend formatter={(value) => <span className="finance-legend-label">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </PanelState>
    </>
  );

  const renderTools = () => {
    const campaign = DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign];
    return (
      <>
        <SectionHeading
          eyebrow="Administration"
          title="Admin tools"
          description="Operational utilities are kept separate from the financial overview."
        />
        <section className="finance-card finance-tool-card">
          <div className="finance-tool-header">
            <div className="finance-tool-heading">
              <span className="finance-tool-icon" aria-hidden="true"><FaShieldAlt /></span>
              <div>
                <span className="finance-eyebrow">Email health</span>
                <h2>Email deliverability test</h2>
                <p>Check where the current live campaign lands before sending it to customers.</p>
              </div>
            </div>
            <a href="https://www.gmass.co/inbox" target="_blank" rel="noreferrer">
              View GMass results <FaExternalLinkAlt aria-hidden="true" />
            </a>
          </div>
          {deliverabilityAlert && (
            <Alert
              variant={deliverabilityAlert.type}
              dismissible
              onClose={() => setDeliverabilityAlert(null)}
              className="m-0"
            >
              {deliverabilityAlert.message}
            </Alert>
          )}
          <div className="finance-tool-body">
            <Form.Group>
              <Form.Label>Campaign</Form.Label>
              <Form.Select
                value={deliverabilityCampaign}
                onChange={(event) => {
                  setDeliverabilityCampaign(event.target.value);
                  setDeliverabilityAlert(null);
                }}
                disabled={deliverabilityLoading}
              >
                {Object.entries(DELIVERABILITY_CAMPAIGNS).map(([value, item]) => (
                  <option key={value} value={value}>{item.label}</option>
                ))}
              </Form.Select>
              <Form.Text>The latest copy saved in Booking Settings will be used.</Form.Text>
            </Form.Group>
            <div className="finance-tool-details">
              <div><span>Sender</span><strong>{campaign.sender}</strong></div>
              <div><span>Subject</span><strong>{campaign.subject}</strong></div>
              <div><span>Recipients</span><strong>15 GMass seed inboxes</strong></div>
            </div>
            <div className="finance-tool-action">
              <p>Each address receives its own email through the production sender.</p>
              <Button
                className="finance-primary-btn"
                onClick={() => setShowDeliverabilityModal(true)}
                disabled={deliverabilityLoading}
              >
                <FaPaperPlane aria-hidden="true" />
                Send 15 test emails
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  };

  const panels = {
    overview: renderOverview,
    revenue: renderRevenue,
    expenses: renderExpenses,
    suppliers: renderSuppliers,
    operations: renderOperations,
    tools: renderTools,
  };

  if (authLoading) {
    return <div className="finance-page-loader"><Spinner animation="border" /><span>Opening finance dashboard…</span></div>;
  }

  return (
    <div className="finance-dashboard">
      <main className="finance-shell">
        <header className="finance-page-header">
          <div>
            <span className="finance-eyebrow">Business performance</span>
            <h1>Finance overview</h1>
            <p>See profit health first, then move into the detail behind every number.</p>
          </div>
          <div className="finance-scope-summary" aria-label="Current dashboard scope">
            <span>{websiteLabel}</span>
            <strong>{overview?.period || "Loading period…"}</strong>
          </div>
        </header>

        <FinanceFilters
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyFilters}
          error={filterError}
          loading={overviewLoading}
        />

        <FinanceTabs activeTab={activeTab} onChange={changeTab} />

        {notice && (
          <Alert
            variant={notice.type}
            dismissible
            onClose={() => setNotice(null)}
            className="finance-notice"
          >
            {notice.message}
          </Alert>
        )}

        <div
          id={`finance-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`finance-tab-${activeTab}`}
          className="finance-panel"
        >
          <PanelState
            loading={overviewLoading && !overview}
            error={overviewError}
            onRetry={() => setRefreshKey((value) => value + 1)}
          >
            {panels[activeTab]()}
          </PanelState>
        </div>
      </main>

      <Modal className="finance-modal" show={showExpenseModal} onHide={() => !expenseSaving && setShowExpenseModal(false)} centered>
        <Form onSubmit={submitExpense}>
          <Modal.Header closeButton={!expenseSaving}>
            <Modal.Title>{editingExpense ? "Edit expense" : "Add expense"}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="finance-modal-body">
            {expenseFormError && <Alert variant="danger">{expenseFormError}</Alert>}
            <Form.Group>
              <Form.Label>Expense name</Form.Label>
              <Form.Control
                value={expenseForm.name}
                onChange={(event) => setExpenseForm((form) => ({ ...form, name: event.target.value }))}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Amount (€)</Form.Label>
              <Form.Control
                type="number"
                min="0.01"
                step="0.01"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm((form) => ({ ...form, amount: event.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Website</Form.Label>
              <Form.Select
                value={expenseForm.website}
                onChange={(event) => setExpenseForm((form) => ({ ...form, website: event.target.value }))}
              >
                <option value="both">Both websites</option>
                <option value="rsexpressparking">RS Express Parking</option>
                <option value="dublinairportparking">Dublin Airport Express Parking</option>
              </Form.Select>
            </Form.Group>
            <Form.Check
              type="switch"
              id="expense-recurring"
              label="Recurring monthly expense"
              checked={expenseForm.recurring}
              onChange={(event) => setExpenseForm((form) => ({ ...form, recurring: event.target.checked }))}
            />
            {!expenseForm.recurring ? (
              <Form.Group>
                <Form.Label>Expense month</Form.Label>
                <Form.Control
                  type="month"
                  value={expenseForm.for_month}
                  onChange={(event) => setExpenseForm((form) => ({ ...form, for_month: event.target.value }))}
                  required
                />
              </Form.Group>
            ) : (
              <div className="finance-modal-grid">
                <Form.Group>
                  <Form.Label>Starts</Form.Label>
                  <Form.Control
                    type="month"
                    value={expenseForm.recurring_start_month}
                    onChange={(event) => setExpenseForm((form) => ({ ...form, recurring_start_month: event.target.value }))}
                    required
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Ends <span className="text-muted">(optional)</span></Form.Label>
                  <Form.Control
                    type="month"
                    min={expenseForm.recurring_start_month}
                    value={expenseForm.recurring_end_month}
                    onChange={(event) => setExpenseForm((form) => ({ ...form, recurring_end_month: event.target.value }))}
                  />
                </Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button className="finance-secondary-btn" onClick={() => setShowExpenseModal(false)} disabled={expenseSaving}>Cancel</Button>
            <Button type="submit" className="finance-primary-btn" disabled={expenseSaving}>
              {expenseSaving ? "Saving…" : editingExpense ? "Save changes" : "Add expense"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal className="finance-modal" show={Boolean(expenseToDelete)} onHide={() => !expenseDeleting && setExpenseToDelete(null)} centered>
        <Modal.Header closeButton={!expenseDeleting}><Modal.Title>Delete expense?</Modal.Title></Modal.Header>
        <Modal.Body>
          This permanently removes <strong>{expenseToDelete?.name}</strong>. Existing finance totals will update immediately.
        </Modal.Body>
        <Modal.Footer>
          <Button className="finance-secondary-btn" onClick={() => setExpenseToDelete(null)} disabled={expenseDeleting}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteExpense} disabled={expenseDeleting}>
            {expenseDeleting ? "Deleting…" : "Delete expense"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal className="finance-modal" show={showSupplierModal} onHide={() => setShowSupplierModal(false)} size="xl" centered>
        <Modal.Header closeButton><Modal.Title>{supplierDetail?.supplier_name || "Supplier details"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <PanelState loading={supplierDetailLoading} error={supplierDetailError}>
            {supplierDetail && (
              <>
                <div className="finance-modal-metrics">
                  <div><span>Eligible bookings</span><strong>{formatNumber(supplierDetail.total_bookings)}</strong></div>
                  <div><span>Revenue base</span><strong>{formatCurrency(supplierDetail.total_revenue)}</strong></div>
                  <div><span>Supplier share</span><strong>{formatCurrency(supplierDetail.supplier_share)}</strong></div>
                  <div><span>Our share</span><strong>{formatCurrency(supplierDetail.our_share)}</strong></div>
                </div>
                <p className="finance-modal-note">Based on departure date and filtered to {websiteLabel}.</p>
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead><tr>
                      <th>Booking</th><th>Customer</th><th>Departure</th><th>Return</th>
                      <th className="numeric">Price</th><th className="numeric">Extended</th>
                      <th className="numeric">Revenue base</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {supplierDetail.bookings.map((booking) => (
                        <tr key={booking.booking_id}>
                          <td><strong>{booking.booking_id}</strong></td>
                          <td>{booking.customer_name}</td>
                          <td>{formatDate(booking.departure_time)}</td>
                          <td>{formatDate(booking.return_time)}</td>
                          <td className="numeric">{formatCurrency(booking.price)}</td>
                          <td className="numeric">{formatCurrency(booking.extended_amount || 0)}</td>
                          <td className="numeric">{formatCurrency(booking.earning)}</td>
                          <td><span className="finance-status-pill">{booking.status}</span></td>
                        </tr>
                      ))}
                      {!supplierDetail.bookings.length && <TableEmptyRow colSpan={8} />}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </PanelState>
        </Modal.Body>
        <Modal.Footer><Button className="finance-secondary-btn" onClick={() => setShowSupplierModal(false)}>Close</Button></Modal.Footer>
      </Modal>

      <Modal className="finance-modal" show={showInvoiceModal} onHide={() => !invoiceLoading && setShowInvoiceModal(false)} centered>
        <Modal.Header closeButton={!invoiceLoading}>
          <Modal.Title>Download invoice — {invoiceSupplier?.supplier_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="finance-modal-body">
          <Form.Group>
            <Form.Label>Invoice month</Form.Label>
            <Form.Control type="month" value={invoicePeriod} onChange={(event) => setInvoicePeriod(event.target.value)} />
            <Form.Text>
              Includes eligible Cancelled, Started, Completed and No Show supplier bookings for this invoice month.
            </Form.Text>
          </Form.Group>
          {invoiceError && <Alert variant="danger">{invoiceError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button className="finance-secondary-btn" onClick={() => setShowInvoiceModal(false)} disabled={invoiceLoading}>Cancel</Button>
          <Button className="finance-primary-btn" onClick={downloadInvoice} disabled={invoiceLoading || !invoicePeriod}>
            {invoiceLoading ? "Generating…" : "Download PDF"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        className="finance-modal"
        show={showDeliverabilityModal}
        onHide={() => !deliverabilityLoading && setShowDeliverabilityModal(false)}
        centered
      >
        <Modal.Header closeButton={!deliverabilityLoading}><Modal.Title>Confirm deliverability test</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="warning">This sends 15 real external emails through the production SMTP account.</Alert>
          <dl className="finance-confirm-list">
            <div><dt>Campaign</dt><dd>{DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].label}</dd></div>
            <div><dt>Sender</dt><dd>{DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].sender}</dd></div>
            <div><dt>Subject</dt><dd>{DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].subject}</dd></div>
          </dl>
        </Modal.Body>
        <Modal.Footer>
          <Button className="finance-secondary-btn" onClick={() => setShowDeliverabilityModal(false)} disabled={deliverabilityLoading}>Cancel</Button>
          <Button variant="warning" onClick={sendDeliverabilityTest} disabled={deliverabilityLoading}>
            {deliverabilityLoading ? "Queueing…" : "Send 15 test emails"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FinanceDashboard;
