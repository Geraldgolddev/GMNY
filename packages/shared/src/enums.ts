/**
 * Canonical domain enums shared across the GMNY platform.
 *
 * These mirror the Prisma schema enums exactly so that the API, workers,
 * and frontends all speak the same language without importing Prisma
 * client types into the browser bundle.
 */

/** Role-based access control roles. */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/** Lifecycle state of a user account. */
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

/** KYC / compliance verification state. */
export enum KycStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Supported settlement currencies. */
export enum Currency {
  USD = 'USD',
  USDC = 'USDC',
  NGN = 'NGN',
}

/** Blockchain networks used for settlement. */
export enum BlockchainNetwork {
  BASE_MAINNET = 'BASE_MAINNET',
  BASE_SEPOLIA = 'BASE_SEPOLIA',
}

/** Custodial wallet type. */
export enum WalletType {
  USER = 'USER',
  TREASURY = 'TREASURY',
}

/** Wallet lifecycle state. */
export enum WalletStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

/**
 * End-to-end lifecycle of a cross-border transfer:
 * USD funding -> USDC settlement on Base -> NGN payout.
 */
export enum TransferStatus {
  DRAFT = 'DRAFT',
  QUOTE_LOCKED = 'QUOTE_LOCKED',
  PENDING = 'PENDING',
  AWAITING_FUNDING = 'AWAITING_FUNDING',
  FUNDED = 'FUNDED',
  ON_CHAIN_PENDING = 'ON_CHAIN_PENDING',
  ON_CHAIN_CONFIRMED = 'ON_CHAIN_CONFIRMED',
  PAYOUT_PENDING = 'PAYOUT_PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

/** Ledger transaction direction / kind. */
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_DEBIT = 'TRANSFER_DEBIT',
  TRANSFER_CREDIT = 'TRANSFER_CREDIT',
  FEE = 'FEE',
  REFUND = 'REFUND',
  TREASURY_REBALANCE = 'TREASURY_REBALANCE',
}

/** Ledger transaction status. */
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

/** Notification delivery channel. */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

/** Notification delivery state. */
export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

/** One-time, single-use security token categories. */
export enum TokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

/** Audit log action categories. */
export enum AuditAction {
  AUTH_REGISTER = 'AUTH_REGISTER',
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_REFRESH = 'AUTH_REFRESH',
  AUTH_PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  AUTH_EMAIL_VERIFY = 'AUTH_EMAIL_VERIFY',
  AUTH_EMAIL_VERIFICATION_SENT = 'AUTH_EMAIL_VERIFICATION_SENT',
  AUTH_FORGOT_PASSWORD = 'AUTH_FORGOT_PASSWORD',
  AUTH_RESET_PASSWORD = 'AUTH_RESET_PASSWORD',
  AUTH_SESSION_REVOKE = 'AUTH_SESSION_REVOKE',
  USER_UPDATE = 'USER_UPDATE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',
  USER_STATUS_CHANGE = 'USER_STATUS_CHANGE',
  WALLET_CREATE = 'WALLET_CREATE',
  RECIPIENT_CREATE = 'RECIPIENT_CREATE',
  RECIPIENT_UPDATE = 'RECIPIENT_UPDATE',
  RECIPIENT_DELETE = 'RECIPIENT_DELETE',
  TRANSFER_CREATE = 'TRANSFER_CREATE',
  TRANSFER_STATUS_CHANGE = 'TRANSFER_STATUS_CHANGE',
  EXCHANGE_RATE_CREATE = 'EXCHANGE_RATE_CREATE',
  KYC_STATUS_CHANGE = 'KYC_STATUS_CHANGE',
  ADMIN_ACTION = 'ADMIN_ACTION',
}
