export type Chore = {
  id: string;
  title: string;
  assigned_to: string;
  value_cents: number;
  status: 'Pending' | 'Done' | 'Approved';
};

export type ChoresResponse = {
  version: number;
  chores: Chore[];
};

export function isChoresResponse(data: any): data is ChoresResponse {
  return typeof data?.version === 'number' && Array.isArray(data?.chores);
}

