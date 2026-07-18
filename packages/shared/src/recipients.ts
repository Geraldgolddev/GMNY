export type Recipient = {
  id: string;
  label: string | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string | null;
  country: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipientInput = {
  label?: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  isDefault?: boolean;
};

export type UpdateRecipientInput = {
  label?: string | null;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string | null;
  isDefault?: boolean;
};
