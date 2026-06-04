import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Quotation } from '../../types';
import { RotateCcw, Trash2, AlertCircle } from 'lucide-react';

/**
 * Trash Bin / Recovery Component
 * ------------------------------
 * Handles soft-deleted records and provides a "Point-in-Time" recovery mechanism.
 * Records shown here are marked for cleanup but can be restored to the active catalog.
 */

export const TrashBin: React.FC = () => {
  const [archivedRecords, setArchivedRecords] = useState<Quotation[]>([]);
  const [isScanning, setIsScanning] = useState(true);

  const fetchArchivedData = async () => {
    setIsScanning(true);
    try {
      // Query for documents that have a soft-delete timestamp set
      const archiveQuery = query(
        collection(db, 'quotations'), 
        where('deletedAt', '!=', null)
      );
      
      const snapshot = await getDocs(archiveQuery);
      const records = snapshot.docs.map(entry => ({ 
        ...entry.data(), 
        id: entry.id 
      } as Quotation));

      // Sort by deletion date descending (most recent first)
      records.sort((a, b) => {
        const dateA = a.deletedAt?.toMillis?.() || 0;
        const dateB = b.deletedAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

      setArchivedRecords(records);
    } catch (err) {
      console.error('Archive Scan Failure:', err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchArchivedData();
  }, []);

  const onHandleRecovery = async (recordId: string) => {
    try {
      const recordReference = doc(db, 'quotations', recordId);
      
      // Atomic reset of deletion flags
      await updateDoc(recordReference, {
        deletedAt: null,
        deletedBy: null
      });

      // Optimistic UI update
      setArchivedRecords(current => current.filter(r => r.id !== recordId));
    } catch (err) {
      console.error('Recovery Logic Interrupted:', err);
      alert('System Error: Unable to restore record at this time.');
    }
  };

  if (isScanning) {
    return (
      <div className="p-12 text-center text-xs font-black text-slate-400 uppercase animate-pulse tracking-[0.2em]">
        Inventorying soft-deleted records...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recovery Section Header */}
      <header className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-100">
          <Trash2 size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Recovery Center</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
            Soft-deleted items remains restorable for 30 cycles
          </p>
        </div>
      </header>

      {/* Archive Entries Grid */}
      {archivedRecords.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-16 text-center border-dashed">
           <AlertCircle size={32} className="mx-auto text-slate-200 mb-4" />
           <p className="font-black text-slate-300 uppercase text-[10px] tracking-[0.1em]">No records found in current archive</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {archivedRecords.map((record) => {
            const deletionDate = record.deletedAt?.toDate?.()?.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div 
                key={record.id} 
                className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
              >
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-[13px] mb-1">{record.custName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-slate-900">EST: {record.estNo}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span>Purged on {deletionDate || 'N/A'}</span>
                  </p>
                </div>
                <button 
                  onClick={() => onHandleRecovery(record.id!)}
                  className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-90"
                  title="Reverse Deletion"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
