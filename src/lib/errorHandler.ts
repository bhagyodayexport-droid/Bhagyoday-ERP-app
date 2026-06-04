import * as Sentry from '@sentry/react';

/**
 * Bhagyoday Cloud ERP - Unified Error Handler
 * Centralizes error logging to Sentry and provides consistent reporting.
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
  console.log('Sentry Initialized for CRM Monitoring');
}

export const logError = (error: Error, data?: any) => {
  console.error('Captured Error:', error.message, data);
  
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (data) scope.setExtras(data);
      Sentry.captureException(error);
    });
  }
};

export const reportFeedback = (userMessage: string) => {
  // Option to trigger Sentry User Feedback UI
  if (SENTRY_DSN) {
    const eventId = Sentry.captureMessage('User Feedback Reported');
    Sentry.showReportDialog({ eventId, subtitle: userMessage });
  }
};
