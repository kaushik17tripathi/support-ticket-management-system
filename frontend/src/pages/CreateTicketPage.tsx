import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, createTicket } from "../api/client";
import type { Priority } from "../api/types";
import { ErrorBanner, FieldError } from "../components/Feedback";
import { useActingUser } from "../context/ActingUserContext";
import { PRIORITIES, formatPriority } from "../utils/labels";
import { mapFieldErrors, userFacingMessage } from "../utils/errors";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const { users, actingUserId, hasActingUser, setActingUserAlert } = useActingUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [assignedToId, setAssignedToId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const clientErrors: Record<string, string> = {};

    if (!trimmedTitle) {
      clientErrors.title = "Title is required";
    }

    if (!trimmedDescription) {
      clientErrors.description = "Description is required";
    }

    if (!priority) {
      clientErrors.priority = "Priority is required";
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    if (!hasActingUser) {
      setFormError("Select an acting user in the header before creating a ticket.");
      return;
    }

    setSubmitting(true);

    try {
      const ticket = await createTicket(
        {
          title: trimmedTitle,
          description: trimmedDescription,
          priority: priority as Priority,
          assignedToId: assignedToId || null,
        },
        actingUserId,
      );

      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_ACTING_USER") {
          setActingUserAlert("Please re-select an acting user in the header.");
        } else if (err.code === "VALIDATION_ERROR") {
          setFieldErrors(mapFieldErrors(err));
          if (!err.details?.length) {
            setFormError(err.message);
          }
        } else {
          setFormError(userFacingMessage(err));
        }
      } else {
        setFormError(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Create ticket</h1>
          <p className="page-subtitle">All fields marked required must be filled in.</p>
        </div>
      </div>

      {formError ? <ErrorBanner message={formError} onDismiss={() => setFormError(null)} /> : null}

      <form className="form-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-field">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.title} />
        </div>

        <div className="form-field">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            className="input textarea"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div className="form-field">
          <label htmlFor="priority">Priority *</label>
          <select
            id="priority"
            className="input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority | "")}
            disabled={submitting}
          >
            <option value="">Select priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {formatPriority(value)}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.priority} />
        </div>

        <div className="form-field">
          <label htmlFor="assignedToId">Assignee</label>
          <select
            id="assignedToId"
            className="input"
            value={assignedToId}
            onChange={(event) => setAssignedToId(event.target.value)}
            disabled={submitting}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.assignedToId} />
        </div>

        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !hasActingUser}
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </form>
    </section>
  );
}
