import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../auth/AuthContext";

function AdminFinanceDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState("");
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", recurring: false });

  const fetchFinanceData = async (selectedMonth) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://localhost:8000/api/finance/overview/?month=${selectedMonth}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch finance data.");

      const data = await res.json();
      setFinanceData(data);
    } catch (err) {
      setError("Error loading financial data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://localhost:8000/api/finance/add-expense/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newExpense,
          for_month: `${month}-01`,
        }),
      });

      if (!res.ok) throw new Error("Failed to add expense.");

      alert("Expense added!");
      setNewExpense({ name: "", amount: "", recurring: false });
      fetchFinanceData(month); // Refresh
    } catch (err) {
      alert("Failed to add expense.");
    }
  };

  async function handleDeleteExpense(id) {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://localhost:8000/api/finance/expense/${id}/delete/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete expense.");

      alert("Expense deleted!");
      fetchFinanceData(month);
    } catch (err) {
      alert("Failed to delete.");
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <Helmet>
        <title>Admin Finance | RS Express Parking</title>
        <meta name="description" content="View and manage monthly financial records." />
      </Helmet>

      <h1>Admin Financial Dashboard</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <button onClick={() => fetchFinanceData(month)}>Load Data</button>
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : financeData ? (
        <>
          <h2>Summary for {financeData.month}</h2>
          <p><strong>Earnings:</strong> €{financeData.earnings.toFixed(2)}</p>
          <p><strong>Expenses:</strong> €{financeData.expenses.toFixed(2)}</p>
          <p><strong>Profit/Loss:</strong> €{financeData.profit_or_loss.toFixed(2)}</p>

          <h3>Expenses:</h3>
          <ul>
            {financeData.details.fixed_expenses.map((exp, idx) => (
              <li key={idx}>
                {exp.name} - €{exp.amount}
                <button onClick={() => handleDeleteExpense(exp.id)} style={{ marginLeft: "10px" }}>
                  Delete
                </button>
              </li>
            ))}
          </ul>

          <h3>Add New Expense</h3>
          <form onSubmit={handleAddExpense} style={{ maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="Expense Name"
              value={newExpense.name}
              onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
              required
            />
            <input
              type="number"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
              required
            />
            <div style={{ marginBottom: "10px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={newExpense.recurring}
                  onChange={(e) => setNewExpense({ ...newExpense, recurring: e.target.checked })}
                />
                Recurring Monthly
              </label>
            </div>
            <button type="submit">Add Expense</button>
          </form>
        </>
      ) : (
        <p>Please select a month to view data.</p>
      )}
    </div>
  );
}

export default AdminFinanceDashboard;
