import React from 'react';
import { Calculator } from 'lucide-react';
import { Product } from '../../types';

interface QuotationSummaryProps {
  items: Partial<Product>[];
  loadV: string;
  setLoadV: (v: string) => void;
  loadAmt: number;
  setLoadAmt: (v: number) => void;
  freightV: string;
  setFreightV: (v: string) => void;
  freightAmt: number;
  setFreightAmt: (v: number) => void;
}

export const QuotationSummary: React.FC<QuotationSummaryProps> = ({
  items,
  loadV,
  setLoadV,
  loadAmt,
  setLoadAmt,
  freightV,
  setFreightV,
  freightAmt,
  setFreightAmt
}) => {
  const subTotal = items.reduce((s, p) => s + (p.total || 0), 0);
  const lAmt = loadV === 'custom' ? loadAmt : 0;
  const fAmt = freightV === 'custom' ? freightAmt : 0;
  const grossTotal = subTotal + lAmt + fAmt; 
  const gst = grossTotal * 0.18;
  const grandTotal = grossTotal + gst;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Calculator size={16} className="text-slate-400" />
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">Summary</h2>
      </div>

      <div className="bg-white rounded-2xl p-5 space-y-4 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Valuation</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Items Subtotal</span>
            <span className="text-slate-900">₹{subTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="space-y-3 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between group">
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading</label>
              <p className="text-[9px] text-slate-400 font-medium italic">Handling</p>
            </div>
            <div className="flex items-center gap-1">
              <select 
                className="h-8 text-[11px] font-black bg-slate-50 border-slate-200 rounded-lg px-2 focus:ring-2 focus:ring-blue-100 transition-all" 
                value={loadV} 
                onChange={e => setLoadV(e.target.value)}
              >
                <option value="FREE">FREE</option>
                <option value="EXTRA">EXTRA</option>
                <option value="custom">AMT</option>
              </select>
              {loadV === 'custom' && (
                <input 
                  type="number" 
                  className="h-8 w-24 text-[11px] font-black border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-100 shadow-sm" 
                  placeholder="0.00"
                  value={loadAmt || ''} 
                  onChange={e => setLoadAmt(parseFloat(e.target.value) || 0)} 
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between group">
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Freight</label>
              <p className="text-[9px] text-slate-400 font-medium italic">Transport</p>
            </div>
            <div className="flex items-center gap-1">
              <select 
                className="h-8 text-[11px] font-black bg-slate-50 border-slate-200 rounded-lg px-2 focus:ring-2 focus:ring-blue-100 transition-all" 
                value={freightV} 
                onChange={e => setFreightV(e.target.value)}
              >
                <option value="EXTRA">EXTRA</option>
                <option value="FREE">FREE</option>
                <option value="custom">AMT</option>
              </select>
              {freightV === 'custom' && (
                <input 
                  type="number" 
                  className="h-8 w-24 text-[11px] font-black border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-100 shadow-sm" 
                  placeholder="0.00"
                  value={freightAmt || ''} 
                  onChange={e => setFreightAmt(parseFloat(e.target.value) || 0)} 
                />
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-dashed border-slate-100">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">
            <span>Taxation (GST 18%)</span>
            <span className="text-slate-600">₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex justify-between items-center p-3.5 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Payable Total</p>
              <p className="text-xl font-black text-white leading-none tracking-tight">₹ {grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-blue-500/20">
              Sync Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
