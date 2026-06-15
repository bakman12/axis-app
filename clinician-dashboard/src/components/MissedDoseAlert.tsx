// MissedDoseAlert.tsx
// Shows a terracotta alert card for patients with low 7-day adherence.
// Receives data as props — never fetches.

interface Props {
  displayName: string;
  patientId: string;
  avgRate7d: number;
  missedDays: number;
  onView: (patientId: string) => void;
}

export function MissedDoseAlert({ displayName, patientId, avgRate7d, missedDays, onView }: Props) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'rgba(199,91,58,0.06)',
        border: '1px solid rgba(199,91,58,0.2)',
        borderRadius: 12,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Warning icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c75b3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" flexShrink={0} aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 2 }}>
          {displayName}
        </p>
        <p style={{ fontSize: '0.78rem', color: '#8a8a8a' }}>
          {Math.round(avgRate7d * 100)}% adherence this week · {missedDays} low-adherence day{missedDays !== 1 ? 's' : ''}
        </p>
      </div>

      <button
        onClick={() => onView(patientId)}
        style={{
          padding: '8px 16px',
          background: '#c75b3a',
          color: '#faf9f6',
          border: 'none',
          borderRadius: 100,
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minHeight: 36,
        }}
      >
        View
      </button>
    </div>
  );
}
