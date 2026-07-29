/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import {
  FaArrowDown,
  FaArrowUp,
  FaFilter,
  FaInfoCircle,
  FaSyncAlt,
} from "react-icons/fa";

export const FINANCE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "expenses", label: "Expenses" },
  { id: "suppliers", label: "Suppliers" },
  { id: "operations", label: "Operations" },
  { id: "tools", label: "Admin Tools" },
];

export const formatCurrency = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format;

export const formatNumber = new Intl.NumberFormat("en-IE").format;

export const formatDate = (value, options = {}) =>
  value
    ? new Intl.DateTimeFormat("en-IE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...options,
      }).format(new Date(value))
    : "—";

export function FinanceTabs({ activeTab, onChange }) {
  return (
    <div className="finance-tabs-wrap">
      <div className="finance-tabs" role="tablist" aria-label="Finance dashboard sections">
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`finance-panel-${tab.id}`}
            id={`finance-tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`finance-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              const index = FINANCE_TABS.findIndex((item) => item.id === activeTab);
              const offset = event.key === "ArrowRight" ? 1 : -1;
              const next = FINANCE_TABS[(index + offset + FINANCE_TABS.length) % FINANCE_TABS.length];
              onChange(next.id);
              window.requestAnimationFrame(() => {
                document.getElementById(`finance-tab-${next.id}`)?.focus();
              });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FinanceFilters({
  draft,
  onDraftChange,
  onApply,
  error,
  loading,
}) {
  const update = (key, value) => onDraftChange((current) => ({ ...current, [key]: value }));

  return (
    <form className="finance-filter-card" onSubmit={onApply}>
      <div className="finance-filter-title">
        <span className="finance-filter-icon" aria-hidden="true"><FaFilter /></span>
        <div>
          <strong>Dashboard scope</strong>
          <span>Choose the website and accounting period used throughout this dashboard.</span>
        </div>
      </div>

      <div className="finance-filter-grid">
        <Form.Group>
          <Form.Label>Website</Form.Label>
          <Form.Select
            value={draft.website}
            onChange={(event) => update("website", event.target.value)}
          >
            <option value="all">All websites</option>
            <option value="rsexpressparking">RS Express Parking</option>
            <option value="dublinairportparking">Dublin Airport Express Parking</option>
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>Period</Form.Label>
          <Form.Select
            value={draft.periodType}
            onChange={(event) => update("periodType", event.target.value)}
          >
            <option value="range">Month range</option>
            <option value="year">Full year</option>
            <option value="all">All time</option>
          </Form.Select>
        </Form.Group>

        {draft.periodType === "range" && (
          <>
            <Form.Group>
              <Form.Label>From</Form.Label>
              <Form.Control
                type="month"
                value={draft.startMonth}
                onChange={(event) => update("startMonth", event.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>To</Form.Label>
              <Form.Control
                type="month"
                value={draft.endMonth}
                min={draft.startMonth}
                onChange={(event) => update("endMonth", event.target.value)}
                required
              />
            </Form.Group>
          </>
        )}

        {draft.periodType === "year" && (
          <Form.Group>
            <Form.Label>Year</Form.Label>
            <Form.Select
              value={draft.year}
              onChange={(event) => update("year", event.target.value)}
            >
              {Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 2 - index).map(
                (year) => <option key={year} value={year}>{year}</option>,
              )}
            </Form.Select>
          </Form.Group>
        )}

        <Button type="submit" className="finance-primary-btn" disabled={loading}>
          {loading ? <Spinner size="sm" aria-hidden="true" /> : <FaSyncAlt aria-hidden="true" />}
          {loading ? "Applying…" : "Apply filters"}
        </Button>
      </div>
      {error && <div className="finance-filter-error" role="alert">{error}</div>}
    </form>
  );
}

export function MetricCard({
  label,
  value,
  definition,
  comparison,
  icon,
  emphasis = false,
  inverse = false,
  negative = false,
}) {
  let comparisonContent = null;
  if (comparison) {
    if (comparison.percent === null) {
      comparisonContent = <span className="metric-baseline">No prior baseline</span>;
    } else {
      const improving = inverse ? comparison.delta <= 0 : comparison.delta >= 0;
      const Arrow = comparison.delta >= 0 ? FaArrowUp : FaArrowDown;
      comparisonContent = (
        <span className={`metric-change ${improving ? "is-positive" : "is-negative"}`}>
          <Arrow aria-hidden="true" />
          {Math.abs(comparison.percent).toFixed(1)}%
          <span>vs previous period</span>
        </span>
      );
    }
  }

  return (
    <article className={`finance-metric-card${emphasis ? " is-emphasis" : ""}`}>
      <div className="metric-card-top">
        <span className="metric-icon" aria-hidden="true">{icon}</span>
        <span className="metric-label">
          {label}
          <span className="metric-info" title={definition} aria-label={definition}>
            <FaInfoCircle aria-hidden="true" />
          </span>
        </span>
      </div>
      <div className={`metric-value${negative ? " is-negative" : ""}`}>
        {value === null || value === undefined ? "—" : formatCurrency(value)}
      </div>
      <div className="metric-comparison">{comparisonContent}</div>
    </article>
  );
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="finance-section-heading">
      <div>
        {eyebrow && <span className="finance-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="finance-section-action">{action}</div>}
    </div>
  );
}

export function PanelState({ loading, error, onRetry, empty, emptyMessage, children }) {
  if (loading) {
    return (
      <div className="finance-loading" role="status">
        <Spinner animation="border" size="sm" />
        <span>Loading finance data…</span>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="danger" className="finance-state-alert">
        <div>
          <strong>We couldn’t load this section.</strong>
          <span>{error}</span>
        </div>
        {onRetry && (
          <Button variant="outline-danger" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Alert>
    );
  }
  if (empty) {
    return <div className="finance-empty-state">{emptyMessage || "No data for this period."}</div>;
  }
  return children;
}

export function TableEmptyRow({ colSpan, message = "No records for this period." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="finance-table-empty">{message}</td>
    </tr>
  );
}

export function FinanceChartTooltip({ active, payload, label, valueLabel = "Value", currency = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="finance-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey} style={{ color: item.color }}>
          <span>{item.name || valueLabel}</span>
          <b>{currency ? formatCurrency(item.value) : formatNumber(item.value)}</b>
        </div>
      ))}
    </div>
  );
}
