import React from 'react';
import { FileText, CheckCircle2, RefreshCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GlobalSettings, Product } from '../../types';

interface QuotationHeaderProps {
  custName: string;
  setCustName: (v: string) => void;
  waNo: string;
  setWaNo: (v: string) => void;
  qDate: string;
  setQDate: (v: string) => void;
  settings: GlobalSettings | null;
  errors: any;
  setErrors: any;
  showClientSug: boolean;
  setShowClientSug: (v: boolean) => void;
  clients: {name: string, number: string}[];
  items: Partial<Product>[];
  loadV: string;
  loadAmt: number;
  freightV: string;
  freightAmt: number;
  loading: boolean;
  isSuccess: boolean;
  handleGenerate: () => void;
  setShowResetConfirm: (v: boolean) => void;
  errorRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
}

export const QuotationHeader: React.FC<QuotationHeaderProps> = ({
  custName, setCustName, waNo, setWaNo, qDate, setQDate,
  settings, errors, setErrors, showClientSug, setShowClientSug,
  clients, items, loadV, loadAmt, freightV, freightAmt,
  loading, isSuccess, handleGenerate, setShowResetConfirm, errorRefs
}) => {
  const totalWithTax = (items.reduce((s, p) => s + (p.total || 0), 0) + (loadV === 'custom' ? loadAmt : 0) + (freightV === 'custom' ? freightAmt : 0)) * 1.18;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 border-r border-slate-200 pr-4 mr-1 shrink-0">
          <div className="text-blue-600 bg-blue-50 p-1.5 rounded-lg">
            <FileText size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1 tracking-widest">Office Draft</p>
            <p className="text-xs font-black text-slate-900 leading-none tracking-tight">#{settings?.estCounter?.toString().padStart(4, '0') || '....'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group" ref={el => { errorRefs.current['custName'] = el; }}>
            <input 
              className={cn(
                "w-48 sm:w-64 bg-slate-50 border h-8 text-xs font-semibold px-3 rounded-md transition-all",
                errors.custName ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-50" : "border-transparent focus:bg-white focus:border-blue-200"
              )}
              placeholder="Client Name *"
              value={custName}
              onChange={e => {
                setCustName(e.target.value);
                if (errors.custName) setErrors((prev: any) => ({ ...prev, custName: undefined }));
                setShowClientSug(true);
              }}
              onFocus={() => setShowClientSug(true)}
            />
            {showClientSug && custName.length > 1 && (
              <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto w-[300px]">
                {clients
                  .filter(c => c.name.toLowerCase().includes(custName.toLowerCase()))
                  .map((c, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                      onClick={() => {
                        setCustName(c.name);
                        setWaNo(c.number);
                        setShowClientSug(false);
                      }}
                    >
                      <div className="font-bold text-xs text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{c.number}</div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
          <div className="relative" ref={el => { errorRefs.current['waNo'] = el; }}>
            <input 
              className={cn(
                "hidden lg:block bg-slate-50 border h-8 text-xs font-medium px-3 rounded-md w-32 transition-all",
                errors.waNo ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-50" : "border-transparent"
              )}
              placeholder="Mobile No"
              value={waNo}
              onChange={e => {
                setWaNo(e.target.value.replace(/\D/g, '').slice(0, 10));
              }}
            />
          </div>
          <input 
            type="date"
            className="hidden md:block bg-slate-50 border border-transparent h-8 text-[11px] font-medium px-2 rounded-md w-32 text-slate-600"
            value={qDate}
            onChange={e => setQDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden xl:flex flex-col items-end mr-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Total (Incl GST)</p>
          <p className="text-sm font-bold text-slate-900">₹{totalWithTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="hidden sm:flex h-8 px-4 rounded-md text-[10px] uppercase font-black tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all items-center gap-2"
        >
          Reset / New
        </button>
        <button 
          onClick={handleGenerate}
          disabled={loading}
          className={cn(
            "h-8 px-4 rounded-md text-xs font-black transition-all flex items-center gap-2 shadow-sm active:scale-95 border-2",
            isSuccess ? "bg-green-600 border-green-600 text-white hover:bg-green-700" : "bg-black text-white hover:bg-slate-800"
          )}
        >
          {isSuccess ? <CheckCircle2 size={14} /> : loading ? <RefreshCcw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
          {isSuccess ? "Success!" : loading ? "Syncing..." : "Send & Sync"}
        </button>
      </div>
    </header>
  );
};
