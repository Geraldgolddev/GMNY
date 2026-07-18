export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
};

export type AuthResponse = {
  user: PublicUser;
  tokens: AuthTokens;
};

export type {
  DashboardOverview,
  DashboardSecurityEvent,
} from './dashboard';

export type {
  Recipient,
  CreateRecipientInput,
  UpdateRecipientInput,
} from './recipients';

export { QuoteDirection } from './rates';
export type {
  ExchangeRateView,
  QuoteRequest,
  QuoteResponse,
} from './rates';

export {
  TransferStatus,
  TRANSFER_FEE_RATE,
  MIN_TRANSFER_USD,
  MAX_TRANSFER_USD,
} from './transfers';
export type { CreateTransferInput, TransferView } from './transfers';

export {
  LedgerTransactionType,
  LedgerTransactionStatus,
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_MAX_PAGE_SIZE,
} from './history';
export type {
  LedgerEntryView,
  HistoryListQuery,
  LedgerListQuery,
  PaginatedResult,
  TransferHistoryDetail,
  HistorySummary,
} from './history';

export {
  WalletProvider,
  WalletChain,
  WalletStatus,
} from './wallets';
export type { WalletView, CircleStatusView } from './wallets';

export type {
  BaseNetworkView,
  UsdcBalanceView,
  OnChainTxView,
} from './base';

export {
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from './notifications';
export type {
  NotificationView,
  NotificationListResult,
  NotificationUnreadCount,
} from './notifications';

export type {
  AdminOverview,
  AdminUserView,
  AdminTransferView,
  AdminAuditView,
  AdminUserListResult,
  AdminTransferListResult,
  UpdateAdminUserInput,
} from './admin';


