
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const initialForm = {
  delivery_address: "",
  delivery_date: "",
  service_type: "refill",
  quantity: 1,
};

const statusOptions = [
  "Pending",
  "Confirmed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

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

function formatCurrency(amount) {
  return Number(amount ?? 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatDate(date) {
  if (!date) return "Not scheduled";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function statusClass(status) {
  return `status-${String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-")}`;
}

export default function Orders() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Logout confirmation state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isManager = user?.role === "manager";
  const isRider = user?.role === "rider";
  const canCreateOrders =
    user?.role === "customer" || isManager;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/orders", {
        params: {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
        },
      });

      const payload = response.data;
      const records = Array.isArray(payload)
        ? payload
        : payload.data || [];

      setOrders(records);

      setLastPage(
        Number(payload.meta?.last_page ?? payload.last_page ?? 1)
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, [loadOrders]);

  // Open the logout confirmation
  function handleLogoutClick() {
    setShowLogoutModal(true);
  }

  // Log out only after confirmation
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

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  }

  async function handleCreateOrder(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      await api.post("/orders", {
        ...form,
        quantity: Number(form.quantity),
      });

      setForm(initialForm);
      setPage(1);
      setMessage("Your order was created successfully.");

      // Reload page 1 so the newly created order can be displayed.
      if (page !== 1) {
        setPage(1);
      } else {
        await loadOrders();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(order, nextStatus) {
    setError("");
    setMessage("");

    try {
      await api.patch(`/orders/${order.id}/status`, {
        status: nextStatus,
      });

      setMessage(`Order ${order.order_number} was updated.`);
      await loadOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(order) {
    const confirmed = window.confirm(
      `Delete order ${order.order_number}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/orders/${order.id}`);
      setMessage("Order deleted successfully.");
      await loadOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function canUpdateStatus(order) {
    if (isManager) return true;

    return isRider && order.status === "Out for Delivery";
  }

  function getNextStatus(order) {
    if (isRider && order.status === "Out for Delivery") {
      return "Delivered";
    }

    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">A</span>
          AquaRoute
        </Link>

        <div className="header-actions">
          <span className="role-badge">
            {user?.role || "Customer"}
          </span>

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
            <p className="eyebrow">ORDER MANAGEMENT</p>
            <h1>Delivery Orders</h1>
            <p className="muted">
              Manage water refills, container exchanges, and delivery
              progress.
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

        {canCreateOrders && (
          <section className="order-form">
            <p className="eyebrow">NEW REQUEST</p>
            <h2>Create a Delivery Order</h2>

            <form onSubmit={handleCreateOrder} className="auth-form">
              <label htmlFor="delivery_address">
                Delivery address
              </label>

              <textarea
                id="delivery_address"
                name="delivery_address"
                value={form.delivery_address}
                onChange={updateField}
                placeholder="Enter your complete delivery address"
                rows={3}
                maxLength={1000}
                required
              />

              <label htmlFor="delivery_date">Delivery date</label>

              <input
                id="delivery_date"
                name="delivery_date"
                type="date"
                value={form.delivery_date}
                onChange={updateField}
                min={getLocalDateString()}
                required
              />

              <label htmlFor="service_type">Service type</label>

              <select
                id="service_type"
                name="service_type"
                value={form.service_type}
                onChange={updateField}
                required
              >
                <option value="refill">Water Refill</option>
                <option value="exchange">Container Exchange</option>
              </select>

              <label htmlFor="quantity">Quantity</label>

              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max="100"
                value={form.quantity}
                onChange={updateField}
                required
              />

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Creating Order..." : "Create Order"}
              </button>
            </form>
          </section>
        )}

        <section className="orders-panel">
          <div className="orders-toolbar">
            <div>
              <h2>All Orders</h2>
              <p className="muted">
                Search orders or filter by delivery status.
              </p>
            </div>

            <div className="order-filters">
              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search orders..."
                aria-label="Search orders"
              />

              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>

                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="loading-screen">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <span>📦</span>
              <h3>No orders found</h3>
              <p className="muted">
                Try another search, change the status filter, or create
                a new order.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const nextStatus = getNextStatus(order);

                return (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-header">
                      <div>
                        <p className="eyebrow">ORDER NUMBER</p>
                        <h3>{order.order_number}</h3>
                      </div>

                      <span
                        className={`order-status ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="order-details">
                      <p>
                        <strong>Service:</strong>{" "}
                        {order.service_type === "exchange"
                          ? "Container Exchange"
                          : "Water Refill"}
                      </p>

                      <p>
                        <strong>Quantity:</strong> {order.quantity}
                      </p>

                      <p>
                        <strong>Delivery date:</strong>{" "}
                        {formatDate(order.delivery_date)}
                      </p>

                      <p>
                        <strong>Address:</strong>{" "}
                        {order.delivery_address}
                      </p>

                      {order.customer?.name && (
                        <p>
                          <strong>Customer:</strong>{" "}
                          {order.customer.name}
                        </p>
                      )}

                      {order.assignment?.rider?.name && (
                        <p>
                          <strong>Assigned rider:</strong>{" "}
                          {order.assignment.rider.name}
                        </p>
                      )}
                    </div>

                    <div className="order-card-footer">
                      <div className="order-total">
                        {formatCurrency(order.total_amount)}
                      </div>

                      <div className="order-actions">
                        {isManager && canUpdateStatus(order) && (
                          <select
                            value={order.status}
                            onChange={(event) =>
                              handleStatusChange(
                                order,
                                event.target.value
                              )
                            }
                            aria-label={`Update status for ${order.order_number}`}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        )}

                        {nextStatus && (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              handleStatusChange(order, nextStatus)
                            }
                          >
                            Mark Delivered
                          </button>
                        )}

                        {isManager && (
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleDelete(order)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {lastPage}
            </span>

            <button
              type="button"
              className="secondary-button"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </section>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} AquaRoute</p>
        <p>Water delivery made easier.</p>
      </footer>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!loggingOut) {
              setShowLogoutModal(false);
            }
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
