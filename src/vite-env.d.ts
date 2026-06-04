/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_WHATSAPP_API_KEY: string;
  readonly VITE_USE_SERVER_PDF: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
