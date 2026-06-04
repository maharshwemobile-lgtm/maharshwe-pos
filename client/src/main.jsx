import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f4f7',
          fontFamily: 'system-ui,sans-serif',
          padding: 20
        }}>
          <div style={{
            width: 420,
            maxWidth: '100%',
            background: '#fff',
            border: '1px solid #e8e6f0',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 8px 32px rgba(83,74,183,.08)'
          }}>
            <h1 style={{ fontSize: 20, margin: '0 0 8px', color: '#534AB7' }}>POS loading failed</h1>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5, margin: '0 0 16px' }}>
              Saved login data may be expired. Clear it and refresh to open the login page again.
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem('ms_token');
                  window.localStorage.removeItem('ms_user');
                } catch (_) {}
                window.location.reload();
              }}
              style={{
                width: '100%',
                border: '1px solid #7F77DD',
                background: '#7F77DD',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Clear Saved Login & Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
