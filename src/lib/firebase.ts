/**
 * Firebase Client SDK Initialization
 * Handles primary connection to Firestore and Auth services.
 * Note: db uses the custom firestoreDatabaseId from the configuration.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import appleConfig from '@/firebase-applet-config.json';

// Use environment variables if present, fallback to config file
const firebaseConfig = {  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appleConfig.authDomain,
  projectId: import.meta.env.V_FIREBASE_PROJECT_ID || appleConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appleConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appleConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appleConfig.appId,
};

// Initialize core Firebase service
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore
// We use the database ID from env/config if defined, otherwise default to '(default)'
export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || appleConfig.firestoreDatabaseId || '(default)');

/**
 * Validates connection to the Firestore backend.
 * Typically called on app boot to early-detect configuration issues.
 */
export async function verifyFirestoreConnection() {
  try {
    // Attempting a server-side fetch on a dummy document to verify connectivity
    await getDocFromServer(doc(db, '_connection_check_', 'is_online'));
  } catch (error: any) {
    if (error.message?.includes('client is offline')) {
      console.error("🔥 Firebase Connectivity Alert: The client is unable to reach the server.");
    }
  }
}

export default app;
