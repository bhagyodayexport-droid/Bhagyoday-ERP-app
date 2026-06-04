import { db } from './firebase';
import { 
  runTransaction, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Product, InventoryItem } from '../types';

/**
 * Bhagyoday Cloud ERP - Stock Deduction Service
 * Handles atomic inventory updates and validation during quotation generation.
 */

export const StockDeductionService = {
  /**
   * Deducts quantity from inventory for each item in the quotation.
   * Throws if stock is insufficient.
   */
  async validateAndDeductStock(items: Product[]): Promise<void> {
    await runTransaction(db, async (transaction) => {
      for (const item of items) {
        // 1. Locate the inventory item by name/category
        const invQuery = query(
          collection(db, 'inventory'), 
          where('name', '==', item.name)
        );
        const invSnap = await getDocs(invQuery);

        if (invSnap.empty) {
          console.warn(`Inventory item not found: ${item.name}. Skipping deduction.`);
          continue;
        }

        const invDoc = invSnap.docs[0];
        const invData = invDoc.data() as InventoryItem;
        const remaining = invData.remaining || 0;
        const requestedQty = item.qty || 0;

        // 2. Check sufficiency
        if (remaining < requestedQty) {
          throw new Error(
            `Insufficient Stock for "${item.name}". Required: ${requestedQty}, Available: ${remaining}`
          );
        }

        // 3. Update stock in transaction
        transaction.update(invDoc.ref, {
          remaining: remaining - requestedQty,
          lastDeductionAt: new Date().toISOString(),
          lastDeductionAmt: requestedQty
        });
      }
    });
  }
};
