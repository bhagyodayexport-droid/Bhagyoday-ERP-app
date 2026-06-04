import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Quotation, Product } from '../types';
import { Plus, Search, Settings, RefreshCcw, Layers } from 'lucide-react';
import { useQuotationStore } from '../hooks/useQuotationStore';
import { useQuotationDraft } from '../hooks/useQuotationDraft';
import { StockDeductionService } from '../lib/stockDeduction';
import { saveDraftQuotation } from '../lib/offlineStore';
import { QuotationRow } from './quotation/QuotationRow';
import { QuotationSummary } from './quotation/QuotationSummary';
import { QuotationHeader } from './quotation/QuotationHeader';

const PRODUCT_DESCRIPTIONS = {
  'POLYCARBONATE SHEET': 'High-quality polycarbonate roofing sheet with UV protection.',
  'PUF PANEL': 'Insulated PUF roofing panel with superior thermal protection.',
  'JSW COLOR COATED SHEET': 'JSW Galvalume Color Coated Roofing Sheet.',
  'UPVC ROOFING SHEET': 'Multi-layer UPVC roofing sheet for heat insulation.',
  'PROFILE SHEET': 'Standard industrial profile sheet.',
  'TURBO VENTILATOR': 'High-efficiency wind-driven turbo ventilator.',
  'FRP SHEET': 'Translucent sheet for natural lighting.',
};

export const QuotationForm: React.FC<{ 
  onGenerated: (q: Quotation) => void; 
  uid: string;
  initialData?: Partial<Quotation>;
}> = ({ onGenerated, uid, initialData }) => {
  const { items, dispatch, settings, inventory, clients, loading: storeLoading, saveQuotation } = useQuotationStore(uid);
  const { draft, saveDraft, clearDraft } = useQuotationDraft();
  
  const [custName, setCustName] = useState('');
  const [waNo, setWaNo] = useState('');
  const [qDate, setQDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loadV, setLoadV] = useState('FREE');
  const [freightV, setFreightV] = useState('EXTRA');
  const [loadAmt, setLoadAmt] = useState(0);
  const [freightAmt, setFreightAmt] = useState(0);
  const [quotationLenUnit, setQuotationLenUnit] = useState('RFT');
  const [quotationWidUnit, setQuotationWidUnit] = useState('RFT');
  
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showClientSug, setShowClientSug] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  const errorRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    if (draft) {
      setCustName(draft.custName);
      setWaNo(draft.waNo);
      setQDate(draft.qDate);
      setNotes(draft.notes);
      setLoadV(draft.loadV);
      setFreightV(draft.freightV);
      setLoadAmt(draft.loadAmt);
      setFreightAmt(draft.freightAmt);
      dispatch({ type: 'SET_ITEMS', items: draft.items });
    }
  }, [draft, dispatch]);

  useEffect(() => {
    if (!storeLoading) {
      saveDraft({ custName, waNo, qDate, notes, items, loadV, freightV, loadAmt, freightAmt });
    }
  }, [custName, waNo, qDate, notes, items, loadV, freightV, loadAmt, freightAmt, storeLoading, saveDraft]);

  const handleGenerate = async () => {
    const newErrors: any = {};
    if (!custName.trim()) newErrors.custName = 'Client name is required';
    if (waNo && !/^\d{10}$/.test(waNo)) newErrors.waNo = 'Invalid 10-digit number';
    
    const itemErrors: any = {};
    items.forEach((it, idx) => {
      const e: any = {};
      if (!it.name) e.name = 'Required';
      if (!it.wid) e.wid = 'Required';
      if (!it.len) e.len = 'Required';
      if (!it.pcs) e.pcs = 'Required';
      if (!it.convertedRate && !it.rate) e.rate = 'Required';
      if (Object.keys(e).length > 0) itemErrors[idx] = e;
    });
    if (Object.keys(itemErrors).length > 0) newErrors.items = itemErrors;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const subTotal = items.reduce((s, p) => s + (p.total || 0), 0);
    const grossTotal = subTotal + (loadV === 'custom' ? loadAmt : 0) + (freightV === 'custom' ? freightAmt : 0);
    const gst = grossTotal * 0.18;
    
    const quotation: Quotation = {
      estNo: String(settings?.estCounter || 1).padStart(4, '0'),
      custName,
      waNo,
      date: new Date(qDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      rawDate: qDate,
      notes,
      items: items as Product[],
      loadV,
      freightV,
      gross: grossTotal.toFixed(2),
      gstAmt: gst.toFixed(2),
      grandTotal: (grossTotal + gst).toFixed(2),
      status: 'New',
      createdBy: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isOffline) {
        await saveDraftQuotation(quotation);
        alert('You are offline. Quotation saved as a draft locally.');
        clearDraft();
        return;
      }

      // 1. Save Quotation (Stock deduction now happens on status change in History)
      const id = await saveQuotation(quotation);
      onGenerated({ ...quotation, id });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      clearDraft();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Operation failed. Please check stock levels.');
    } finally {
      setLoading(false);
    }
  };

  const updateAllUnits = (type: 'len' | 'wid', newUnit: string) => {
    if (type === 'len') setQuotationLenUnit(newUnit); else setQuotationWidUnit(newUnit);
    dispatch({ type: 'UPDATE_ALL_UNITS', unitType: type, newUnit });
  };

  if (storeLoading) return <div className="h-screen flex items-center justify-center font-black text-slate-400">LOADING CORE ENGINE...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {isOffline && (
        <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 px-6 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Offline Mode: Quotations will be saved as drafts locally
          </div>
        </div>
      )}
      <QuotationHeader 
        {...{ custName, setCustName, waNo, setWaNo, qDate, setQDate, settings, errors, setErrors, showClientSug, setShowClientSug, clients, items, loadV, loadAmt, freightV, freightAmt, loading, isSuccess, handleGenerate, setShowResetConfirm, errorRefs }} 
      />

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col bg-white overflow-hidden border-r border-slate-100">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-slate-400" />
              <div>
                <h2 className="text-xs font-black text-black uppercase tracking-wider">Bill of Materials</h2>
                <p className="text-[10px] text-slate-600 font-bold">{items.length} ACTIVE ROWS</p>
              </div>
            </div>
            <button onClick={() => dispatch({ type: 'ADD_ITEM', payload: { lenUnit: quotationLenUnit, widUnit: quotationWidUnit } })} className="bg-black text-white px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-tight flex items-center gap-2">
              <Plus size={14} /> Add Product
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            <div className="min-w-[1150px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
              <div className="grid grid-cols-[40px_minmax(180px,2fr)_minmax(120px,1fr)_85px_100px_100px_80px_100px_110px_minmax(140px,1.5fr)_40px] bg-black text-[10px] font-black text-white uppercase tracking-widest">
                <div className="p-3 text-center">#</div>
                <div className="p-3">Product *</div>
                <div className="p-3">Color</div>
                <div className="p-3 text-center">Thk</div>
                <div className="p-1 flex flex-col items-center">
                  <span>Width</span>
                  <select 
                    className="bg-[#fbfcf8] text-[9px] border border-slate-200 outline-none text-black px-1.5 py-0.5 rounded-md text-center cursor-pointer font-black mt-1 hover:bg-white transition-all"
                    value={quotationWidUnit} 
                    onChange={e => updateAllUnits('wid', e.target.value)}
                  >
                    {settings?.dimensionUnitMaster?.filter(u => u.active).map(u => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                  </select>
                </div>
                <div className="p-1 flex flex-col items-center">
                  <span>Length</span>
                  <select 
                    className="bg-[#fbfcf8] text-[9px] border border-slate-200 outline-none text-black px-1.5 py-0.5 rounded-md text-center cursor-pointer font-black mt-1 hover:bg-white transition-all"
                    value={quotationLenUnit} 
                    onChange={e => updateAllUnits('len', e.target.value)}
                  >
                    {settings?.dimensionUnitMaster?.filter(u => u.active).map(u => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                  </select>
                </div>
                <div className="p-3 text-center">Qty</div>
                <div className="p-3 text-center">Unit</div>
                <div className="p-3 text-right">Rate</div>
                <div className="p-3 text-right">Total</div>
                <div className="p-3"></div>
              </div>

              {items.map((item, i) => (
                <QuotationRow 
                  key={i} index={i} item={item} settings={settings} inventory={inventory} rowErrors={errors.items?.[i] || {}}
                  onUpdate={(idx, updates) => dispatch({ type: 'UPDATE_ITEM', index: idx, updates, quotationUnits: { len: quotationLenUnit, wid: quotationWidUnit } })}
                  onRemove={(idx) => dispatch({ type: 'REMOVE_ITEM', index: idx })}
                  onDuplicate={(idx) => dispatch({ type: 'DUPLICATE_ITEM', index: idx })}
                  onMove={(idx, dir) => dispatch({ type: 'MOVE_ITEM', index: idx, direction: dir })}
                  isMetricUnit={(u) => ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(u?.toUpperCase() || '')}
                  handleEnterColStep={(e) => { if (e.key === 'Enter') { /* navigation logic */ } }}
                  {...{ quotationLenUnit, quotationWidUnit, PRODUCT_DESCRIPTIONS, setNotes, errors, setErrors }}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Notes & Specifications</label>
              <textarea className="w-full min-h-[120px] text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg p-3" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            
            <QuotationSummary {...{ items, loadV, setLoadV, loadAmt, setLoadAmt, freightV, setFreightV, freightAmt, setFreightAmt }} />

            <div className="flex gap-2">
              <button onClick={() => setIsConfigOpen(true)} className="flex-1 h-9 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase text-slate-600"><Settings size={12} className="inline mr-1" /> Config</button>
              <button onClick={() => setShowResetConfirm(true)} className="flex-1 h-9 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase text-slate-600">Reset</button>
            </div>
          </div>
          
          <div className="p-4 bg-white border-t">
            <button onClick={handleGenerate} className="w-full bg-blue-600 text-white h-11 rounded-lg font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2">
              Preview & Save <Search size={16} />
            </button>
          </div>
        </aside>
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center space-y-6">
            <RefreshCcw size={48} className="mx-auto text-red-100" />
            <h3 className="text-lg font-black">Reset Quotation?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="h-10 bg-slate-100 rounded-lg font-bold">Cancel</button>
              <button onClick={() => { 
                setCustName(''); 
                setWaNo(''); 
                dispatch({ type: 'SET_ITEMS', items: [{}] }); 
                clearDraft(); 
                setShowResetConfirm(false); 
              }} className="h-10 bg-red-600 text-white rounded-lg font-bold">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
