import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Bhagyoday Cloud ERP - User Role Management Tool
 * Use this to set custom claims (roles) for users.
 * 
 * Usage: 
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS 
 * 2. Run: npx tsx scripts/set-user-role.ts <email> <role>
 */

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log('Usage: npx tsx scripts/set-user-role.ts <email> <admin|employee|developer|guest>');
  process.exit(1);
}

async function setRole() {
  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }

    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    
    console.log(`Successfully set role "${role}" for user: ${email} (${user.uid})`);
    console.log('User must re-login or refresh their token for changes to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting role:', error);
    process.exit(1);
  }
}

setRole();
