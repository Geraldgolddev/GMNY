# Feature 9 — Notifications

## Architecture

```
Domain events
  TransfersService / WalletsService / CircleWebhookService
        │
        ▼
NotificationsService.notify()
  ├─ persist notifications (IN_APP, optional EMAIL)
  └─ NotificationDeliveryPort
        └─ ConsoleNotificationDelivery (default)

Browser (/dashboard/notifications)
    │ Bearer token
    ▼
NotificationsController
  GET  /api/v1/notifications
  GET  /api/v1/notifications/unread-count
  PATCH /api/v1/notifications/:id/read
  POST /api/v1/notifications/read-all
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Postgres as source of truth | Durable inbox without requiring Redis for MVP |
| Delivery port | Swap console → SES/Postmark/BullMQ worker later |
| Never fail domain ops on notify | Remittance/wallet success is independent of inbox delivery |
| IN_APP always; EMAIL opt-in | `NOTIFICATIONS_EMAIL_ENABLED` gates email channel rows |
| Unread via `readAt` | Simple; no separate status enum for user-facing read state |

## Database changes

### `notifications`

Type, channel, delivery status, title/body, optional entity link, `read_at` / `sent_at`.

Migration: `20260718070000_notifications`

## Events that notify

| Event | Type |
|-------|------|
| Transfer created | `TRANSFER_CREATED` |
| Transfer completed | `TRANSFER_COMPLETED` |
| Transfer failed (Circle webhook) | `TRANSFER_FAILED` |
| Wallet provisioned | `WALLET_CREATED` |

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `NOTIFICATIONS_EMAIL_ENABLED` | `false` | Also write EMAIL channel copies |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | In-app inbox (`?unreadOnly=true`) |
| GET | `/notifications/unread-count` | Badge count |
| PATCH | `/notifications/:id/read` | Mark one read |
| POST | `/notifications/read-all` | Mark all read |

## Frontend

- `/dashboard/notifications` — inbox + mark read
- Nav **Alerts** with unread badge

## Tests

- `NotificationsService` create/list/read/failure paths
- Transfer / wallet / webhook hooks keep calling `notify`

## Next feature

**Feature 10 — Admin Dashboard** — Done (`FEATURE_10_ADMIN_DASHBOARD.md`)
