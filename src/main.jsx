import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initSentry, Sentry } from '@/lib/sentry'

initSentry();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <App />
  </Sentry.ErrorBoundary>
);

function ErrorFallback({ error, resetError }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#faf9f6',
      color: '#2c2c2c',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.8rem',
        marginBottom: 12,
        letterSpacing: '-0.02em',
      }}>Something went wrong</h1>
      <p style={{ color: '#8a8a8a', maxWidth: 420, marginBottom: 24, lineHeight: 1.6 }}>
        Axis hit an unexpected error. Your data is safe — it's encrypted on your device. Tap to retry.
      </p>
      <button
        onClick={resetError}
        style={{
          padding: '12px 28px',
          background: '#c75b3a',
          color: '#faf9f6',
          border: 'none',
          borderRadius: 100,
          fontSize: '0.88rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
