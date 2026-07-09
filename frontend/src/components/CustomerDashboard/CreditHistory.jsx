import React, { useCallback, useEffect, useState } from "react";
import { fetchCreditHistory, downloadTopUpInvoice } from "../../services/creditService";

const TYPE_LABELS = {
  topup: "Top-up",
  booking_spend: "Booking payment",
  cancellation_refund: "Cancellation refund",
  adjustment: "Adjustment",
};

const THEME_DARK_BLUE = "#010659";
const THEME_BLUE_TINT = "rgba(1,6,89,0.08)";
const THEME_BLUE_BORDER = "rgba(1,6,89,0.18)";
const THEME_DANGER = "#b42318";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CreditHistory = ({ refreshKey = 0 }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadPage = useCallback(async (pageToLoad, replace = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCreditHistory(pageToLoad);
      if (!data || !Array.isArray(data.results)) {
        throw new Error(data?.error || "Failed to load credit history.");
      }
      setTransactions((prev) => (replace ? data.results : [...prev, ...data.results]));
      setHasMore(Boolean(data.next));
      setPage(pageToLoad);
    } catch (err) {
      setError(err.message || "Failed to load credit history.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // refreshKey bumps after a top-up so the new row appears immediately
    loadPage(1, true);
  }, [loadPage, refreshKey]);

  const handleDownloadInvoice = async (transactionId) => {
    setDownloadingId(transactionId);
    try {
      await downloadTopUpInvoice(transactionId);
    } catch (err) {
      alert(err.message || "Failed to download invoice.");
    }
    setDownloadingId(null);
  };

  const describe = (tx) => {
    const label = TYPE_LABELS[tx.transaction_type] || tx.transaction_type;
    if (tx.transaction_type === "booking_spend" && tx.booking_reference) {
      return `${label} — ${tx.booking_reference}`;
    }
    if (tx.transaction_type === "cancellation_refund" && tx.booking_reference) {
      return `${label} — ${tx.booking_reference}`;
    }
    if (tx.transaction_type === "adjustment" && tx.note) {
      return `${label} — ${tx.note}`;
    }
    return label;
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#010659",
          marginBottom: 4,
          letterSpacing: "0.5px",
        }}
      >
        Credit History
      </h3>
      <div style={{ color: "#6c757d", fontSize: "0.95rem", marginBottom: 16 }}>
        Every top-up, booking payment and refund on your credit balance.
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : transactions.length === 0 && !loading ? (
        <div
          style={{
            background: THEME_BLUE_TINT,
            border: `1px solid ${THEME_BLUE_BORDER}`,
            color: THEME_DARK_BLUE,
            borderRadius: 8,
            padding: "16px 18px",
            fontWeight: 500,
          }}
        >
          No credit activity yet. Top up your account to get started.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle minimal-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="text-nowrap">Date</th>
                <th className="text-nowrap">Description</th>
                <th className="text-nowrap">Amount</th>
                <th className="text-nowrap">Balance After</th>
                <th className="text-nowrap text-center">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const amountNum = Number(tx.amount);
                const isCredit = amountNum > 0;
                return (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ fontSize: "15px" }}>{formatDateTime(tx.created_at)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "15px" }}>{describe(tx)}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isCredit ? THEME_DARK_BLUE : THEME_DANGER,
                        }}
                      >
                        {isCredit ? "+" : "−"}€{Math.abs(amountNum).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#010659" }}>
                        {tx.balance_after !== null && tx.balance_after !== undefined
                          ? `€${Number(tx.balance_after).toFixed(2)}`
                          : "-"}
                      </span>
                    </td>
                    <td className="text-center">
                      {tx.has_invoice ? (
                        <button
                          type="button"
                          className="minimal-action-btn"
                          style={{
                            background: "#010659",
                            color: "#fff",
                            border: "none",
                            borderRadius: "999px",
                            fontWeight: 700,
                            minWidth: "110px",
                            padding: "6px 14px",
                            fontSize: "13px",
                            cursor: downloadingId === tx.id ? "wait" : "pointer",
                            opacity: downloadingId === tx.id ? 0.6 : 1,
                          }}
                          disabled={downloadingId === tx.id}
                          onClick={() => handleDownloadInvoice(tx.id)}
                        >
                          {downloadingId === tx.id ? "Downloading..." : "Download"}
                        </button>
                      ) : (
                        <span style={{ color: "#aaa" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="text-center py-3">
          <span className="spinner-border spinner-border-sm" style={{ color: THEME_DARK_BLUE }} />
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center">
          <button
            type="button"
            className="btn"
            style={{
              border: `1px solid ${THEME_DARK_BLUE}`,
              color: THEME_DARK_BLUE,
              fontWeight: 700,
              borderRadius: 8,
              padding: "8px 28px",
            }}
            onClick={() => loadPage(page + 1)}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default CreditHistory;
