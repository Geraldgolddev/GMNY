# Feature 5 — Send Money

## Architecture

```
Browser (/dashboard/send)
    │ Bearer token
    ▼
TransfersController
  POST /api/v1/transfers
  GET  /api/v1/transfers
  GET  /api/v1/transfers/:id
        │
        ├─ Recipients (ownership check)
        ├─ RatesService.quote (lock FX)
        ├─ SettlementPort.settleUsdToNgn
        │     └─ InternalSettlementAdapter (Circle later)
        └─ Prisma transaction
              transfers + transactions + audit_logs
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| USD→NGN only for send | Matches GMNY US→Nigeria MVP path |
| Fee on source USD (0.5%) | Simple, transparent; applied before FX |
| Idempotency key | Safe retries from flaky clients |
| Settlement port | Swap `INTERNAL` → Circle via `SETTLEMENT_PROVIDER` (Feature 7) |
| Ledger rows (`transactions`) | Durable trail for Feature 6 history + reconciliation |
| Soft ownership checks | Users can only pay their own active recipients |

Fee: `TRANSFER_FEE_RATE = 0.005`  
Limits: `$5`–`$10,000` USD

## Database changes

### `transfers`
Source/dest amounts, locked `fx_rate`, fee, status, settlement provider/ref, unique `idempotency_key`.

### `transactions`
Ledger lines: `TRANSFER`, `FEE`, `FX_CONVERSION` (settled).

### Audit actions
`TRANSFER_CREATED`, `TRANSFER_COMPLETED`, `TRANSFER_FAILED`

Migration: `20260718040000_transfers`

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/transfers` | Create + settle send |
| GET | `/transfers` | List recent (50) |
| GET | `/transfers/:id` | Get one |

Body for create:

```json
{
  "recipientId": "uuid",
  "amountUsd": 100,
  "note": "optional",
  "idempotencyKey": "optional-uuid"
}
```

## Frontend

- `/dashboard/send` — recipient picker, amount, live quote preview, submit
- Recent sends panel
- Nav: **Send**

## Tests

- `TransfersService` — create, validation, idempotency, missing recipient
- `InternalSettlementAdapter` — reference + amount guards

## Next feature

**Feature 6 — Transaction History** — Done (`FEATURE_06_TRANSACTION_HISTORY.md`)
