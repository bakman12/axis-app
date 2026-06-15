import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, fetchPatientWithStats, invitePatient } from '../lib/api/patients';

export const PATIENTS_KEY = ['patients'] as const;

/** All consented patients in the org */
export function usePatients() {
  return useQuery({
    queryKey: PATIENTS_KEY,
    queryFn:  fetchPatients,
    staleTime: 60_000, // 1 minute
  });
}

/** Single patient with 30-day adherence stats */
export function usePatientDetail(patientId: string | undefined) {
  return useQuery({
    queryKey: [...PATIENTS_KEY, patientId],
    queryFn:  () => fetchPatientWithStats(patientId!),
    enabled:  !!patientId,
  });
}

/** Create a patient invite */
export function useInvitePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) => invitePatient(displayName),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PATIENTS_KEY }),
  });
}
