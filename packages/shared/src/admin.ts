import type { TransferStatus } from './transfers';
import type { WalletChain } from './wallets';

export type AdminOverview = {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  transfers: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    volumeUsd: number;
    volumeNgn: number;
  };
  wallets: {
    total: number;
  };
  notifications: {
    unreadInApp: number;
  };
};

export type AdminUserView = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  transferCount: number;
};

export type AdminTransferView = {
  id: string;
  userId: string;
  userEmail: string;
  recipientName: string;
  status: TransferStatus;
  sourceAmount: number;
  destAmount: number;
  feeAmount: number;
  settlementProvider: string;
  settlementRef: string | null;
  chain: WalletChain | null;
  txHash: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type AdminAuditView = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

export type AdminUserListResult = {
  items: AdminUserView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminTransferListResult = {
  items: AdminTransferView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type UpdateAdminUserInput = {
  isActive?: boolean;
};
