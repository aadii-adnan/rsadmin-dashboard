import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../auth/AuthContext";

function ManagerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchManagerBookings = async (status = "") => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      let url = `http://localhost:8000/api/bookings/manager/all/`;
      if (status) url += `?status=${status}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch manager bookings.");

      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setError("Error loading bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerBookings(filterStatus);
  }, [filterStatus]);

  async function handleUpdateStatus(bookingId, newStatus) {
    if (!window.confirm(`Are you sure you want to mark booking as ${newStatus}?`)) return;

    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://localhost:8000/api/bookings/manager/${bookingId}/status/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status.");

      alert("Booking status updated!");
      fetchManagerBookings(filterStatus); // Refresh list
    } catch (err) {
      alert("Status update failed.");
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <Helmet>
        <title>Manager Dashboard | RS Express Parking</title>
        <meta name="description" content="Manage and update parking bookings as a manager." />
      </Helmet>

      <h1>Welcome Manager {user?.first_name}</h1>

      <div style={{ marginBottom: "20px" }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Bookings</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Rescheduled">Rescheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p>Loading bookings...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Service</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.user?.email}</td>
                <td>{booking.service?.name}</td>
                <td>{booking.start_time}</td>
                <td>{booking.end_time}</td>
                <td>{booking.status?.name}</td>
                <td>
                  {booking.status?.name !== "Completed" && booking.status?.name !== "Cancelled" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(booking.id, "Completed")}
                        style={{ marginRight: "5px" }}
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(booking.id, "Cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ManagerDashboard;
