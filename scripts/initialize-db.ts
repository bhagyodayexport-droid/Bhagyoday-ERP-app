import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs-extra';
import path from 'path';

/**
 * Initialize Bhagyoday ERP Database
 * Sets up global settings if missing.
 */

async function initializeDb() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('firebase-applet-config.json not found');
    process.exit(1);
  }
  const config = fs.readJsonSync(configPath);
  
  if (getApps().length === 0) {
    initializeApp({
      projectId: config.projectId
    });
  }

  const db = getFirestore(config.firestoreDatabaseId || '(default)');
  const settingsRef = db.collection('settings').doc('global');
  const snap = await settingsRef.get();

  if (!snap.exists) {
    console.log('Initializing global settings...');
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
    console.log('Global settings initialized with default values.');
  } else {
    console.log('Global settings already exist.');
  }

  // Also pre-create a few inventory items if empty
  const inventoryRef = db.collection('inventory');
  const invSnap = await inventoryRef.limit(1).get();
  if (invSnap.empty) {
    console.log('Seeding initial inventory items...');
    const items = [
      { make: 'JSW', colour: 'Off White', thickness: '0.45', gsm: '120', originalStockRFT: 5000, remainingStockRFT: 5000, usedStockRFT: 0, lowStockThreshold: 500 },
      { make: 'AMNS', colour: 'Terra Cotta', thickness: '0.50', gsm: '150', originalStockRFT: 3000, remainingStockRFT: 3000, usedStockRFT: 0, lowStockThreshold: 300 },
      { make: 'TATA', colour: 'Sky Blue', thickness: '0.47', gsm: '120', originalStockRFT: 4000, remainingStockRFT: 4000, usedStockRFT: 0, lowStockThreshold: 400 }
    ];
    for (const item of items) {
      await inventoryRef.add({
        ...item,
        lastUpdated: new Date().toISOString()
      });
    }
    console.log('Initial inventory seeded.');
  }

  process.exit(0);
}

initializeDb().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
