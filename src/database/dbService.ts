import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  addDoc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { GlobalSettings, InventoryItem, Quotation, Client } from '../types';

/**
 * Database Service Layer
 * Centralizes all Firestore interactions to maintain separation of concerns.
 */
export const DbService = {
  // Settings
  async getGlobalSettings(): Promise<GlobalSettings | null> {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    return snap.exists() ? snap.data() as GlobalSettings : null;
  },

  async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<void> {
    await updateDoc(doc(db, 'settings', 'global'), updates);
  },

  // Quotations
  async getQuotations(): Promise<Quotation[]> {
    const q = query(
      collection(db, 'quotations'), 
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Quotation));
  },

  async createQuotation(quotation: Quotation): Promise<string> {
    const docRef = await addDoc(collection(db, 'quotations'), {
      ...quotation,
      deletedAt: null,
      deletedBy: null
    });
    
    // Auto-update counter and client info
    await Promise.all([
      this.incrementEstCounter(),
      this.syncClientFromQuotation(quotation)
    ]);
    
    return docRef.id;
  },

  async softDeleteQuotation(id: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'quotations', id), {
      deletedAt: serverTimestamp(),
      deletedBy: userId
    });
  },

  async incrementEstCounter(): Promise<void> {
    await updateDoc(doc(db, 'settings', 'global'), { estCounter: increment(1) });
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const q = query(collection(db, 'inventory'), where('deletedAt', '==', null));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const q = query(
      collection(db, 'clients'), 
      where('deletedAt', '==', null),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Client));
  },

  // Recovery Engine
  async restoreDocument(collectionName: string, id: string): Promise<void> {
    await updateDoc(doc(db, collectionName, id), {
      deletedAt: null,
      deletedBy: null
    });
  },

  async syncClientFromQuotation(quotation: Quotation): Promise<void> {
    const q = query(collection(db, 'clients'), where('name', '==', quotation.custName));
    const snap = await getDocs(q);
    
    const clientData = {
      name: quotation.custName,
      number: quotation.waNo,
      lastDate: quotation.date,
      updatedAt: serverTimestamp(),
    };

    if (snap.empty) {
      await addDoc(collection(db, 'clients'), clientData);
    } else {
      await updateDoc(doc(db, 'clients', snap.docs[0].id), clientData);
    }
  }
};
