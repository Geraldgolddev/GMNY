# Feature 8 — Base Network Integration

## Architecture

```
Browser (/dashboard/wallet, /dashboard/history)
    │ Bearer token
    ▼
BaseController
  GET  /api/v1/base/network
  GET  /api/v1/base/balance/me
  GET  /api/v1/base/tx/:txHash
  POST /api/v1/base/transfers/:id/sync
        │
        ▼
BaseService
  ├─ BaseNetworkConfig (chainId, USDC, explorer)
  └─ JsonRpcTransport
        ├─ SimulatedBaseRpc   (BASE_RPC_MODE=simulate)
        └─ FetchJsonRpcClient (BASE_RPC_MODE=live → BASE_RPC_URL)

CircleSettlementAdapter → persists chain + txHash + usdcAmount on transfers
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Canonical Base + Base Sepolia constants | Stable USDC addresses / explorers without hardcoding in Nest |
| Minimal JSON-RPC (`eth_call` / receipt) | No heavy web3 SDK; easy to test with a simulator |
| Simulate RPC by default | CI/local works offline; flip to live public Base RPC when ready |
| On-chain fields on `transfers` | History/detail can deep-link to Basescan |
| Sync endpoint | Confirm PROCESSING sends once a tx hash is known |

## Database changes

### `transfers`

| Column | Notes |
|--------|--------|
| `chain` | `BASE` / `BASE_SEPOLIA` |
| `tx_hash` | On-chain transaction hash |
| `usdc_amount` | Net USDC moved on Base |

Migration: `20260718060000_base_onchain`

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_RPC_MODE` | `simulate` | `live` hits real JSON-RPC |
| `BASE_RPC_URL` | public Base RPC | Optional override |
| `BASE_CHAIN` / `CIRCLE_CHAIN` | `BASE_SEPOLIA` | Active network |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/base/network` | Chain id, USDC contract, explorer, RPC mode |
| GET | `/base/balance/me` | USDC balance for user wallet |
| GET | `/base/tx/:txHash` | Receipt status + explorer URL |
| POST | `/base/transfers/:id/sync` | Confirm/fail from Base receipt |

## Frontend

- `/dashboard/wallet` — Base network panel + USDC balance + Basescan link
- `/dashboard/history` — chain / USDC / tx explorer on detail

## Tests

- `@gmny/blockchain` USDC/RPC helpers
- `BaseService` balance + sync

## Next feature

**Feature 9 — Notifications** — Done (`FEATURE_09_NOTIFICATIONS.md`)
