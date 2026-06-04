import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import './lib/errorHandler'; // This initializes Sentry

// Register PWA Service Worker
registerSW({
  onOfflineReady() {
    console.log('Bhagyoday ERP: Ready for offline use');
  },
  onNeedRefresh() {
    // Only reload if the user clicks 'Update' elsewhere or we can add a prompt later
    console.info('New content available, refresh to update.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
