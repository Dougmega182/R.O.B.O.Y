export type Transaction = {
  id: string;
  account_id: string;
  amount_cents: number;
  reason: string;
  created_at: string;
};

export type LedgerResponse = {
  version: number;
  balance_cents: number;
  transactions: Transaction[];
};

export function isLedgerResponse(data: any): data is LedgerResponse {
  return typeof data?.version === 'number' && typeof data?.balance_cents === 'number' && Array.isArray(data?.transactions);
}

