import { collection, doc, getDocs, setDoc, writeBatch, query, where, addDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { InventoryItem, Product, DispatchLog, Quotation } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error Detailed: ', serialized);
  throw new Error(serialized);
}

export const getMaterialKey = (make: string = '', colour: string = '', thickness: string = '', gsm: string = '', category: string = 'GENERAL', productName: string = '') => {
  const sanitize = (s: string) => String(s || '').trim().toUpperCase().replace(/[\/\\]/g, '-');
  const cat = sanitize(category);
  const name = sanitize(productName);
  
  if (name) {
    // Identity within a category is name + make + color
    // This allows differentiation between "JSW - Red" and "JSW - Blue" but matches correctly if name is "COIL"
    return `${cat}_${name}_${sanitize(make)}_${sanitize(colour)}_${sanitize(thickness)}_${sanitize(gsm)}`.replace(/__+/g, '_');
  }
  return `${cat}_${sanitize(make)}_${sanitize(colour)}_${sanitize(thickness)}_${sanitize(gsm)}`.replace(/__+/g, '_');
};

export const syncMaterialsWithExcel = async (newItems: InventoryItem[]) => {
  try {
    const currentItemsSnap = await getDocs(collection(db, 'inventory'));
    const existingMap = new Map(currentItemsSnap.docs.map(d => [d.id, { ...d.data(), id: d.id } as InventoryItem]));
    const now = new Date().toISOString();
    
    const batch = writeBatch(db);
    let operationCount = 0;
    const commits = [];

    for (const newItem of newItems) {
      const id = getMaterialKey(newItem.make, newItem.colour, newItem.thickness, newItem.gsm, newItem.category, newItem.productName);
      const existing = existingMap.get(id);
      const docRef = doc(db, 'inventory', id);

      if (existing) {
        // SMART SYNC: Update stock but preserve custom settings
        // If Excel has 1000, and we used 200, remaining should be 800 (if Excel represents 'original' stock)
        // HOWEVER, usually Excel represents 'Current Balance'. 
        // We will update the 'stock' (original source) and recalculate 'remaining' based on 'used'
        const baseStock = newItem.stock || newItem.remaining || 0;
        const used = existing.used || 0;
        const newRemaining = Math.max(0, baseStock - used);
        
        const lowLimit = existing.lowStockLimit || newItem.lowStockLimit || 500;
        let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (newRemaining <= 0) status = 'OUT_OF_STOCK';
        else if (newRemaining <= lowLimit) status = 'LOW_STOCK';

        batch.update(docRef, {
          stock: baseStock,
          remaining: baseStock > 0 ? newRemaining : newItem.remaining, // Fallback if user means Excel is current balance
          status,
          updatedAt: now,
          sourceSheet: newItem.sourceSheet || existing.sourceSheet
        });
      } else {
        // CREATE NEW
        const baseStock = newItem.stock || newItem.remaining || 0;
        batch.set(docRef, {
          ...newItem,
          stock: baseStock,
          used: 0,
          dailyUsage: 0,
          estimatedDaysLeft: 999,
          updatedAt: now,
          createdAt: now
        });
      }

      operationCount++;
      if (operationCount === 450) {
        commits.push(batch.commit());
        operationCount = 0;
      }
    }

    if (operationCount > 0) commits.push(batch.commit());
    await Promise.all(commits);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'inventory_sync_batch');
  }
};

export const clearAllInventory = async () => {
  try {
    const currentItems = await getDocs(collection(db, 'inventory'));
    const batch = writeBatch(db);
    currentItems.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'inventory_clear');
  }
};

export const handleStockDeduction = async (quotation: Quotation, dispatchId: string) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const snapshot = await getDocs(collection(db, 'inventory'));
    const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
    
    let deductionPerformed = false;

    for (const qItem of quotation.items) {
      // SMART MATCHING: Intelligence to find the right material even if names vary slightly
      const matches = items.filter(inv => {
        const catMatch = (qItem.category || 'GENERAL').toUpperCase() === inv.category.toUpperCase();
        if (!catMatch) return false;

        // Identity check: Make + Color + Thickness must match for precision
        const makeMatch = (qItem.make || '').toUpperCase() === (inv.make || '').toUpperCase();
        const colourMatch = (qItem.colour || '').toUpperCase() === (inv.colour || '').toUpperCase();
        const thickMatch = (qItem.thickness || '').toUpperCase() === (inv.thickness || '').toUpperCase();
        
        // If all 3 match, it's almost certainly the same material regardless of description
        if (makeMatch && colourMatch && thickMatch) return true;

        // Fallback: Product Name string containment
        if (inv.productName.toUpperCase().includes((qItem.name || '').toUpperCase())) {
           if (colourMatch || (inv.productName.toUpperCase().includes((qItem.colour || '').toUpperCase()))) return true;
        }

        return false;
      });

      const invData = matches[0]; // Take the best match

      if (invData) {
        deductionPerformed = true;
        let deductionQty = qItem.qty;
        
        // Convert to RFT if needed (JSW/Sheets logic)
        if (invData.unit === 'RFT') {
          if (qItem.unit === 'RMT') {
            deductionQty = qItem.qty * 3.28084;
          } else if (qItem.unit === 'SQFT' || qItem.unit === 'SQM') {
             const wid = qItem.wid || 3.5;
             let lenFt = qItem.unit === 'SQFT' ? (qItem.qty / wid) : (qItem.qty * 10.7639 / (wid * 3.28084));
             deductionQty = lenFt;
          }
        }

        const newRemaining = Math.max(0, invData.remaining - deductionQty);
        const newUsed = (invData.used || 0) + deductionQty;
        
        let updatePayload: any = {
          remaining: newRemaining,
          used: newUsed,
          updatedAt: now
        };

        // Custom JSW/Open Coil Logic
        if (invData.dispatchFrom === 'openCoilStock' && invData.openCoilStock !== undefined) {
          updatePayload.openCoilStock = Math.max(0, (invData.openCoilStock || 0) - deductionQty);
        }

        // Status logic
        let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (newRemaining <= 0) status = 'OUT_OF_STOCK';
        else if (newRemaining <= (invData.lowStockLimit || 500)) status = 'LOW_STOCK';
        updatePayload.status = status;

        // Intelligence: Usage stats
        const startDate = new Date(invData.createdAt || invData.updatedAt);
        const daysSince = Math.max(1, (new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        const dailyUsage = newUsed / daysSince;
        const daysLeft = dailyUsage > 0 ? newRemaining / dailyUsage : 999;
        updatePayload.dailyUsage = dailyUsage;
        updatePayload.estimatedDaysLeft = daysLeft;

        const invRef = doc(db, 'inventory', invData.id!);
        batch.update(invRef, updatePayload);

        // Log dispatch
        const logRef = doc(collection(db, 'dispatch_logs'));
        batch.set(logRef, {
          quotationId: quotation.id,
          dispatchId,
          materialKey: invData.id,
          qtyDeducted: deductionQty,
          materialName: `${invData.productName} (${invData.make} ${invData.colour})`,
          createdAt: now
        });
      }
    }

    if (deductionPerformed) {
      // Bonus: Update Quotation metrics
      let totalProfit = 0;
      quotation.items.forEach(p => {
        const rateObj = (quotation as any).rates?.find((r: any) => r.name === p.name);
        const costPrice = p.costPrice || rateObj?.costPrice || 0;
        if (costPrice > 0) {
          const profitPerUnit = (p.convertedRate || p.rate || 0) - costPrice;
          totalProfit += profitPerUnit * (p.qty || 0);
        }
      });

      const grandTotal = parseFloat((quotation.grandTotal || 0).toString().replace(/,/g, ''));
      const isHotDeal = grandTotal >= 100000;

      batch.update(doc(db, 'quotations', quotation.id!), {
        totalProfit,
        isHotDeal,
        isDeducted: true,
        updatedAt: now
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stock_deduction');
  }
};

export const updateLowStockThreshold = async (materialKey: string, threshold: number, currentRemaining: number) => {
  try {
    const docRef = doc(db, 'inventory', materialKey);
    const status = currentRemaining <= 0 ? 'OUT_OF_STOCK' : currentRemaining <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
    await updateDoc(docRef, { 
      lowStockLimit: threshold,
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `inventory/${materialKey}`);
  }
};
