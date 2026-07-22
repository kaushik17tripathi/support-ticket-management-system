import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  createComment,
  fetchTicket,
  transitionTicketStatus,
  updateTicket,
} from "../api/client";
import type { Priority, TicketDetail, TicketStatus } from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState, ErrorBanner, FieldError, PageLoading } from "../components/Feedback";
import { useActingUser } from "../context/ActingUserContext";
import { formatDateTime } from "../utils/dates";
import { mapFieldErrors, userFacingMessage } from "../utils/errors";
import {
  PRIORITIES,
  formatPriority,
  formatStatus,
  isTerminalStatus,
  transitionActionLabel,
} from "../utils/labels";

type EditFormState = {
  title: string;
  description: string;
  priority: Priority;
  assignedToId: string;
};

function toEditForm(ticket: TicketDetail): EditFormState {
  return {
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    assignedToId: ticket.assignedTo?.id ?? "",
  };
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    users,
    actingUserId,
    hasActingUser,
    setActingUserAlert,
  } = useActingUser();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [banner, setBanner] = useState<{
    message: string;
    variant: "error" | "warning" | "success";
  } | null>(null);
  const [transitioningTo, setTransitioningTo] = useState<TicketStatus | null>(null);

  const [commentMessage, setCommentMessage] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoadError(null);
    setNotFound(false);

    try {
      const data = await fetchTicket(id);
      setTicket(data);
      setEditForm(toEditForm(data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setTicket(null);
      } else {
        setLoadError(userFacingMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadTicket();
  }, [loadTicket]);

  const terminal = ticket ? isTerminalStatus(ticket.status) : false;

  function startEditing() {
    if (!ticket) {
      return;
    }

    setEditForm(toEditForm(ticket));
    setFieldErrors({});
    setEditing(true);
  }

  function cancelEditing() {
    if (ticket) {
      setEditForm(toEditForm(ticket));
    }

    setFieldErrors({});
    setEditing(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!ticket || !editForm || !hasActingUser) {
      return;
    }

    setFieldErrors({});
    setBanner(null);
    setSaving(true);

    try {
      const updated = await updateTicket(
        ticket.id,
        {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          priority: editForm.priority,
          assignedToId: editForm.assignedToId || null,
        },
        actingUserId,
      );

      setTicket(updated);
      setEditForm(toEditForm(updated));
      setEditing(false);
      setBanner({ message: "Ticket updated successfully.", variant: "success" });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_ACTING_USER") {
          setActingUserAlert("Please re-select an acting user in the header.");
        } else if (err.code === "TERMINAL_TICKET_READ_ONLY") {
          await loadTicket();
          setBanner({ message: err.message, variant: "error" });
          setEditing(false);
        } else if (err.code === "VALIDATION_ERROR") {
          setFieldErrors(mapFieldErrors(err));
        } else {
          setBanner({ message: userFacingMessage(err), variant: "error" });
        }
      } else {
        setBanner({ message: userFacingMessage(err), variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(targetStatus: TicketStatus) {
    if (!ticket || !hasActingUser) {
      return;
    }

    setTransitioningTo(targetStatus);
    setBanner(null);

    try {
      const updated = await transitionTicketStatus(
        ticket.id,
        { status: targetStatus, expectedStatus: ticket.status },
        actingUserId,
      );

      setTicket(updated);
      setEditForm(toEditForm(updated));
      setBanner({
        message: `Status updated to ${formatStatus(targetStatus)}.`,
        variant: "success",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "STATUS_CONFLICT") {
          await loadTicket();
          setBanner({
            message: "Status changed — please try again.",
            variant: "warning",
          });
        } else if (
          err.code === "INVALID_STATUS_TRANSITION" ||
          err.code === "TERMINAL_TICKET_READ_ONLY"
        ) {
          await loadTicket();
          setEditing(false);
          setBanner({ message: err.message, variant: "error" });
        } else if (err.code === "INVALID_ACTING_USER") {
          setActingUserAlert("Please re-select an acting user in the header.");
        } else {
          setBanner({ message: userFacingMessage(err), variant: "error" });
        }
      } else {
        setBanner({ message: userFacingMessage(err), variant: "error" });
      }
    } finally {
      setTransitioningTo(null);
    }
  }

  async function handleCommentSubmit(event: FormEvent) {
    event.preventDefault();

    if (!ticket || !hasActingUser) {
      return;
    }

    const trimmed = commentMessage.trim();

    if (!trimmed) {
      setCommentError("Message is required");
      return;
    }

    setCommentError(null);
    setPostingComment(true);

    try {
      await createComment(ticket.id, trimmed, actingUserId);
      setCommentMessage("");
      await loadTicket();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_ACTING_USER") {
          setActingUserAlert("Please re-select an acting user in the header.");
        } else if (err.code === "TERMINAL_TICKET_READ_ONLY") {
          await loadTicket();
          setCommentError(err.message);
        } else if (err.code === "VALIDATION_ERROR") {
          const mapped = mapFieldErrors(err);
          setCommentError(mapped.message ?? err.message);
        } else {
          setCommentError(userFacingMessage(err));
        }
      } else {
        setCommentError(userFacingMessage(err));
      }
    } finally {
      setPostingComment(false);
    }
  }

  if (loading) {
    return <PageLoading label="Loading ticket…" />;
  }

  if (notFound) {
    return (
      <section className="page">
        <EmptyState
          title="Ticket not found"
          description="The ticket may have been removed or the link is incorrect."
          action={
            <Link to="/" className="btn btn-primary">
              Back to tickets
            </Link>
          }
        />
      </section>
    );
  }

  if (!ticket || !editForm) {
    return (
      <section className="page">
        {loadError ? (
          <ErrorBanner message={loadError} onRetry={() => void loadTicket()} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="page">
      <div className="detail-toolbar">
        <Link to="/" className="btn btn-ghost">
          ← Back to tickets
        </Link>

        {!terminal ? (
          <div className="detail-toolbar-actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="ticket-edit-form"
                  className="btn btn-primary"
                  disabled={saving || !hasActingUser}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startEditing}
                disabled={!hasActingUser}
              >
                Edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      {banner ? (
        <ErrorBanner
          message={banner.message}
          variant={banner.variant}
          onDismiss={() => setBanner(null)}
        />
      ) : null}

      <article className={`detail-card ${terminal ? "detail-card-terminal" : ""}`}>
        {terminal ? (
          <div className={`terminal-banner terminal-banner-${ticket.status.toLowerCase()}`}>
            {ticket.status === "CLOSED"
              ? "This ticket is closed and cannot be modified."
              : "This ticket was cancelled and cannot be modified."}
          </div>
        ) : null}

        <form id="ticket-edit-form" onSubmit={(event) => void handleSave(event)}>
          <header className="detail-header">
            {editing ? (
              <div className="form-field">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  className="input"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm({ ...editForm, title: event.target.value })
                  }
                  disabled={saving}
                />
                <FieldError message={fieldErrors.title} />
              </div>
            ) : (
              <h1>{ticket.title}</h1>
            )}
          </header>

          <div className="detail-meta">
            <div>
              <span className="meta-label">Status</span>
              <StatusBadge status={ticket.status} />
            </div>
            <div>
              <span className="meta-label">Priority</span>
              {editing ? (
                <select
                  className="input"
                  value={editForm.priority}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      priority: event.target.value as Priority,
                    })
                  }
                  disabled={saving}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {formatPriority(value)}
                    </option>
                  ))}
                </select>
              ) : (
                <PriorityBadge priority={ticket.priority} />
              )}
              <FieldError message={fieldErrors.priority} />
            </div>
            <div>
              <span className="meta-label">Assignee</span>
              {editing ? (
                <select
                  className="input"
                  value={editForm.assignedToId}
                  onChange={(event) =>
                    setEditForm({ ...editForm, assignedToId: event.target.value })
                  }
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{ticket.assignedTo?.name ?? "Unassigned"}</span>
              )}
              <FieldError message={fieldErrors.assignedToId} />
            </div>
            <div>
              <span className="meta-label">Created by</span>
              <span>
                {ticket.createdBy.name} · {formatDateTime(ticket.createdAt)}
              </span>
            </div>
            <div>
              <span className="meta-label">Updated</span>
              <span>{formatDateTime(ticket.updatedAt)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h2>Description</h2>
            {editing ? (
              <>
                <textarea
                  className="input textarea"
                  rows={6}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm({ ...editForm, description: event.target.value })
                  }
                  disabled={saving}
                />
                <FieldError message={fieldErrors.description} />
              </>
            ) : (
              <p className="detail-description">{ticket.description}</p>
            )}
          </div>
        </form>

        {!terminal && ticket.allowedStatuses.length > 0 ? (
          <div className="detail-section">
            <h2>Status actions</h2>
            <div className="status-actions">
              {ticket.allowedStatuses.map((target) => (
                <button
                  key={target}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleTransition(target)}
                  disabled={!hasActingUser || transitioningTo !== null}
                >
                  {transitioningTo === target
                    ? "Updating…"
                    : transitionActionLabel(target)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="detail-section">
          <h2>Comments</h2>

          {ticket.comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            <ul className="comment-list">
              {ticket.comments.map((comment) => (
                <li key={comment.id} className="comment-item">
                  <div className="comment-meta">
                    <strong>{comment.createdBy.name}</strong>
                    <span>{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p>{comment.message}</p>
                </li>
              ))}
            </ul>
          )}

          {!terminal ? (
            <form
              className="comment-form"
              onSubmit={(event) => void handleCommentSubmit(event)}
            >
              <label htmlFor="comment-message">Add comment</label>
              <textarea
                id="comment-message"
                className="input textarea"
                rows={3}
                value={commentMessage}
                onChange={(event) => setCommentMessage(event.target.value)}
                disabled={postingComment}
              />
              <FieldError message={commentError ?? undefined} />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={postingComment || !hasActingUser}
              >
                {postingComment ? "Posting…" : "Post comment"}
              </button>
            </form>
          ) : null}
        </div>
      </article>
    </section>
  );
}
