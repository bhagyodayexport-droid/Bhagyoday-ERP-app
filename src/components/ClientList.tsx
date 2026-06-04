import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Client, Quotation } from '../types';
import { Search, User, Calendar, IndianRupee, Trash2, FileText, ChevronRight } from 'lucide-react';

interface ClientListProps {
  onNewQuote: (client: Client) => void;
  onShareLast: (quotation: Quotation) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onNewQuote, onShareLast }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [history, setHistory] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qClients = query(collection(db, 'clients'), orderBy('updatedAt', 'desc'));
    const qHistory = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));

    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(d => ({ ...d.data(), id: d.id } as Client)));
      setLoading(false);
    });

    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setHistory(snap.docs.map(d => ({ ...d.data(), id: d.id } as Quotation)));
    });

    return () => {
      unsubClients();
      unsubHistory();
    };
  }, []);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.number.includes(searchTerm)
  );

  const handleDelete = async (id: string) => {
    if (confirm('Delete this client?')) {
      await deleteDoc(doc(db, 'clients', id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 h-12 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/10 font-bold transition-all"
                placeholder="Search clients by name or mobile..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading Directory...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No clients found</div>
          ) : filteredClients.map((client) => {
            const clientHistory = history.filter(h => h.custName === client.name || h.waNo === client.number);
            const lastQuote = clientHistory[0];
            const totalVal = clientHistory.reduce((sum, q) => sum + Number((q.grandTotal || 0).toString().replace(/,/g, '')), 0);
            const quoteCount = clientHistory.length;
            const hasHotDeal = clientHistory.some(q => q.isHotDeal || Number((q.grandTotal || 0).toString().replace(/,/g, '')) >= 100000);

            return (
              <div key={client.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors group gap-4 text-left">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl relative shrink-0 shadow-lg shadow-slate-100">
                    {client.name.charAt(0).toUpperCase()}
                    {hasHotDeal && (
                      <span className="absolute -top-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow-sm" title="Hot Deal Customer">🔥</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-black text-slate-900 uppercase tracking-tight truncate">{client.name}</h3>
                      {quoteCount > 0 && (
                        <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full shrink-0">{quoteCount} QUOTES</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
                       <span className="text-xs font-bold text-slate-400">📱 {client.number || '—'}</span>
                       {totalVal > 0 && (
                         <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                           ₹{totalVal.toLocaleString('en-IN')}
                         </span>
                       )}
                       {client.lastDate && (
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                           Last: {client.lastDate}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                   <button 
                     onClick={() => onNewQuote(client)}
                     className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                   >
                     New Quote
                   </button>
                   {lastQuote && (
                     <button 
                       onClick={() => onShareLast(lastQuote)}
                       className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                       title="View Last Quote"
                     >
                       <FileText size={20} />
                     </button>
                   )}
                   <button 
                     onClick={() => handleDelete(client.id!)}
                     className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
