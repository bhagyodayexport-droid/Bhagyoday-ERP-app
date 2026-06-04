import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import logger from './logger';
import fs from 'fs-extra';
import path from 'path';

/**
 * Firebase Admin Utility
 * ---------------------
 * Handles server-side access to Firestore and Auth.
 * Uses a lazy-loading pattern to ensure we don't crash if environment keys
 * are not yet provisioned.
 */

let isInitialized = false;
let cachedDatabaseId: string | undefined = undefined;

/**
 * Bootstraps the Admin SDK.
 * Will attempt to resolve Project ID from Environment or local config file.
 */
export function initAdmin() {
  if (isInitialized) return admin;

  try {
    const envProjectId = process.env.FIREBASE_PROJECT_ID;
    const envDatabaseId = process.env.FIREBASE_DATABASE_ID;
    
    // Resolve project ID (Env > Local Config)
    let finalProjectId = envProjectId;
    let finalDatabaseId = envDatabaseId;

    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = fs.readJsonSync(configPath);
      if (!finalProjectId) finalProjectId = config.projectId || config.project_id;
      if (!finalDatabaseId) finalDatabaseId = config.firestoreDatabaseId;
    }
    
    cachedDatabaseId = finalDatabaseId;

    if (!finalProjectId) {
      logger.warn('⚠️ FIREBASE_PROJECT_ID missing. Background services like token verification are currently offline.');
      return null;
    }

    if (admin.apps.length === 0) {
      try {
        const options: admin.AppOptions = { projectId: finalProjectId };
        
        // Attempt Service Account initialization if secrets are present
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          options.credential = admin.credential.cert({
            projectId: finalProjectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          });
        } else {
          // Fallback to Application Default Credentials for Cloud Run
          try {
            options.credential = admin.credential.applicationDefault();
          } catch (e) {
            logger.warn('⚠️ No credentials detected. Skipping Firebase Admin initialization.');
            isInitialized = false;
            return null;
          }
        }

        admin.initializeApp(options);
        logger.info({ projectId: finalProjectId }, '✅ Firebase Admin context established');
      } catch (err: any) {
        logger.info({ err: err.message }, 'ℹ️ Admin SDK skipped: Running in limited mode');
        return null;
      }
    }
    
    isInitialized = true;
    
    // Auto-seed if running in production or development to ensure stability
    ensureDefaultSettings(finalProjectId, finalDatabaseId);
    
    return admin;
  } catch (error: any) {
    logger.info({ err: error.message }, 'ℹ️ Unable to load Firebase Admin logic');
    return null;
  }
}

/**
 * Ensures basic collection structure exists.
 * Non-blocking to prevent server delay.
 */
async function ensureDefaultSettings(projectId: string, databaseId?: string) {
  try {
    const db = getFirestore(databaseId || '(default)');
    const settingsRef = db.collection('settings').doc('global');
    const snap = await settingsRef.get();

    if (!snap.exists) {
      logger.info('Initializing default ERP settings...');
      await settingsRef.set({
        company: {
          name: "Bhagyoday Industries",
          gst: "Not Provided",
          phone: "Not Provided",
          addr1: "Not Provided",
          logo: ""
        },
        pdfCfg: {
          title: "QUOTATION / ESTIMATE",
          color: "#0f172a",
          footer: "Computer Generated Invoice. No Signature Required.",
          bank: "Bank Name: HDFC BANK\nA/C: 50200021345678\nIFSC: HDFC0001234",
          terms: "1. 50% Advance with Order.\n2. Balance against delivery.\n3. Goods once sold will not be taken back."
        },
        estCounter: 1001,
        empPermissions: {
          canAccessHistory: true,
          canAccessClients: true,
          canAccessSales: false,
          canAccessSettings: false,
          canAccessInventory: false
        },
        updatedAt: new Date().toISOString()
      });
    }
  } catch (e) {
    // Fail silently in case of early startup permission lags
  }
}

/**
 * Access Firestore with administrative privileges
 */
export function getAdminDb() {
  const firebaseAdmin = initAdmin();
  return firebaseAdmin ? getFirestore(cachedDatabaseId || '(default)') : null;
}

/**
 * Access Auth with administrative privileges
 */
export function getAdminAuth() {
  const firebaseAdmin = initAdmin();
  return firebaseAdmin ? firebaseAdmin.auth() : null;
}
