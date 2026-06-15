import { useQuery } from '@tanstack/react-query';
import { fetchAdherenceRange, fetchOrgAdherenceSummary } from '../lib/api/adherence';
import { format, subDays } from 'date-fns';

/** 30-day adherence for a single patient */
export function usePatientAdherence(patientId: string | undefined, days = 30) {
  const toDate   = format(new Date(), 'yyyy-MM-dd');
  const fromDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['adherence', patientId, fromDate, toDate],
    queryFn:  () => fetchAdherenceRange(patientId!, fromDate, toDate),
    enabled:  !!patientId,
    staleTime: 5 * 60_000,
  });
}

/** Org-wide adherence summary (for Dashboard overview) */
export function useOrgAdherenceSummary() {
  return useQuery({
    queryKey: ['adherence', 'org-summary'],
    queryFn:  fetchOrgAdherenceSummary,
    staleTime: 5 * 60_000,
  });
}
