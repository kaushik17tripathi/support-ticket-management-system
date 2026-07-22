import type { ReactNode } from "react";

type ErrorBannerProps = {
  message: string;
  variant?: "error" | "warning" | "success";
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function ErrorBanner({
  message,
  variant = "error",
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  return (
    <div className={`banner banner-${variant}`} role="alert">
      <span>{message}</span>
      <div className="banner-actions">
        {onRetry ? (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        {onDismiss ? (
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="field-error">{message}</p>;
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="page-loading" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
