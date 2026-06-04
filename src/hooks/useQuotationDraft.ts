import { useState, useEffect } from 'react';
import { Product } from '../types';

interface DraftData {
  custName: string;
  waNo: string;
  qDate: string;
  notes: string;
  items: Partial<Product>[];
  loadV: string;
  freightV: string;
  loadAmt: number;
  freightAmt: number;
}

export function useQuotationDraft() {
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('draft_quotation');
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
    setLoading(false);
  }, []);

  const saveDraft = (data: DraftData) => {
    localStorage.setItem('draft_quotation', JSON.stringify(data));
  };

  const clearDraft = () => {
    localStorage.removeItem('draft_quotation');
  };

  return { draft, saveDraft, clearDraft, loading };
}
