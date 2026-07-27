import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from "react-bootstrap";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getBookingsSummary, getOrdersCount, getFinancialOverview, getMonthlyEarnings, getBookingsOverTime, getSupplierFinanceDetail, downloadSupplierInvoice, queueEmailDeliverabilityTest } from "../components/FinanceDashboard/APIHelper";
import { FaTrash, FaEdit } from "react-icons/fa";
import '../FinanceDashboard.css';
import customFetch from "../auth/fetch";
import { LineChart, Line, AreaChart, Area, CartesianGrid } from "recharts";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const COLORS = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#fd7e14", "#6f42c1"];

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

function useFinanceJwtFromUrl() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (access && refresh) {
      localStorage.setItem('finance_jwt', access);
      localStorage.setItem('finance_jwt_refresh', refresh);
      // Remove tokens from URL for cleanliness
      window.history.replaceState({}, document.title, "/finance-dashboard/");
    }
  }, []);
}

function FinancialDashboard() {
  useFinanceJwtFromUrl(); // Custom hook to handle JWT from URL

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const { user, loading } = useAuth(); // assumes user object has is_superuser and is_manager
  const navigate = useNavigate();
  const [bookingsSummary, setBookingsSummary] = useState({});
  const [ordersCount, setOrdersCount] = useState({ services: [], addons: [] });
  const [overview, setOverview] = useState(null);
  const [startMonth, setStartMonth] = useState(getCurrentMonth());
  const [endMonth, setEndMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(""); // NEW: year filter state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", recurring: false, for_month: "", recurring_start_month: "", recurring_end_month: "", website: "both", });
  const [expenseAlert, setExpenseAlert] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState([]);
  const [bookingsOverTime, setBookingsOverTime] = useState([]);
  const [allTime, setAllTime] = useState(false);
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSupplier, setInvoiceSupplier] = useState(null);
  const [invoicePeriod, setInvoicePeriod] = useState(() => {
    const now = new Date();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return `${y}-${String(m).padStart(2, "0")}`;
  });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [deliverabilityCampaign, setDeliverabilityCampaign] = useState("rs_promotional");
  const [showDeliverabilityModal, setShowDeliverabilityModal] = useState(false);
  const [deliverabilityLoading, setDeliverabilityLoading] = useState(false);
  const [deliverabilityAlert, setDeliverabilityAlert] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('finance_jwt')) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setMonthlyEarnings(await getMonthlyEarnings());
        setBookingsOverTime(await getBookingsOverTime());
      } catch {
        // handle error
      }
    };
    fetchCharts();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsRes = await getBookingsSummary();
        setBookingsSummary(bookingsRes);

        const ordersRes = await getOrdersCount();
        setOrdersCount(ordersRes);

        let overviewRes;
        if (allTime) {
          overviewRes = await getFinancialOverview(undefined, undefined, true, undefined, websiteFilter);
        } else if (year) {
          overviewRes = await getFinancialOverview(undefined, year, false, undefined, websiteFilter);
        } else if (startMonth && endMonth) {
          overviewRes = await getFinancialOverview(startMonth, undefined, false, endMonth, websiteFilter);
        } else if (startMonth) {
          overviewRes = await getFinancialOverview(startMonth, undefined, false, undefined, websiteFilter);
        } else {
          overviewRes = await getFinancialOverview(undefined, undefined, false, undefined, websiteFilter);
        }
        setOverview(overviewRes);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, [startMonth, endMonth, year, allTime, expenseAlert, websiteFilter]);

  // Chart data
  const bookingsStatusData = Object.entries(bookingsSummary || {})
  .map(([status, count]) => ({
    status,
    count
  }));
  const serviceEarningsData = (ordersCount.services || []).map((s, idx) => ({
    name: s.service_name,
    value: s.orders_count,
    color: COLORS[idx % COLORS.length]
  }));

  // Build a legend mapping
  const serviceColorLegend = serviceEarningsData.map(s => ({
    name: s.name,
    color: s.color
  }));

  const formatMonthLabel = (value) => {
    if (!value) return "";
    const [monthYear, monthNumber] = value.split("-").map(Number);
    if (!monthYear || !monthNumber) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(monthYear, monthNumber - 1, 1));
  };

  const selectedPeriodLabel = allTime
    ? "Showing finance totals for all time."
    : year
      ? `Showing finance totals for ${year}.`
      : startMonth && endMonth
        ? startMonth === endMonth
          ? `Showing finance totals for ${formatMonthLabel(startMonth)}.`
          : `Showing finance totals for ${formatMonthLabel(startMonth)} to ${formatMonthLabel(endMonth)}.`
        : startMonth
          ? `Showing finance totals for ${formatMonthLabel(startMonth)}.`
          : "Select a month, range, year, or all time to view finance totals.";

  const supplierEarningsHelp = "Shows supplier/vendor bookings with departure dates in the selected period. Includes Cancelled, Started, Completed, and No Show bookings only. Confirmed bookings are not included.";
  const helperTextStyle = { fontSize: 13, lineHeight: 1.35 };

  // Expense form handlers

  // Expense update handler
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      name: expense.name,
      amount: expense.amount,
      recurring: expense.recurring,
      for_month: expense.for_month ? expense.for_month.slice(0, 7) : "",
      recurring_start_month: expense.recurring_start_month ? expense.recurring_start_month.slice(0, 7) : "",
      recurring_end_month: expense.recurring_end_month ? expense.recurring_end_month.slice(0, 7) : "",
      website: expense.website || "both",
    });
    setShowExpenseModal(true);
  };

  // Expense delete handler
  const handleDeleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await customFetch(`${import.meta.env.VITE_API_BASE_URL}/finance/expense/${id}/delete/`, { method: "DELETE", useFinanceJwt: true });
        setExpenseAlert({ type: "success", msg: "Expense deleted!" });
      } catch {
        setExpenseAlert({ type: "danger", msg: "Failed to delete expense." });
      }
    }
  };

  const handleExpenseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExpenseForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleViewSupplierDetail = async (supplierId) => {
    setShowSupplierModal(true);
    setSupplierDetailLoading(true);
    setSupplierDetail(null);
    try {
      const data = await getSupplierFinanceDetail(
        supplierId,
        startMonth || undefined,
        endMonth || undefined,
        year || undefined,
        allTime || undefined,
        websiteFilter || undefined
      );
      setSupplierDetail(data);
    } catch (e) {
      console.error("Failed to load supplier detail", e);
    } finally {
      setSupplierDetailLoading(false);
    }
  };

  const handleOpenInvoiceModal = (supplier) => {
    setInvoiceSupplier(supplier);
    setInvoiceError(null);
    setShowInvoiceModal(true);
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceSupplier || !invoicePeriod) return;
    const [year, month] = invoicePeriod.split("-").map(Number);
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      await downloadSupplierInvoice(invoiceSupplier.supplier_id, month, year, invoiceSupplier.supplier_name);
      setShowInvoiceModal(false);
    } catch {
      setInvoiceError("Failed to generate invoice. Please try again.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleQueueDeliverabilityTest = async () => {
    setDeliverabilityLoading(true);
    setDeliverabilityAlert(null);
    try {
      const result = await queueEmailDeliverabilityTest(deliverabilityCampaign);
      setShowDeliverabilityModal(false);
      setDeliverabilityAlert({
        type: "success",
        msg: `${result.label} was queued for ${result.recipient_count} GMass inboxes. Task: ${result.task_id}`,
      });
    } catch (error) {
      setDeliverabilityAlert({
        type: "danger",
        msg: error.message || "Failed to queue the deliverability test.",
      });
    } finally {
      setDeliverabilityLoading(false);
    }
  };

  // Expense submit handler (add or update)
  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    let data = { ...expenseForm };
    if (data.recurring) {
      data.for_month = null;
      // Format recurring months as YYYY-MM-01 for backend
      data.recurring_start_month = data.recurring_start_month ? data.recurring_start_month + "-01" : null;
      data.recurring_end_month = data.recurring_end_month ? data.recurring_end_month + "-01" : null;
    } else {
      data.for_month = data.for_month ? data.for_month + "-01" : null;
      data.recurring_start_month = null;
      data.recurring_end_month = null;
    }
    const url = editingExpense
      ? `/finance/expense/${editingExpense.id}/update/`
      : "/finance/add-expense/";
    const method = editingExpense ? "PUT" : "POST";
    customFetch(import.meta.env.VITE_API_BASE_URL + url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data,
      useFinanceJwt: true
    })
      .then((res) => res.json())
      .then(() => {
        setExpenseAlert({ type: "success", msg: editingExpense ? "Expense updated!" : "Expense added!" });
        setShowExpenseModal(false);
        setEditingExpense(null);
        setExpenseForm({
          name: "",
          amount: "",
          recurring: false,
          for_month: "",
          recurring_start_month: "",
          recurring_end_month: ""
        });
      })
      .catch(() => {
        setExpenseAlert({ type: "danger", msg: "Failed to save expense." });
      });
  };

  if (loading) {
    return <div style={{textAlign: "center", marginTop: "100px"}}>Loading...</div>;
  }

  return (
    <div className="finance-dashboard-bg">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Form.Select
          style={{ width: 220, maxWidth: "100%" }}
          value={websiteFilter}
          onChange={e => setWebsiteFilter(e.target.value)}
        >
          <option value="all">All Websites</option>
          <option value="rsexpressparking">RS Express Parking</option>
          <option value="dublinairportparking">Dublin Airport Express Parking</option>
        </Form.Select>
      </div>
      <Container fluid className="py-4">
        {/* Alert */}
        {expenseAlert && (
          <Alert
            variant={expenseAlert.type}
            onClose={() => setExpenseAlert(null)}
            dismissible
            className="mt-3"
          >
            {expenseAlert.msg}
          </Alert>
        )}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Email Deliverability Test</Card.Title>
                <div className="text-muted mb-3" style={helperTextStyle}>
                  Send the current live promotional copy through its production sender to the 15 GMass seed inboxes.
                </div>
                {deliverabilityAlert && (
                  <Alert
                    variant={deliverabilityAlert.type}
                    onClose={() => setDeliverabilityAlert(null)}
                    dismissible
                  >
                    {deliverabilityAlert.msg}
                    {deliverabilityAlert.type === "success" && (
                      <>
                        {" "}
                        <Alert.Link
                          href="https://www.gmass.co/inbox"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open GMass results
                        </Alert.Link>
                      </>
                    )}
                  </Alert>
                )}
                <Row className="align-items-end g-3">
                  <Col lg={5}>
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
                        {Object.entries(DELIVERABILITY_CAMPAIGNS).map(([value, campaign]) => (
                          <option key={value} value={value}>{campaign.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col lg={5}>
                    <div style={helperTextStyle}>
                      <div><strong>Sender:</strong> {DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].sender}</div>
                      <div><strong>Subject:</strong> {DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].subject}</div>
                      <div><strong>Recipients:</strong> 15 individual test emails</div>
                    </div>
                  </Col>
                  <Col lg={2}>
                    <Button
                      variant="warning"
                      className="w-100"
                      onClick={() => setShowDeliverabilityModal(true)}
                      disabled={deliverabilityLoading}
                    >
                      {deliverabilityLoading ? "Queueing..." : "Send GMass Test"}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      <Row>
        <Col md={6}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Balance</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Bookings created in the selected period, excluding pending and payment failed.
              </div>
              <h2 className="text-primary">
                {overview ? `€${overview.balance.toLocaleString()}` : "--"}
              </h2>
              <div className="text-muted mb-2" style={helperTextStyle}>
                {selectedPeriodLabel}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
                <Form.Control
                  type="month"
                  value={startMonth}
                  onChange={e => {
                    setStartMonth(e.target.value);
                    setAllTime(false);
                    setYear("");
                  }}
                  style={{ maxWidth: 140 }}
                  placeholder="Start Month"
                />
                <Form.Control
                  type="month"
                  value={endMonth}
                  onChange={e => {
                    setEndMonth(e.target.value);
                    setAllTime(false);
                    setYear("");
                  }}
                  style={{ maxWidth: 140 }}
                  placeholder="End Month"
                />
                <Form.Select
                  value={year}
                  onChange={e => {
                    setYear(e.target.value);
                    setStartMonth("");
                    setEndMonth("");
                    setAllTime(false);
                  }}
                  style={{ maxWidth: 110 }}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 4 }, (_, i) => {
                    const y = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={y} value={y}>{y}</option>
                    );
                  })}
                </Form.Select>
                <Button
                  variant={allTime ? "primary" : "outline-primary"}
                  onClick={() => {
                    setAllTime(true);
                    setStartMonth("");
                    setEndMonth("");
                    setYear("");
                  }}
                  style={{ minWidth: 90 }}
                >
                  All Time
                </Button>
              </div>              
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Fixed and recurring expenses counted for the selected period.
              </div>
              <h2 className="text-danger">
                {overview ? `€${overview.expenses.toLocaleString()}` : "--"}
              </h2>
              <Button className="admin-btn" onClick={() => setShowExpenseModal(true)}>
                Add Expense
              </Button>
            </Card.Body>
          </Card>          
        </Col>        
      </Row>

      <Row>
        <Col md={3}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Add-ons Price</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Add-ons on non-cancelled bookings in the selected period.
              </div>
              <h2 className="text-info">
                {overview?.details?.all_addons_total !== undefined
                  ? "€" + Number(overview.details.all_addons_total).toLocaleString()
                  : "--"}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Parking Price</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Total balance minus add-ons.
              </div>
              <h2 className="text-primary">
                {overview && overview.details?.all_addons_total !== undefined
                  ? "€" + (overview.balance - Number(overview.details.all_addons_total)).toLocaleString()
                  : "--"}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Earnings</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Counted earnings after supplier/vendor rules.
              </div>
              <h2 className="text-success">
                {overview ? `€${overview.earnings.toLocaleString()}` : "--"}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Profit / Loss</Card.Title>
              <div className="text-muted mb-2" style={helperTextStyle}>
                Earnings minus expenses.
              </div>
              <h2 className={overview && overview.profit_or_loss >= 0 ? "text-success" : "text-danger"}>
                {overview ? `€${overview.profit_or_loss.toLocaleString()}` : "--"}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Service Earning Details</Card.Title>
            <div className="text-muted mb-2" style={helperTextStyle}>
              Uses bookings created in the selected period.
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Successful Orders</th>
                    <th>Cancelled Orders</th>
                    <th>Earning (Completed)</th>
                    <th>Earning (Cancelled)</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.details?.service_details?.map((s) => (
                    <tr key={s.service_id}>
                      <td>{s.service_name}</td>
                      <td>{s.completed_orders}</td>
                      <td>{s.cancelled_orders}</td>
                      <td>€{s.completed_earning.toLocaleString()}</td>
                      <td>€{s.cancelled_earning.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Row>
      <Row>
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Add-on Earning Details</Card.Title>
          <div className="text-muted mb-2" style={helperTextStyle}>
            Supplier/vendor add-ons are excluded from our add-on earnings.
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Add-on</th>
                  <th>Successful Orders</th>
                  <th>Cancelled Orders</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {overview?.details?.addon_details?.map((a) => (
                  <tr key={a.addon_id}>
                    <td>{a.addon_name}</td>
                    <td>{a.completed_orders}</td>
                    <td>{a.cancelled_orders}</td>
                    <td>€{a.completed_earning.toLocaleString()}</td>
                  </tr>
                ))}
                {/* All Add-ons Combined row */}
                {overview?.details?.addon_details?.length > 0 && (
                  <tr style={{ fontWeight: "bold", background: "#f8f9fa" }}>
                    <td>All Add-ons Combined</td>
                    <td>
                      {overview.details.addon_details
                        .reduce((sum, a) => sum + a.completed_orders, 0)
                        .toLocaleString()}
                    </td>
                    <td>
                      {overview.details.addon_details
                        .reduce((sum, a) => sum + a.cancelled_orders, 0)
                        .toLocaleString()}
                    </td>
                    <td>
                      €
                      {overview.details.addon_details
                        .reduce((sum, a) => sum + a.completed_earning, 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </Row>

      <Row>
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Bookings by Source</Card.Title>
            <div className="text-muted mb-2" style={helperTextStyle}>
              Marketing channel of bookings created in the selected period (first-touch attribution).
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Bookings</th>
                    <th>Earning</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.details?.source_details?.map((s) => (
                    <tr key={s.source_channel}>
                      <td>{s.source_channel}</td>
                      <td>{s.total_orders.toLocaleString()}</td>
                      <td>€{s.earning.toLocaleString()}</td>
                    </tr>
                  ))}
                  {overview?.details?.source_details?.length > 0 && (
                    <tr style={{ fontWeight: "bold", background: "#f8f9fa" }}>
                      <td>All Sources Combined</td>
                      <td>
                        {overview.details.source_details
                          .reduce((sum, s) => sum + s.total_orders, 0)
                          .toLocaleString()}
                      </td>
                      <td>
                        €
                        {overview.details.source_details
                          .reduce((sum, s) => sum + s.earning, 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Row>

        {/* Expenses Section */}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Expenses</Card.Title>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  Recurring expenses may be multiplied by the number of months counted.
                </div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(overview?.details?.fixed_expenses || []).map((e) => (
                        <tr key={e.id}>
                          <td>{e.name}</td>
                          <td>€{e.amount.toLocaleString()}</td>
                          <td>Fixed</td>
                          <td>
                            <button type="button" className="admin-btn-edit" onClick={() => handleEditExpense(e)}>
                              <FaEdit />
                            </button>
                            <button type="button" className="admin-btn-danger" onClick={() => handleDeleteExpense(e.id)}>
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(overview?.details?.recurring_expenses || []).map((e) => (
                        <tr key={e.id}>
                          <td>{e.name}</td>
                          <td>
                            €{e.amount.toLocaleString()}
                            {e.months_counted > 1 ? ` x ${e.months_counted} Month(s)` : ""}
                          </td>
                          <td>Recurring</td>
                          <td>
                            <button type="button" className="admin-btn-edit" onClick={() => handleEditExpense(e)}>
                              <FaEdit />
                            </button>
                            <button type="button" className="admin-btn-danger" onClick={() => handleDeleteExpense(e.id)}>
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Bookings by Status</Card.Title>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  Current booking status counts across all bookings.
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bookingsStatusData}>
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#007bff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Service Orders</Card.Title>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  Service order split across all bookings.
                </div>
                <ResponsiveContainer width="100%" height={350}>
                <div>
                  <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                    {serviceColorLegend.map((item, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 0, fontSize: 14 }}>
                        <span style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          backgroundColor: item.color,
                          marginRight: 8,
                          borderRadius: 3,
                          border: "1px solid #ccc"
                        }}></span>
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
                 <PieChart>
                  <Pie
                    data={serviceEarningsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {serviceEarningsData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>   

        <Row>
          <Col md={6}>
            <Card className="mb-4 admin-card">
              <Card.Body>
                <Card.Title>Monthly Earnings Trend</Card.Title>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  Last 12 months; not affected by the selected dashboard period.
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyEarnings}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="earning" stroke="#447e9b" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="mb-4 admin-card">
              <Card.Body>
                <Card.Title>Bookings Over Time (Last 30 Days)</Card.Title>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  Last 30 days; not affected by the selected dashboard period.
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={bookingsOverTime}>
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007bff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#007bff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="bookings" stroke="#007bff" fillOpacity={1} fill="url(#colorBookings)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
 

        {/* Supplier/Vendor Earnings Section */}
        {overview?.supplier_summary?.suppliers?.length > 0 && (
          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Supplier / Vendor Earnings</Card.Title>
                  <div className="text-muted mb-2" style={helperTextStyle}>
                    {supplierEarningsHelp}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Supplier Name</th>
                          <th>Prefix</th>
                          <th>Eligible Bookings</th>
                          <th>Supplier Revenue Base (€)</th>
                          <th>Extended Amount (€)</th>
                          <th>Supplier Share (€)</th>
                          <th>Our Share (€)</th>
                          <th>Commission %</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.supplier_summary.suppliers.map((s) => (
                          <tr key={s.supplier_id}>
                            <td>{s.supplier_name}</td>
                            <td>{s.prefix}</td>
                            <td>{s.total_bookings}</td>
                            <td>€{s.total_revenue.toLocaleString()}</td>
                            <td style={{ color: "#0d6efd" }}>€{Number(s.extended_amount || 0).toLocaleString()}</td>
                            <td style={{ color: "#dc3545" }}>€{s.supplier_share.toLocaleString()}</td>
                            <td style={{ color: "#28a745" }}>€{s.our_share.toLocaleString()}</td>
                            <td>{s.commission_percentage}%</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleViewSupplierDetail(s.supplier_id)}
                                style={{ marginRight: 6 }}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleOpenInvoiceModal(s)}
                              >
                                Invoice
                              </Button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: "bold", background: "#f8f9fa" }}>
                          <td colSpan={3}>Totals</td>
                          <td>€{overview.supplier_summary.totals.total_supplier_revenue.toLocaleString()}</td>
                          <td style={{ color: "#0d6efd" }}>€{Number(overview.supplier_summary.totals.total_extended_amount || 0).toLocaleString()}</td>
                          <td style={{ color: "#dc3545" }}>€{overview.supplier_summary.totals.total_given_to_suppliers.toLocaleString()}</td>
                          <td style={{ color: "#28a745" }}>€{overview.supplier_summary.totals.total_kept_from_suppliers.toLocaleString()}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Email Deliverability Confirmation Modal */}
        <Modal
          show={showDeliverabilityModal}
          onHide={() => !deliverabilityLoading && setShowDeliverabilityModal(false)}
          centered
        >
          <Modal.Header closeButton={!deliverabilityLoading}>
            <Modal.Title>Confirm Deliverability Test</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="warning">
              This will send 15 real external emails using the production SMTP account.
            </Alert>
            <div><strong>Campaign:</strong> {DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].label}</div>
            <div><strong>Sender:</strong> {DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].sender}</div>
            <div><strong>Subject:</strong> {DELIVERABILITY_CAMPAIGNS[deliverabilityCampaign].subject}</div>
            {deliverabilityAlert?.type === "danger" && (
              <Alert variant="danger" className="mt-3 mb-0">
                {deliverabilityAlert.msg}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDeliverabilityModal(false)}
              disabled={deliverabilityLoading}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleQueueDeliverabilityTest}
              disabled={deliverabilityLoading}
            >
              {deliverabilityLoading ? "Queueing..." : "Send 15 Test Emails"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Supplier Invoice Download Modal */}
        <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              Download Invoice — {invoiceSupplier?.supplier_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label><strong>Select Month</strong></Form.Label>
              <Form.Control
                type="month"
                value={invoicePeriod}
                onChange={e => setInvoicePeriod(e.target.value)}
              />
              <Form.Text className="text-muted">
                Invoice covers all Started &amp; Completed bookings in the selected month (add-ons excluded).
              </Form.Text>
            </Form.Group>
            {invoiceError && (
              <Alert variant="danger" className="mb-0">{invoiceError}</Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInvoiceModal(false)} disabled={invoiceLoading}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleDownloadInvoice} disabled={invoiceLoading || !invoicePeriod}>
              {invoiceLoading ? "Generating…" : "Download PDF"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Supplier Detail Modal */}
        <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {supplierDetail ? `${supplierDetail.supplier_name} (${supplierDetail.prefix}) — Bookings` : "Supplier Details"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {supplierDetailLoading && <div className="text-center py-4">Loading...</div>}
            {!supplierDetailLoading && supplierDetail && (
              <>
                <Row className="mb-3">
                  <Col md={3}>
                    <strong>Eligible Bookings:</strong> {supplierDetail.total_bookings}
                  </Col>
                  <Col md={3}>
                    <strong>Revenue Base:</strong> €{supplierDetail.total_revenue.toLocaleString()}
                  </Col>
                  <Col md={3}>
                    <strong>Extended Amount:</strong>{" "}
                    <span style={{ color: "#0d6efd" }}>€{Number(supplierDetail.total_extended_amount || 0).toLocaleString()}</span>
                  </Col>
                  <Col md={3}>
                    <strong>Supplier Share:</strong>{" "}
                    <span style={{ color: "#dc3545" }}>€{supplierDetail.supplier_share.toLocaleString()}</span>
                  </Col>
                  <Col md={3}>
                    <strong>Our Share:</strong>{" "}
                    <span style={{ color: "#28a745" }}>€{supplierDetail.our_share.toLocaleString()}</span>
                  </Col>
                </Row>
                <div className="text-muted mb-2" style={helperTextStyle}>
                  {supplierEarningsHelp}
                </div>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Departure</th>
                        <th>Return</th>
                        <th>Price (€)</th>
                        <th>Extended Amount (€)</th>
                        <th>Revenue Base (€)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierDetail.bookings.map((b, idx) => (
                        <tr key={idx}>
                          <td>{b.booking_id}</td>
                          <td>{b.customer_name}</td>
                          <td>{new Date(b.departure_time).toLocaleString()}</td>
                          <td>{new Date(b.return_time).toLocaleString()}</td>
                          <td>€{b.price.toLocaleString()}</td>
                          <td style={{ color: "#0d6efd" }}>€{Number(b.extended_amount || 0).toLocaleString()}</td>
                          <td>€{b.earning.toLocaleString()}</td>
                          <td>{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!supplierDetailLoading && !supplierDetail && (
              <div className="text-center text-muted py-4">No data available.</div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>

        {/* Expense Modal */}

        <Modal show={showExpenseModal} onHide={() => { setShowExpenseModal(false); setEditingExpense(null); }}>
          <Modal.Header closeButton>
            <Modal.Title>{editingExpense ? "Edit Expense" : "Add Expense"}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleExpenseSubmit}>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  name="name"
                  value={expenseForm.name}
                  onChange={handleExpenseChange}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Amount</Form.Label>
                <Form.Control
                  name="amount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={handleExpenseChange}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>For Month (YYYY-MM)</Form.Label>
                <Form.Control
                  name="for_month"
                  type="month"
                  value={expenseForm.for_month}
                  onChange={handleExpenseChange}
                  required={!expenseForm.recurring}
                  disabled={expenseForm.recurring}
                />
              </Form.Group>
              <Form.Group style={{ marginBottom: 16 }}>
                <Form.Label>Website</Form.Label>
                <Form.Select
                  name="website"
                  value={expenseForm.website}
                  onChange={handleExpenseChange}
                  required
                >
                  <option value="both">Both Websites</option>
                  <option value="rsexpressparking">RS Express Parking</option>
                  <option value="dublinairportparking">Dublin Airport Express Parking</option>
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Check
                  name="recurring"
                  label="Recurring"
                  checked={expenseForm.recurring}
                  onChange={handleExpenseChange}
                />
              </Form.Group>
              {expenseForm.recurring && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Form.Group>
                    <Form.Label>Recurring Start Month</Form.Label>
                    <Form.Control
                      name="recurring_start_month"
                      type="month"
                      value={expenseForm.recurring_start_month || ""}
                      onChange={handleExpenseChange}
                      required={expenseForm.recurring}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Recurring End Month</Form.Label>
                    <Form.Control
                      name="recurring_end_month"
                      type="month"
                      value={expenseForm.recurring_end_month || ""}
                      onChange={handleExpenseChange}
                      required={expenseForm.recurring}
                    />
                  </Form.Group>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <button className="admin-btn-outline" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }}>
                Cancel
              </button>
              <button type="submit" className="admin-btn">
                {editingExpense ? "Update Expense" : "Add Expense"}
              </button>
            </Modal.Footer>
          </Form>
        </Modal>

        
      </Container>
    </div>
  );
}

export default FinancialDashboard;
