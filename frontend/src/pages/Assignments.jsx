
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

function getErrorMessage(error) {
  const errors = error.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join(" ");
  }

  return (
    error.response?.data?.message ||
    "Something went wrong. Please try again."
  );
}

export default function Assignments() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [assignmentResponse, orderResponse] = await Promise.all([
        api.get("/assignments"),
        api.get("/orders", { params: { per_page: 100 } }),
      ]);

      const assignmentPayload = assignmentResponse.data;
      const orderPayload = orderResponse.data;

      const assignmentRecords = Array.isArray(assignmentPayload)
        ? assignmentPayload
        : assignmentPayload.data || [];

      const orderRecords = Array.isArray(orderPayload)
        ? orderPayload
        : orderPayload.data || [];

      setAssignments(assignmentRecords);
      setOrders(orderRecords);

      // Use riders returned by the assignments endpoint, if available.
      if (Array.isArray(assignmentPayload.riders)) {
        setRiders(assignmentPayload.riders);
      } else if (Array.isArray(assignmentPayload.data?.riders)) {
        setRiders(assignmentPayload.data.riders);
      } else {
        setRiders([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssignments();
  }, [loadAssignments]);

  function handleLogoutClick() {
    setShowLogoutModal(true);
  }

  async function confirmLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch {
      // AuthContext clears the local session.
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  async function handleCreateAssignment(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!orderId || !riderId) {
      setError("Please select both an order and a rider.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/assignments", {
        delivery_order_id: Number(orderId),
        rider_id: Number(riderId),
      });

      setMessage("Rider assigned successfully.");
      setOrderId("");
      setRiderId("");

      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssignment(assignment) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this rider assignment?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/assignments/${assignment.id}`);
      setMessage("Assignment removed successfully.");
      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const assignedOrderIds = assignments.map((assignment) =>
    Number(assignment.delivery_order_id ?? assignment.delivery_order?.id)
  );

  const availableOrders = orders.filter(
    (order) =>
      !assignedOrderIds.includes(Number(order.id)) &&
      !["Delivered", "Cancelled"].includes(order.status)
  );

  if (user?.role !== "manager") {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="error-message" role="alert">
            You do not have permission to manage rider assignments.
          </div>

          <Link to="/dashboard" className="primary-button">
            Return to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">A</span>
          AquaRoute
        </Link>

        <div className="header-actions">
          <span className="role-badge">{user?.role}</span>

          <button
            type="button"
            className="secondary-button"
            onClick={toggleTheme}
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
          >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>

          <Link to="/dashboard" className="secondary-button">
            Dashboard
          </Link>

          <Link to="/orders" className="secondary-button">
            Orders
          </Link>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogoutClick}
          >
            Log Out
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">ADMINISTRATION</p>
            <h1>Rider Assignments</h1>
            <p className="muted">
              Assign available delivery orders to riders and monitor their
              responsibilities.
            </p>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message" role="status">
            {message}
          </div>
        )}

        <section className="order-form">
          <p className="eyebrow">NEW ASSIGNMENT</p>
          <h2>Assign a Rider</h2>

          {riders.length === 0 ? (
            <p className="muted">
              No riders were returned by the API. Check that your Laravel
              assignments endpoint provides a riders list.
            </p>
          ) : availableOrders.length === 0 ? (
            <p className="muted">
              No unassigned orders are currently available.
            </p>
          ) : (
            <form
              className="auth-form"
              onSubmit={handleCreateAssignment}
            >
              <label htmlFor="orderId">Delivery order</label>

              <select
                id="orderId"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                required
              >
                <option value="">Select an order</option>

                {availableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} — {order.delivery_address}
                  </option>
                ))}
              </select>

              <label htmlFor="riderId">Rider</label>

              <select
                id="riderId"
                value={riderId}
                onChange={(event) => setRiderId(event.target.value)}
                required
              >
                <option value="">Select a rider</option>

                {riders.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name} ({rider.email})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Assigning..." : "Assign Rider"}
              </button>
            </form>
          )}
        </section>

        <section className="orders-panel">
          <div className="orders-toolbar">
            <div>
              <h2>Current Assignments</h2>
              <p className="muted">
                {assignments.length} assignment
                {assignments.length === 1 ? "" : "s"} found
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={loadAssignments}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="loading-screen">
              Loading assignments...
            </p>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <span>🚚</span>
              <h3>No assignments yet</h3>
              <p className="muted">
                Create an assignment above to connect a delivery order with
                a rider.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {assignments.map((assignment) => {
                const order = assignment.delivery_order;
                const rider = assignment.rider;

                return (
                  <article
                    className="order-card"
                    key={assignment.id}
                  >
                    <div className="order-card-header">
                      <div>
                        <p className="eyebrow">ASSIGNMENT</p>
                        <h3>
                          {order?.order_number ||
                            `Order #${assignment.delivery_order_id}`}
                        </h3>
                      </div>

                      <span className="order-status status-confirmed">
                        {order?.status || "Assigned"}
                      </span>
                    </div>

                    <div className="order-details">
                      <p>
                        <strong>Rider:</strong>{" "}
                        {rider?.name || "Rider information unavailable"}
                      </p>

                      {rider?.email && (
                        <p>
                          <strong>Email:</strong> {rider.email}
                        </p>
                      )}

                      {order?.delivery_address && (
                        <p>
                          <strong>Delivery address:</strong>{" "}
                          {order.delivery_address}
                        </p>
                      )}

                      {order?.delivery_date && (
                        <p>
                          <strong>Delivery date:</strong>{" "}
                          {order.delivery_date}
                        </p>
                      )}
                    </div>

                    <div className="order-card-footer">
                      <span className="muted">
                        Assignment ID: {assignment.id}
                      </span>

                      <div className="order-actions">
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDeleteAssignment(assignment)
                          }
                        >
                          Remove Assignment
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} AquaRoute</p>
        <p>Water delivery made easier.</p>
      </footer>

      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!loggingOut) setShowLogoutModal(false);
          }}
        >
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="logout-modal-icon">!</div>

            <h2 id="logout-title">Confirm Logout</h2>
            <p>Are you sure you want to log out?</p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={loggingOut}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={loggingOut}
                onClick={confirmLogout}
              >
                {loggingOut ? "Logging out..." : "Yes, Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
