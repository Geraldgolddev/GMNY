# Feature 4 — Live USD/NGN Exchange Rate

## Architecture

```
RatesController
  GET  /api/v1/rates              (public)  → cached rate, refresh if stale
  POST /api/v1/rates/refresh      (auth)    → force live fetch
  POST /api/v1/rates/quote        (auth)    → USD↔NGN conversion quote
        │
        ▼
RatesService
  ├─ FxRateProvider (OpenErApiProvider)  → https://open.er-api.com/v6/latest/USD
  └─ exchange_rates (Postgres cache)
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Provider port (`FxRateProvider`) | Swap providers later (Circle FX, paid APIs) without rewriting callers |
| Postgres cache + 15m stale window | Avoids rate-limit thrash; survives provider outages |
| Fallback seed rate | API still boots if network is down |
| Single-flight refresh | Concurrent requests share one in-flight FX fetch |
| Quote endpoint separate from rate | Ready for Send Money fee/spread layering next |

`rate` semantics: **1 USD = rate NGN**.

## Database changes

### `exchange_rates`

| Column | Notes |
|--------|--------|
| `pair` | Unique key, `USDNGN` |
| `base_currency` / `quote_currency` | `USD` / `NGN` |
| `rate` | `Decimal(18,6)` |
| `source` | e.g. `open.er-api.com` |
| `fetched_at` | Provider timestamp / fetch time |

Migration: `20260718030000_exchange_rates`

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/rates` | Public | Current rate (`?refresh=false` to skip stale refresh) |
| POST | `/rates/refresh` | Bearer | Force live refresh |
| POST | `/rates/quote` | Bearer | Body `{ direction, amount }` |

Directions: `USD_TO_NGN` \| `NGN_TO_USD`

## Frontend

- Dashboard card shows live rate
- `/dashboard/rates` — rate detail + USD↔NGN quote converter

## Tests

- `RatesService` — fresh cache, stale refresh, quote, validation
- `OpenErApiProvider` — parse success / missing NGN

## Env

```env
FX_API_URL=https://open.er-api.com/v6/latest/USD
```

## Next feature

**Feature 5 — Send Money**
