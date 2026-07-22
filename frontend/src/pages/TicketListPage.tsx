import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, fetchTickets } from "../api/client";
import type { TicketListItem, TicketStatus } from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState, ErrorBanner, PageLoading } from "../components/Feedback";
import { TICKET_STATUSES, formatStatus } from "../utils/labels";
import { formatDate } from "../utils/dates";
import { userFacingMessage } from "../utils/errors";

const SEARCH_DEBOUNCE_MS = 300;

export function TicketListPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [count, setCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadTickets = useCallback(async () => {
    setError(null);
    setFilterError(null);
    setRefreshing(hasLoadedOnce.current);

    try {
      const result = await fetchTickets({
        search: debouncedSearch,
        status: statusFilter || undefined,
      });

      setTickets(result.data);
      setCount(result.meta.count);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && statusFilter) {
        setFilterError("Invalid status value");
      } else {
        setError(userFacingMessage(err));
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const hasActiveFilters = debouncedSearch.trim() !== "" || statusFilter !== "";

  if (initialLoading) {
    return <PageLoading label="Loading tickets…" />;
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <p className="page-subtitle">Search and filter support tickets</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          + New ticket
        </Link>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="input search-input"
          placeholder="Search title or description…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search tickets"
        />

        <select
          className="input"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TicketStatus | "")
          }
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {filterError ? <p className="field-error">{filterError}</p> : null}

      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadTickets()} />
      ) : null}

      {refreshing ? <p className="refreshing-hint">Refreshing…</p> : null}

      {count === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No tickets match your search/filter"
            description="Try different keywords or clear the filters."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput("");
                  setStatusFilter("");
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No tickets yet"
            description="Create the first ticket to get started."
            action={
              <Link to="/tickets/new" className="btn btn-primary">
                Create ticket
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="table-wrap">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                        {ticket.title}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td>{ticket.assignedTo?.name ?? "Unassigned"}</td>
                    <td>{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="result-count">Showing {count} ticket(s)</p>
        </>
      )}
    </section>
  );
}
