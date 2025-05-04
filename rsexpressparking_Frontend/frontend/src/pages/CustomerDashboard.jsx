import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../auth/AuthContext";

function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filterType, setFilterType] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = async (type = "upcoming") => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://localhost:8000/api/bookings/?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch bookings.");

      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setError("Error loading bookings.");
    } finally {
      setLoading(false);
    }
  };

  async function handlePayment(bookingId) {
    try {
      const token = localStorage.getItem("access_token");
  
      const res = await fetch(`http://localhost:8000/api/payments/create-intent/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
        }),
      });
  
      if (!res.ok) throw new Error("Failed to create payment.");
  
      const data = await res.json();
  
      if (data.checkout_url) {
        window.location.href = data.checkout_url; // Redirect to Stripe
      } else {
        throw new Error("Invalid payment response.");
      }
    } catch (err) {
      alert("Payment failed. Please try again.");
    }
  }
  

  useEffect(() => {
    fetchBookings(filterType);
  }, [filterType]);

  return (
    <div style={{ padding: "30px" }}>
      <Helmet>
        <title>Dashboard | RS Express Parking</title>
        <meta name="description" content="View and manage your RS Express Parking bookings." />
      </Helmet>

      <h1>Welcome {user?.first_name}</h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setFilterType("upcoming")}>Upcoming</button>
        <button onClick={() => setFilterType("past")} style={{ marginLeft: "10px" }}>Past</button>
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
                <td>{booking.service?.name}</td>
                <td>{booking.start_time}</td>
                <td>{booking.end_time}</td>
                <td>{booking.status?.name}</td>
                <td>
                  {booking.status?.name !== "Completed" && booking.status?.name !== "Cancelled" && (
                    <button onClick={() => handleReschedule(booking.id)}>Reschedule</button>
                  )}
                </td>
                <td>
                    {booking.status?.name !== "Completed" && booking.status?.name !== "Cancelled" && (
                        <>
                        <button onClick={() => handleReschedule(booking.id)}>Reschedule</button>

                        {!booking.payment_status?.name || booking.payment_status?.name === "Created" ? (
                            <button onClick={() => handlePayment(booking.id)} style={{ marginLeft: "10px" }}>
                            Pay Now
                            </button>
                        ) : (
                            <span style={{ marginLeft: "10px", color: "green" }}>Paid</span>
                        )}
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

  // Reschedule Handler
  async function handleReschedule(bookingId) {
    const newStart = prompt("Enter new start time (YYYY-MM-DD HH:MM:SS):");
    const newEnd = prompt("Enter new end time (YYYY-MM-DD HH:MM:SS):");

    if (!newStart || !newEnd) {
      alert("Start and End time are required!");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/reschedule/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_time: newStart,
          end_time: newEnd,
        }),
      });

      if (!res.ok) throw new Error("Failed to reschedule.");

      alert("Booking rescheduled successfully!");
      fetchBookings(filterType); // Refresh list
    } catch (err) {
      alert("Reschedule failed.");
    }
  }
}

export default CustomerDashboard;
