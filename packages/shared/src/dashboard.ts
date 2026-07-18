import type { PublicUser } from './index';

export type DashboardSecurityEvent = {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string | null;
};

export type DashboardOverview = {
  user: PublicUser & {
    lastLoginAt: string | null;
  };
  security: {
    recentEvents: DashboardSecurityEvent[];
  };
  account: {
    createdAt: string;
    isActive: boolean;
    role: PublicUser['role'];
  };
};
