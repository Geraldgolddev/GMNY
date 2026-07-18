# Feature 3 — Recipient Management

## Architecture

```
Browser (/dashboard/recipients)
    │ Bearer access token
    ▼
NestJS RecipientsModule
    GET/POST   /api/v1/recipients
    GET/PATCH/DELETE /api/v1/recipients/:id
    │
    ├─ recipients     (user-scoped Nigerian bank accounts)
    └─ audit_logs     (RECIPIENT_CREATED | UPDATED | DELETED)
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Soft delete (`isActive=false`) | Preserve referential integrity for future transfers |
| Unique `(userId, accountNumber, bankName)` | Prevent duplicate payout destinations per user |
| 10-digit account normalization | Nigerian NUBAN length; strips spaces/dashes |
| Default recipient exclusivity | Only one `isDefault=true` per user |
| Owner scoping on every query | Users cannot read/mutate another user's recipients |

## Database changes

### `recipients`

| Column | Notes |
|--------|--------|
| `account_name` | Beneficiary legal/account name |
| `account_number` | 10-digit NUBAN |
| `bank_name` / `bank_code` | Bank identity (code optional for MVP) |
| `country` / `currency` | Default `NG` / `NGN` |
| `is_default` | Preferred payout destination |
| `is_active` | Soft-delete flag |

### `AuditAction` enum additions

`RECIPIENT_CREATED`, `RECIPIENT_UPDATED`, `RECIPIENT_DELETED`

Migration: `packages/database/prisma/migrations/20260718020000_recipients`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/recipients` | List active recipients |
| GET | `/recipients/:id` | Get one |
| POST | `/recipients` | Create |
| PATCH | `/recipients/:id` | Update |
| DELETE | `/recipients/:id` | Soft-delete |

All routes require Bearer auth.

## Frontend

- `/dashboard/recipients` — create/edit/list/remove
- App shell nav: Overview · Recipients

## Tests

`RecipientsService` unit tests: create, validation, conflict, soft-delete, not-found.

## Next feature

**Feature 4 — Live USD/NGN Exchange Rate**
