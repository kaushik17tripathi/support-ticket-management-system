import { Link, NavLink, Outlet } from "react-router-dom";
import { useActingUser } from "../context/ActingUserContext";
import { ErrorBanner } from "./Feedback";

export function Layout() {
  const {
    users,
    actingUserId,
    setActingUserId,
    hasActingUser,
    loading,
    error,
    reloadUsers,
    actingUserAlert,
    setActingUserAlert,
  } = useActingUser();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <Link to="/" className="brand-link">
            Support Tickets
          </Link>
        </div>

        <nav className="header-nav" aria-label="Main">
          <NavLink to="/" end className="nav-link">
            Tickets
          </NavLink>
          <NavLink to="/tickets/new" className="nav-link">
            New ticket
          </NavLink>
        </nav>

        <div className="header-acting-user">
          <label htmlFor="acting-user">Acting as</label>
          <select
            id="acting-user"
            value={actingUserId}
            onChange={(event) => setActingUserId(event.target.value)}
            disabled={loading || Boolean(error)}
          >
            <option value="">Select user…</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </header>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void reloadUsers()} />
      ) : null}

      {actingUserAlert ? (
        <ErrorBanner
          message={actingUserAlert}
          variant="warning"
          onDismiss={() => setActingUserAlert(null)}
        />
      ) : null}

      {!hasActingUser && !loading && !error ? (
        <div className="acting-user-hint" role="status">
          Select a user to create or edit tickets.
        </div>
      ) : null}

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
