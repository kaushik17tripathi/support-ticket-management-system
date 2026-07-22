/**
 * Dev database seed records for `backend/prisma/seed.ts`.
 *
 * IDs are stable so re-running `npm run db:seed` upserts in place (idempotent).
 * Separate from integration-test users in `backend/tests/integration/testUsers.ts`.
 */

export type DevUserSeed = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type DevTicketSeed = {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DevCommentSeed = {
  id: string;
  ticketId: string;
  message: string;
  createdById: string;
  createdAt: string;
};

export const DEV_USERS: DevUserSeed[] = [
  {
    id: "user_priya_sharma",
    name: "Priya Sharma",
    email: "priya.sharma@support.local",
    role: "agent",
  },
  {
    id: "user_james_chen",
    name: "James Chen",
    email: "james.chen@support.local",
    role: "admin",
  },
  {
    id: "user_maria_lopez",
    name: "Maria Lopez",
    email: "maria.lopez@support.local",
    role: "manager",
  },
  {
    id: "user_alex_kim",
    name: "Alex Kim",
    email: "alex.kim@support.local",
    role: "engineer",
  },
  {
    id: "user_sam_rivera",
    name: "Sam Rivera",
    email: "sam.rivera@support.local",
    role: "agent",
  },
];

export const DEV_TICKETS: DevTicketSeed[] = [
  {
    id: "ticket_sso_login_failure",
    title: "Cannot log in after SSO update",
    description:
      "Several users report redirect loops after the IdP certificate rotation on Friday. Affects Chrome and Edge.",
    priority: "HIGH",
    status: "OPEN",
    createdById: "user_james_chen",
    assignedToId: "user_priya_sharma",
    createdAt: "2026-07-18T09:15:00.000Z",
    updatedAt: "2026-07-20T11:00:00.000Z",
  },
  {
    id: "ticket_printer_floor3",
    title: "Printer not connecting on floor 3",
    description:
      "HP LaserJet in the east wing shows offline. Network team confirmed the VLAN is reachable.",
    priority: "MEDIUM",
    status: "OPEN",
    createdById: "user_maria_lopez",
    assignedToId: null,
    createdAt: "2026-07-19T14:30:00.000Z",
    updatedAt: "2026-07-19T14:30:00.000Z",
  },
  {
    id: "ticket_payment_gateway_timeout",
    title: "Payment gateway timeout in production",
    description:
      "Checkout intermittently fails with 504 from the payment provider. Spike started after the 02:00 deploy.",
    priority: "CRITICAL",
    status: "IN_PROGRESS",
    createdById: "user_james_chen",
    assignedToId: "user_alex_kim",
    createdAt: "2026-07-17T06:45:00.000Z",
    updatedAt: "2026-07-20T08:20:00.000Z",
  },
  {
    id: "ticket_dashboard_stale_charts",
    title: "Dashboard charts showing stale data",
    description:
      "Operations dashboard metrics are 6+ hours behind. Cache invalidation job may have stopped.",
    priority: "HIGH",
    status: "IN_PROGRESS",
    createdById: "user_priya_sharma",
    assignedToId: "user_sam_rivera",
    createdAt: "2026-07-16T16:00:00.000Z",
    updatedAt: "2026-07-19T10:45:00.000Z",
  },
  {
    id: "ticket_email_notifications_delayed",
    title: "Email notifications delayed",
    description:
      "Ticket assignment emails arrive 30–45 minutes late. SMTP relay queue depth looks elevated.",
    priority: "MEDIUM",
    status: "RESOLVED",
    createdById: "user_maria_lopez",
    assignedToId: "user_priya_sharma",
    createdAt: "2026-07-10T11:20:00.000Z",
    updatedAt: "2026-07-15T17:30:00.000Z",
  },
  {
    id: "ticket_csv_export_columns",
    title: "Export CSV missing columns",
    description:
      "Monthly export omits the priority and assignee columns added in the last release.",
    priority: "LOW",
    status: "RESOLVED",
    createdById: "user_sam_rivera",
    assignedToId: "user_alex_kim",
    createdAt: "2026-07-08T13:00:00.000Z",
    updatedAt: "2026-07-12T09:10:00.000Z",
  },
  {
    id: "ticket_login_password_reset",
    title: "Login Issue — password reset loop",
    description:
      "User completes password reset but is sent back to the forgot-password screen. Closed after hotfix.",
    priority: "HIGH",
    status: "CLOSED",
    createdById: "user_james_chen",
    assignedToId: "user_priya_sharma",
    createdAt: "2026-06-28T08:00:00.000Z",
    updatedAt: "2026-07-02T15:45:00.000Z",
  },
  {
    id: "ticket_vpn_contractor_access",
    title: "VPN access request for contractor",
    description:
      "Temporary VPN profile for a 2-week audit engagement. Access revoked on schedule.",
    priority: "MEDIUM",
    status: "CLOSED",
    createdById: "user_maria_lopez",
    assignedToId: "user_maria_lopez",
    createdAt: "2026-06-20T10:30:00.000Z",
    updatedAt: "2026-07-05T18:00:00.000Z",
  },
  {
    id: "ticket_duplicate_merged",
    title: "Duplicate ticket — merged into payment gateway incident",
    description:
      "Reporter filed the same production outage twice. Cancelled in favour of ticket_payment_gateway_timeout.",
    priority: "LOW",
    status: "CANCELLED",
    createdById: "user_sam_rivera",
    assignedToId: null,
    createdAt: "2026-07-17T07:00:00.000Z",
    updatedAt: "2026-07-17T07:15:00.000Z",
  },
  {
    id: "ticket_api_rate_limit",
    title: "API rate limit blocking integrations",
    description:
      "Partner integration hits 429 after ~200 requests/min. Need guidance on quota increase or batching.",
    priority: "CRITICAL",
    status: "OPEN",
    createdById: "user_james_chen",
    assignedToId: "user_alex_kim",
    createdAt: "2026-07-20T07:30:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
];

export const DEV_COMMENTS: DevCommentSeed[] = [
  {
    id: "comment_payment_logs",
    ticketId: "ticket_payment_gateway_timeout",
    message:
      "Pulled gateway logs — upstream latency spikes correlate with deploy window. Rolling back candidate build.",
    createdById: "user_alex_kim",
    createdAt: "2026-07-17T09:30:00.000Z",
  },
  {
    id: "comment_payment_provider",
    ticketId: "ticket_payment_gateway_timeout",
    message:
      "Provider status page shows elevated errors in us-east-1. Opened vendor ticket #88421.",
    createdById: "user_james_chen",
    createdAt: "2026-07-17T11:00:00.000Z",
  },
  {
    id: "comment_dashboard_cache",
    ticketId: "ticket_dashboard_stale_charts",
    message: "Restarted the cache worker; metrics caught up within 10 minutes. Monitoring overnight.",
    createdById: "user_sam_rivera",
    createdAt: "2026-07-19T11:15:00.000Z",
  },
  {
    id: "comment_email_smtp",
    ticketId: "ticket_email_notifications_delayed",
    message:
      "Cleared stuck messages in the relay queue. Delivery latency back to under 2 minutes in staging.",
    createdById: "user_priya_sharma",
    createdAt: "2026-07-15T16:45:00.000Z",
  },
  {
    id: "comment_csv_fix",
    ticketId: "ticket_csv_export_columns",
    message: "Fix merged in v1.4.2 — please verify the July export includes priority and assignee.",
    createdById: "user_alex_kim",
    createdAt: "2026-07-12T08:50:00.000Z",
  },
  {
    id: "comment_api_quota",
    ticketId: "ticket_api_rate_limit",
    message:
      "Shared current rate-limit headers and recommended batch endpoint. Awaiting partner confirmation.",
    createdById: "user_alex_kim",
    createdAt: "2026-07-20T10:00:00.000Z",
  },
];
