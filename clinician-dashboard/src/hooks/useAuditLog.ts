import { useQuery } from '@tanstack/react-query';
import { fetchAuditLog } from '../lib/api/audit';
import type { AuditAction } from '../lib/database.types';

export function useAuditLog(options: {
  patientId?: string;
  action?: AuditAction;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ['audit-log', options],
    queryFn:  () => fetchAuditLog(options),
    staleTime: 30_000,
    // Non-admins get empty array from RLS — no error, just empty
  });
}
