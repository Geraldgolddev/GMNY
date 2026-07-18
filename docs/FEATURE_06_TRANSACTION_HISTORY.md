# Feature 6 — Transaction History

## Architecture

```
Browser (/dashboard/history)
    │ Bearer token
    ▼
HistoryController
  GET /api/v1/history/summary
  GET /api/v1/history              (paginated transfers)
  GET /api/v1/history/ledger       (paginated ledger lines)
  GET /api/v1/history/:id          (transfer + ledger breakdown)
        │
        ▼
HistoryService → Prisma
  transfers (user-facing sends)
  transactions (ledger: TRANSFER / FEE / FX_CONVERSION)
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Separate `HistoryModule` | Keeps send orchestration in Transfers; history is read/query focused |
| Transfers as primary list | Users care about sends; ledger is the audit breakdown |
| Offset pagination | Simple, enough for MVP volumes; cursor can come later |
| Summary aggregates | Dashboard-ready totals without scanning the full list client-side |
| No new migration | Feature 5 already created `transfers` + `transactions` + indexes |

## Database changes

None. Uses existing tables and indexes from Feature 5:

- `transfers` — `@@index([userId, createdAt])`, `@@index([status])`
- `transactions` — `@@index([userId, createdAt])`, `@@index([transferId])`, `@@index([type, status])`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/history/summary` | Totals: count, sent USD, fees, received NGN |
| GET | `/history` | Paginated transfers (`page`, `pageSize`, `status`, `from`, `to`) |
| GET | `/history/ledger` | Paginated ledger (`type`, `status`, `transferId`, dates) |
| GET | `/history/:id` | Transfer detail + ordered ledger lines |

Defaults: `page=1`, `pageSize=20`, max `pageSize=100`.

## Frontend

- `/dashboard/history` — summary chips, status filters, paginated transfer list, detail panel with ledger
- Nav: **History**

## Tests

- `HistoryService` — summary, list, detail, ledger, validation, not-found

## Next feature

**Feature 7 — Circle Sandbox Integration** — Done (`FEATURE_07_CIRCLE_SANDBOX.md`)
