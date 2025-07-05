import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from "react-bootstrap";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getBookingsSummary, getOrdersCount, getFinancialOverview, addExpense, getMonthlyEarnings, getBookingsOverTime } from "../components/FinanceDashboard/APIHelper";
import { FaTrash, FaEdit } from "react-icons/fa";
import '../FinanceDashboard.css';
import customFetch from "../auth/fetch";
import { LineChart, Line, AreaChart, Area, CartesianGrid } from "recharts";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const COLORS = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#fd7e14", "#6f42c1"];

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
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", recurring: false, for_month: "", recurring_start_month: "", recurring_end_month: "" });
  const [expenseAlert, setExpenseAlert] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState([]);
  const [bookingsOverTime, setBookingsOverTime] = useState([]);
  const [allTime, setAllTime] = useState(false);

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
      } catch (e) {
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
          overviewRes = await getFinancialOverview(undefined, undefined, true);
        } else if (year) {
          overviewRes = await getFinancialOverview(undefined, year);
        } else if (startMonth && endMonth) {
          overviewRes = await getFinancialOverview(startMonth, undefined, false, endMonth);
        } else if (startMonth) {
          overviewRes = await getFinancialOverview(startMonth);
        } else {
          overviewRes = await getFinancialOverview();
        }
        setOverview(overviewRes);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

  fetchData();
}, [startMonth, endMonth, year, allTime, expenseAlert]);

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
      recurring_end_month: expense.recurring_end_month ? expense.recurring_end_month.slice(0, 7) : ""
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <a
          href="/admin-dashboard/"
          style={{
            background: "#447e9b",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "1rem",
            boxShadow: "0 2px 8px rgba(68,126,155,0.08)",
            transition: "background 0.2s"
          }}
          onMouseOver={e => (e.currentTarget.style.background = "#20435c")}
          onMouseOut={e => (e.currentTarget.style.background = "#447e9b")}
        >
          Go to Admin Dashboard
        </a>
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
        <Col md={6}>
          <Card className="mb-4 text-center">
            <Card.Body>
              <Card.Title>Total Balance</Card.Title>
              <h2 className="text-primary">
                {overview ? `€${overview.balance.toLocaleString()}` : "--"}
              </h2>
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

        {/* Expenses Section */}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Expenses</Card.Title>
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
                {/* <Card.Title>Service Orders</Card.Title> */}
                <ResponsiveContainer width="100%" height={350}>
                <div>
                  <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                    {serviceColorLegend.map((item, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
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