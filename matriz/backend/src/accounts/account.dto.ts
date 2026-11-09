import type { Account } from '../generated/prisma/client.js';

/** Conta completa, como em `Account` (openapi.yaml). Nunca inclui o hash. */
export interface AccountDto {
  id: string;
  name: string;
  email: string;
  status: Account['status'];
  isAdmin: boolean;
  isSystemAccount: boolean;
  createdAt: string;
}

export function toAccountDto(account: Account): AccountDto {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    status: account.status,
    isAdmin: account.isAdmin,
    isSystemAccount: account.isSystemAccount,
    createdAt: account.createdAt.toISOString(),
  };
}
