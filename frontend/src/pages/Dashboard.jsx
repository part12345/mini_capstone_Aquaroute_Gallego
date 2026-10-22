
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await api.get("/dashboard");

        if (!cancelled) {
          setStatistics(response.data.statistics || {});
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard statistics. Please check your connection."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogoutClick() {
    setShowLogoutModal(true);
  }

  async function confirmLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch {
      // The AuthContext clears the local session in its finally block.
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  const cards = [
    {
      title: "Total Orders",
      value: statistics.total_orders ?? 0,
      icon: "📦",
    },
    {
      title: "Pending Orders",
      value: statistics.pending_orders ?? 0,
      icon: "⏳",
    },
    {
      title: "In Progress",
      value: statistics.in_progress_orders ?? 0,
      icon: "🚚",
    },
    {
      title: "Delivered Orders",
      value: statistics.delivered_orders ?? 0,
      icon: "✓",
    },
  ];

  const revenue = Number(statistics.total_revenue ?? 0).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

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
            <p className="eyebrow">OVERVIEW</p>
            <h1>Welcome, {user?.name || "User"}!</h1>
            <p className="muted">
              Track your water delivery service in one place.
            </p>
          </div>

          <Link to="/orders" className="primary-button">
            View Orders
          </Link>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="loading-screen">Loading dashboard...</p>
        ) : (
          <>
            <section className="statistics-grid">
              {cards.map((card) => (
                <article className="stat-card" key={card.title}>
                  <span className="stat-icon">{card.icon}</span>
                  <p>{card.title}</p>
                  <h2>{card.value}</h2>
                </article>
              ))}
            </section>

            {user?.role === "manager" && (
              <section className="manager-panel">
                <p className="eyebrow">ADMINISTRATION</p>
                <h2>Manager Overview</h2>
                <p className="muted">
                  Monitor customers, delivery revenue, and rider assignments.
                </p>

                <div className="manager-stats">
                  <div>
                    <span>Total Customers</span>
                    <strong>
                      {statistics.total_customers ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>Delivered Revenue</span>
                    <strong>₱{revenue}</strong>
                  </div>
                </div>

                <Link to="/assignments" className="primary-button">
                  Manage Rider Assignments
                </Link>
              </section>
            )}

            <section className="dashboard-info">
              <p className="eyebrow">WHAT WE OFFER</p>
              <h2>Our Services</h2>
              <p className="muted">
                Choose the service that meets your water delivery needs.
              </p>

              <div className="service-options">
                <article className="service-item">
                  <span className="service-icon">💧</span>
                  <div>
                    <h3>Water Refill</h3>
                    <p>
                      Refill your existing water container with fresh
                      drinking water.
                    </p>
                  </div>
                </article>

                <article className="service-item">
                  <span className="service-icon">🔄</span>
                  <div>
                    <h3>Container Exchange</h3>
                    <p>
                      Exchange an empty water container for a full one.
                    </p>
                  </div>
                </article>
              </div>

              <div className="dashboard-cta">
                <div>
                  <h3>Need a water delivery?</h3>
                  <p className="muted">
                    Create an order and track its progress.
                  </p>
                </div>

                <Link to="/orders" className="primary-button">
                  Manage Orders
                </Link>
              </div>
            </section>
          </>
        )}
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
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={confirmLogout}
                disabled={loggingOut}
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