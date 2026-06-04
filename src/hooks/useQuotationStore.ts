import { useReducer, useEffect, useState } from 'react';
import { DbService } from '../database/dbService';
import { GlobalSettings, InventoryItem, Quotation, Client } from '../types';
import { quotationReducer } from '../lib/quotationReducer';

export function useQuotationStore(uid: string) {
  const [items, dispatch] = useReducer(quotationReducer, [{}]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Initial Data & Settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, c, inv] = await Promise.all([
          DbService.getGlobalSettings(),
          DbService.getClients(),
          DbService.getInventory()
        ]);

        if (s) {
          setSettings(s);
          if (items.length === 1 && !items[0].name) {
            const defLen = s.dimensionUnitMaster?.find(u => u.isDefaultLen)?.unit || 'RFT';
            const defWid = s.dimensionUnitMaster?.find(u => u.isDefaultWid)?.unit || 'RFT';
            dispatch({ 
              type: 'SET_ITEMS', 
              items: [{ lenUnit: defLen, widUnit: defWid }] 
            });
          }
        }
        
        setClients(c);
        setInventory(inv);
      } catch (error) {
        console.error("Error fetching quotation data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveQuotation = async (quotation: Quotation) => {
    return await DbService.createQuotation(quotation);
  };

  return {
    items,
    dispatch,
    settings,
    inventory,
    clients,
    loading,
    saveQuotation
  };
}
