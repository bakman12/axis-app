// database.types.ts
// Auto-generate the real version with: npx supabase gen types typescript --local
// This hand-written version covers the tables we use in the dashboard.

export type OrgPlan = 'trial' | 'starter' | 'growth' | 'enterprise';
export type ClinicianRole = 'admin' | 'clinician' | 'viewer';
export type AuditAction =
  | 'LOGIN' | 'MFA_ENROLLED' | 'PATIENT_INVITED' | 'PATIENT_CONSENT_GRANTED'
  | 'PATIENT_CONSENT_REVOKED' | 'ADHERENCE_READ' | 'ADHERENCE_WRITTEN'
  | 'ADHERENCE_EXPORT' | 'PATIENT_READ' | 'PATIENT_CREATED'
  | 'CLINICIAN_CREATED' | 'CLINICIAN_DEACTIVATED' | 'SETTINGS_CHANGED';

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: OrgPlan;
          plan_expires_at: string | null;
          max_clinicians: number;
          max_patients: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organisations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organisations']['Insert']>;
      };
      clinicians: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          role: ClinicianRole;
          full_name: string | null;
          mfa_enrolled_at: string | null;
          last_login_at: string | null;
          last_login_ip: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clinicians']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clinicians']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          org_id: string;
          axis_user_id_hash: string;
          invite_code: string;
          invite_expires_at: string;
          display_name: string;
          consent_granted_at: string | null;
          consent_revoked_at: string | null;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      patient_adherence_snapshots: {
        Row: {
          id: string;
          patient_id: string;
          org_id: string;
          date: string;
          total_doses_scheduled: number;
          total_doses_taken: number;
          total_doses_missed: number;
          missed_medication_ids: string[];
          streak_days: number;
          adherence_rate: number | null;
          synced_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patient_adherence_snapshots']['Row'], 'id' | 'adherence_rate' | 'synced_at'>;
        Update: Partial<Database['public']['Tables']['patient_adherence_snapshots']['Insert']>;
      };
      clinical_audit_log: {
        Row: {
          id: string;
          clinician_id: string | null;
          clinician_email: string | null;
          org_id: string;
          patient_id: string | null;
          action: AuditAction;
          resource_table: string | null;
          resource_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clinical_audit_log']['Row'], 'id' | 'created_at'>;
        Update: never; // immutable
      };
    };
    Functions: {};
    Enums: {
      org_plan: OrgPlan;
      clinician_role: ClinicianRole;
      audit_action: AuditAction;
    };
  };
}
