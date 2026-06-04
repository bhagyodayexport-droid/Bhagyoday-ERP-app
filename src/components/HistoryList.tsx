import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { Quotation, StatusHistory } from '../types';
import { Search, Calendar, FileText, Trash2, Send, Clock, CheckCircle2, ChevronRight, Eye, MessageSquare, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { handleStockDeduction } from '../lib/stockService';
import { sendWhatsAppPdf } from '../lib/whatsapp';

interface HistoryListProps {
  onView: (quotation: Quotation) => void;
  onEdit: (quotation: Quotation) => void;
}

const QuotationCard = React.memo(({ 
  q, 
  profile, 
  sendingId, 
  onView, 
  onEdit, 
  onDelete, 
  onUpdateStatus, 
  onUpdateReason, 
  onQuickWhatsAppSend 
}: { 
  q: Quotation; 
  profile: any; 
  sendingId: string | null;
  onView: (q: Quotation) => void;
  onEdit: (q: Quotation) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Quotation['status'], q: Quotation) => void;
  onUpdateReason: (id: string, reason: string) => void;
  onQuickWhatsAppSend: (q: Quotation) => void;
}) => (
  <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
    <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
      <div className="flex gap-5 flex-1 min-w-0">
         <div className={cn(
           "w-16 h-16 rounded-[1.25rem] flex items-center justify-center border-2 transition-all shrink-0",
           q.status === 'Material Dispatched' ? "bg-green-50 border-green-100 text-green-600 shadow-lg shadow-green-100/50" :
           q.status === 'Deal Loss' ? "bg-red-50 border-red-100 text-red-600 shadow-lg shadow-red-100/50" :
           "bg-slate-50 border-slate-100 text-slate-400"
         )}>
           <FileText size={28} strokeWidth={2.5} />
         </div>
         <div className="min-w-0 flex-1">
           <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
             <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{q.custName}</h3>
             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md tracking-widest border border-blue-100 shrink-0">#{q.estNo}</span>
             {q.isHotDeal && <span className="text-[10px] font-black text-white bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-200">🔥 HOT DEAL</span>}
           </div>
           <div className="flex flex-wrap items-center gap-y-1 gap-x-5 mt-2">
             <p className="text-[11px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
               <Calendar size={14} className="text-slate-300" /> {q.date}
             </p>
             <p className="text-lg font-black text-slate-900 tracking-tight">₹{Number(q.grandTotal).toLocaleString('en-IN')}</p>
           </div>
         </div>
      </div>

      <div className="w-full sm:w-fit flex flex-col items-stretch sm:items-end gap-4 shrink-0">
         <select 
           value={q.status}
           onChange={(e) => onUpdateStatus(q.id!, e.target.value as any, q)}
           className={cn(
             "h-12 text-[11px] font-black uppercase tracking-widest px-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm focus:ring-4 text-center sm:text-left",
             q.status === 'Approved' || q.status === 'Material Dispatched' ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-100" :
             q.status === 'Rejected' || q.status === 'Deal Loss' ? "bg-red-50 text-red-700 border-red-200 focus:ring-red-100" :
             "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-100"
           )}
         >
           {['Sent', 'Order Booked', 'Production', 'Material Dispatched', 'Deal Loss', 'Awaiting Client', 'Negotiation', 'Approved', 'Rejected', 'Closed'].map(s => (
             <option key={s} value={s}>{s}</option>
           ))}
         </select>

         <div className="flex items-center gap-2 justify-center sm:justify-end">
            <button 
               onClick={() => onQuickWhatsAppSend(q)}
               disabled={sendingId === q.id}
               className={cn(
                 "flex-1 sm:flex-none h-12 w-12 flex items-center justify-center rounded-2xl transition-all",
                 sendingId === q.id ? "bg-blue-100 text-blue-600 animate-pulse" : "bg-green-50 text-green-600 hover:bg-green-100"
               )}
               title="Quick Send PDF via WhatsApp"
            >
               {sendingId === q.id ? <RefreshCcw size={18} className="animate-spin" /> : <MessageSquare size={22} />}
            </button>
            <button 
               onClick={() => onView(q)}
               className="flex-1 sm:flex-none h-12 w-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all"
               title="Preview & Share"
            >
               <Eye size={22} />
            </button>
            <button 
               onClick={() => onEdit(q)}
               className="flex-1 sm:flex-none h-12 w-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-2xl transition-all"
               title="Modify"
            >
               <FileText size={22} />
            </button>
            {profile?.role === 'admin' && (
              <button 
                 onClick={() => onDelete(q.id!)}
                 className="flex-1 sm:flex-none h-12 w-12 flex items-center justify-center bg-slate-50 text-slate-200 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                 title="Remove Profile"
              >
                 <Trash2 size={22} />
              </button>
            )}
         </div>
      </div>
    </div>
    
    <div className="flex flex-wrap gap-2 mt-6">
      {q.items.slice(0, 5).map((item, idx) => (
        <span key={idx} className="text-[9px] font-black text-slate-500 bg-slate-50/50 border border-slate-100 px-3 py-1 rounded-lg whitespace-nowrap uppercase tracking-widest">
          {item.name}
        </span>
      ))}
      {q.items.length > 5 && <span className="text-[9px] font-black text-slate-400 px-2 py-1 italic">+{q.items.length - 5} more</span>}
    </div>

    <div className="mt-6 pt-6 border-t border-slate-50">
      <textarea 
        className="w-full text-xs font-semibold bg-slate-50/30 border-none rounded-2xl p-4 min-h-[60px] italic text-slate-400 focus:bg-white focus:text-slate-600 focus:shadow-inner transition-all resize-none"
        placeholder="Business notes... (Why was deal lost? Was it price or payment?)"
        defaultValue={q.reason}
        onBlur={(e) => onUpdateReason(q.id!, e.target.value)}
      />
    </div>
  </div>
));

export const HistoryList: React.FC<HistoryListProps> = ({ onView, onEdit }) => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'ALL' | 'Order Booked' | 'Production' | 'Material Dispatched'>('ALL');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState('');

  const quickWhatsAppSend = async (quotation: Quotation) => {
    if (sendingId) return;
    setSendingId(quotation.id!);
    try {
      const res = await sendWhatsAppPdf(quotation);
      if (res.success) alert(`PDF Sent to ${quotation.custName} successfully!`);
      else alert(`Failed: ${res.message}`);
    } catch (e) {
      alert('Error sending PDF. Make sure backend is running and configured.');
    } finally {
      setSendingId(null);
    }
  };

  useEffect(() => {
    // Only load latest 100 to keep mobile snappy. ERPs with 1000s of quotes fail on mobile without limiting.
    const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ ...d.data(), id: d.id } as Quotation)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredHistory = React.useMemo(() => {
    return history.filter(h => 
      (h.custName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       h.estNo.includes(searchTerm)) &&
      (!dateFilter || h.rawDate === dateFilter) &&
      (activeStatus === 'ALL' || h.status === activeStatus) &&
      (!showHotOnly || h.isHotDeal || Number((h.grandTotal || 0).toString().replace(/,/g, '')) >= 100000)
    );
  }, [history, searchTerm, dateFilter, activeStatus, showHotOnly]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this quotation record?')) {
      await deleteDoc(doc(db, 'quotations', id));
    }
  };

  const updateStatus = async (id: string, status: Quotation['status'], quotation?: Quotation) => {
    const historyEntry: StatusHistory = {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.uid || 'unknown'
    };
    
    await updateDoc(doc(db, 'quotations', id), { 
      status,
      statusHistory: arrayUnion(historyEntry),
      updatedAt: new Date().toISOString()
    });

    // Special Logic for Material Dispatched
    if (status === 'Material Dispatched' && quotation) {
       if (quotation.isDeducted) {
          alert('Stock for this quotation has already been deducted.');
          return;
       }
       const confirmDeduction = confirm('Stock Deduction Event: Convert quotation items for real-time inventory deduction? This action is irreversible.');
       if (confirmDeduction) {
          const dispatchId = `DISPATCH-${id}-${Date.now()}`;
          await handleStockDeduction(quotation, dispatchId);
       }
    }
  };

  const updateReason = async (id: string, reason: string) => {
    await updateDoc(doc(db, 'quotations', id), { 
      reason,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
      {/* Boss-Friendly Header & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
               📂 Quote Archive
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 h-12 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/10 font-bold transition-all text-sm"
                placeholder="Search by customer or estimate #..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="lg:w-fit space-y-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Date or Interest</p>
             <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 lg:w-48">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="date"
                    className="w-full pl-11 h-12 bg-slate-50 border-none rounded-2xl text-xs font-black uppercase transition-all"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowHotOnly(!showHotOnly)}
                  className={cn(
                    "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all active:scale-95",
                    showHotOnly ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-slate-400 border-slate-100"
                  )}
                >
                   {showHotOnly ? "🔥 HOT ONLY" : "🔥 SHOW HOT"}
                </button>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-50">
          {['ALL', 'Order Booked', 'Production', 'Material Dispatched'].map((s: any) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={cn(
                "px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeStatus === s ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              {s === 'ALL' ? 'All Jobs' : s.replace('Material ', '')}
            </button>
          ))}
          {(searchTerm || dateFilter || showHotOnly || activeStatus !== 'ALL') && (
            <button 
              onClick={() => { setSearchTerm(''); setDateFilter(''); setShowHotOnly(false); setActiveStatus('ALL'); }}
              className="ml-auto px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
             <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em] bg-white rounded-3xl border border-slate-100">Scanning Database...</div>
        ) : filteredHistory.length === 0 ? (
             <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em] bg-white rounded-3xl border border-slate-100">No matching records</div>
        ) : (
          filteredHistory.map((q) => (
            <QuotationCard 
              key={q.id}
              q={q}
              profile={profile}
              sendingId={sendingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={handleDelete}
              onUpdateStatus={updateStatus}
              onUpdateReason={updateReason}
              onQuickWhatsAppSend={quickWhatsAppSend}
            />
          ))
        )}
      </div>
    </div>
  );
};
