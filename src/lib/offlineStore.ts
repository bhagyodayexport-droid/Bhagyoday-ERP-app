import { openDB, IDBPDatabase } from 'idb';
import { Quotation } from '../types';

const DB_NAME = 'bhagyoday_erp_offline';
const STORE_NAME = 'quotation_drafts';

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export const saveDraftQuotation = async (draft: Partial<Quotation>) => {
  const db = await getDB();
  return db.add(STORE_NAME, {
    ...draft,
    createdAt: new Date().toISOString(),
    isDraft: true
  });
};

export const getDraftQuotations = async () => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const deleteDraftQuotation = async (id: number) => {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
};
