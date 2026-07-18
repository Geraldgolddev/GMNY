# Feature 7 — Circle Sandbox Integration

## Architecture

```
Browser (/dashboard/wallet)
    │ Bearer token
    ▼
WalletsController
  GET  /api/v1/wallets/status
  GET  /api/v1/wallets/me
  POST /api/v1/wallets/me
        │
        ▼
WalletsService → CircleWalletAdapter → CircleClient
                                         ├─ SimulatedCircleClient (default)
                                         └─ LiveCircleClient (CIRCLE_MODE=live)

TransfersModule
  SETTLEMENT_PROVIDER=INTERNAL → InternalSettlementAdapter
  SETTLEMENT_PROVIDER=CIRCLE   → CircleSettlementAdapter
                                   └─ CircleUsdcTransferAdapter

POST /api/v1/webhooks/circle  → status sync (PROCESSING → COMPLETED/FAILED)
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| `CircleClient` port + simulate/live | Local/CI works without Circle credentials; live flips with env |
| Official Circle SDK only for live | Entity-secret ciphertext handled correctly |
| Settlement provider switch | Feature 5 send flow unchanged; CIRCLE is opt-in |
| Wallet per user/chain | Ready for Feature 8 Base work |
| Webhook HMAC optional | Secret required in prod; open in simulate for local testing |

## Database changes

### `wallets`

Custodial USDC wallet rows keyed by `(userId, provider, chain)`.

### Audit actions

`WALLET_CREATED`, `CIRCLE_TRANSFER_CREATED`, `CIRCLE_TRANSFER_UPDATED`

Migration: `20260718050000_circle_wallets`

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `SETTLEMENT_PROVIDER` | `INTERNAL` | Set `CIRCLE` to use Circle for send settlement |
| `CIRCLE_MODE` | `simulate` | `live` uses sandbox/prod API |
| `CIRCLE_CHAIN` | `BASE_SEPOLIA` | Sandbox chain |
| `CIRCLE_API_KEY` | — | Live only |
| `CIRCLE_ENTITY_SECRET` | — | Live only |
| `CIRCLE_WALLET_SET_ID` | — | Live only |
| `CIRCLE_USDC_TOKEN_ID` | — | Live transfers |
| `CIRCLE_TREASURY_WALLET_ID` | — | Optional source wallet |
| `CIRCLE_WEBHOOK_SECRET` | — | HMAC for `/webhooks/circle` |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wallets/status` | Bearer | Circle mode / settlement config |
| GET | `/wallets/me` | Bearer | Current user wallet or `null` |
| POST | `/wallets/me` | Bearer | Provision Circle wallet |
| POST | `/webhooks/circle` | Signature* | Update transfer from Circle status |

## Frontend

- `/dashboard/wallet` — status + provision/view address
- Nav: **Wallet**

## Tests

- `SimulatedCircleClient` (blockchain package)
- `WalletsService`, `CircleSettlementAdapter`, `CircleWebhookService`

## Next feature

**Feature 8 — Base Network Integration** — Done (`FEATURE_08_BASE_NETWORK.md`)
