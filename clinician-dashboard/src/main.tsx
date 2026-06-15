import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry, Sentry } from './lib/sentry';

initSentry();

function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#faf9f6', color: '#2c2c2c',
      fontFamily: 'Inter, sans-serif', textAlign: 'center',
    }}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.8rem', marginBottom: 12,
        letterSpacing: '-0.02em',
      }}>Something went wrong</h1>
      <p style={{ color: '#8a8a8a', maxWidth: 420, marginBottom: 24, lineHeight: 1.6 }}>
        The dashboard hit an unexpected error. Reload to try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 28px', background: '#c75b3a', color: '#faf9f6',
          border: 'none', borderRadius: 100, fontSize: '0.88rem',
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
