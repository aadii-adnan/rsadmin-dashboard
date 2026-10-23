import React, { useCallback, useEffect, useState } from "react";
import BookingFilters from "../components/BookingsAdmin/BookingFilters";
import BookingList from "../components/BookingsAdmin/BookingList";
import BookingBulkActions from "../components/BookingsAdmin/BookingBulkActions";
import { getStaffBookings } from "../components/BookingsAdmin/bookingAdminApi";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSliders } from "react-icons/fi";
import BookingCreateForm from "../components/BookingsAdmin/BookingCreateForm";
import "../components/BookingsAdmin/bookingsAdmin.css";

const DEFAULT_FILTERS = {
  search: "", ordering: "-created_at", status: "", service: "",
  departure_date_from: "", departure_date_to: "", return_date_from: "", return_date_to: "",
  created_date_from: "", created_date_to: "", website: "", supplier: "", source: "",
};

export default function BookingsAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadBookings = useCallback((signal) => {
    setLoading(true);
    setError("");
    return getStaffBookings(activeFilters, page, signal)
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setData({ count: 0, next: null, previous: null, results: [] });
          setError(requestError.message || "Unable to load bookings.");
        }
      })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [activeFilters, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadBookings(controller.signal);
    return () => controller.abort();
  }, [loadBookings]);

  const applyFilters = (event) => { event.preventDefault(); setSelectedIds([]); setPage(1); setActiveFilters({ ...draftFilters }); };
  const clearFilters = () => { setSelectedIds([]); setDraftFilters(DEFAULT_FILTERS); setActiveFilters(DEFAULT_FILTERS); setPage(1); };

  return (
    <section className="bookings-admin-page">
      <div className="booking-page-heading"><div><span className="booking-eyebrow">Operations workspace</span><h1 className="admin-page-title">{creating ? "Create booking" : "Bookings"}</h1>
      <p className="bookings-admin-description">{creating ? "Add an operational booking with the same server-side controls as Django Admin." : "Your booking workspace. Find, review, and manage every journey."}</p></div>{creating ? null : <div className="booking-heading-actions"><div className="booking-heading-status"><FiSliders aria-hidden="true" /> Live filters</div><button type="button" className="btn finance-primary-btn" onClick={() => setCreating(true)}><FiPlus aria-hidden="true" />Create booking</button></div>}</div>
      {creating ? <BookingCreateForm isSupplier={Boolean(user?.is_active_supplier)} isManager={Boolean(user?.is_manager)} onCancel={() => setCreating(false)} onCreated={(booking) => navigate(`/bookings-admin/${booking.id}`)} /> : <>
        <BookingFilters filters={draftFilters} onChange={setDraftFilters} onSubmit={applyFilters} onClear={clearFilters} isFullSuperAdmin={Boolean(user?.is_full_super_admin)} loading={loading} />
        <BookingBulkActions selectedIds={selectedIds} capabilities={data.bulk_actions} filters={activeFilters} onClear={() => setSelectedIds([])} />
        <div className="booking-table-card"><div className="booking-table-heading"><h2>All bookings</h2><span>{loading ? "Updating results..." : error ? "Results unavailable" : `${Number(data.count) || 0} matching bookings`}</span></div>
          <BookingList bookings={data.results || []} count={Number(data.count) || 0} loading={loading} error={error} onRetry={() => loadBookings()} page={page} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} onPageChange={setPage} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
        </div>
      </>}
    </section>
  );
}
