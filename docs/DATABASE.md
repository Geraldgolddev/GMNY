# GMNY Database Schema

PostgreSQL is the system of record. Prisma schema lives in `packages/database/prisma/schema.prisma`.

## Entity map

| Table | Purpose |
|-------|---------|
| `users` | Identity, role (`USER`/`ADMIN`), KYC status flag |
| `refresh_tokens` | Hashed refresh sessions for revoke/rotate |
| `kyc_profiles` | Compliance profile + screening metadata |
| `wallets` | Custodial USDC wallets (Circle provider id, Base / Base Sepolia) |
| `bank_accounts` | Nigerian (and future) payout destinations |
| `transfers` | End-to-end remittance lifecycle |
| `transactions` | Ledger-style movement records |
| `exchange_rates` | FX quotes with validity windows |
| `notifications` | In-app / email notification inbox + delivery status |
| `treasury_accounts` | Company liquidity balances |
| `audit_logs` | Tamper-evident action history |

## Auth-related design

- Passwords are **never** stored plaintext; Argon2id hashes live in `users.password_hash`.
- Refresh tokens are stored as **SHA-256 hashes** only (`refresh_tokens.token_hash`).
- Logout / rotate revokes prior refresh rows (`revoked_at`).
- Role changes and auth events write `audit_logs`.

## Money fields

Amounts use `Decimal(18,2)` for fiat display amounts and `Decimal(18,8)` for on-chain/USDC precision fields. Application code must use Prisma `Decimal` or string decimals — never floating point for money.

## Migrations

```bash
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
```
