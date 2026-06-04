import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';

/**
 * Bhagyoday Cloud ERP - Scheduled Firestore Backup Script
 * Performs full database export to GCS and enforces a 30-day retention policy.
 */

const bucketName = process.env.GCS_BACKUP_BUCKET || 'bhagyoday-erp-backups';

async function runBackup() {
  const date = new Date();
  const folderName = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const outputUriPrefix = `gs://${bucketName}/${folderName}`;

  console.log(`[${date.toISOString()}] Starting Firestore backup to ${outputUriPrefix}...`);

  try {
    // Initialize Admin SDK if not already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }

    const client = new admin.firestore.v1.FirestoreAdminClient();

    // Trigger Export
    const [operation] = await client.exportDocuments({
      name: client.databasePath(process.env.FIREBASE_PROJECT_ID || '', '(default)'),
      outputUriPrefix: outputUriPrefix,
      collectionIds: [] // Empty means all collections
    });

    console.log(`[${new Date().toISOString()}] Export operation started: ${operation.name}`);
    
    // Wait for completion (optional for cron, but good for verification)
    // await operation.promise();

    console.log(`[${new Date().toISOString()}] Backup request submitted successfully.`);

    // --- Retention Policy: 30 Days ---
    await enforceRetentionPolicy();

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Backup FAILED:`, error);
    process.exit(1);
  }
}

async function enforceRetentionPolicy() {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles({ delimiter: '/' });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`[${new Date().toISOString()}] Enforcing 30-day retention policy...`);

  // Note: Firestore exports are folders. In GCS, these are prefixes.
  // We check the "folders" (prefixes) returned in the response metadata.
  // This script assumes folders are named YYYY-MM-DD.
  
  // For simplicity in this environment, we'll list prefixes explicitly
  const [prefixes] = await bucket.getFiles({ autoPaginate: false });
  // Actually bucket.getFiles with delimiter is the way to get "folders"
  // But getFiles returns files. The prefixes are in the second element of the response.
  
  const [_, __, response] = await bucket.getFiles({ delimiter: '/' }) as any;
  const currentFolders = response.prefixes || [];

  for (const prefix of currentFolders) {
    const folderDateStr = prefix.replace('/', '');
    const folderDate = new Date(folderDateStr);

    if (!isNaN(folderDate.getTime()) && folderDate < thirtyDaysAgo) {
      console.log(`Deleting expired backup: ${prefix}`);
      await bucket.deleteFiles({ prefix: prefix });
    }
  }
}

runBackup();
