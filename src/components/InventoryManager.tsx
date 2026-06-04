import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Upload, 
  Search, 
  Filter, 
  TriangleAlert, 
  History, 
  RefreshCcw, 
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  CircleAlert,
  LayoutGrid,
  Settings
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, setDoc, limit } from 'firebase/firestore';
import { InventoryItem, DispatchLog, MaterialVariant } from '../types';
import { cn } from '../lib/utils';
import { getMaterialKey, syncMaterialsWithExcel, updateLowStockThreshold, clearAllInventory } from '../lib/stockService';

/**
 * Improved Excel Parser with better header detection
 */
const dynamicInventoryParser = (sheetData: Record<string, any[]>) => {
  const categories: any[] = [];
  
  Object.entries(sheetData).forEach(([sheetName, rows]) => {
    if (rows.length < 2) return;
    
    // Find the header row (usually the first row with meaningful content)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i].some(cell => typeof cell === 'string' && cell.trim().length > 2)) {
        headerRowIdx = i;
        break;
      }
    }
    
    const headers = (rows[headerRowIdx] as any[]).map(h => String(h || '').trim().toUpperCase());
    
    // Header mappings
    const findIdx = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));
    
    const nameIdx = findIdx(['PRODUCT', 'DESCRIPTION', 'ITEM', 'NAME', 'MATERIAL', 'PARTICULAR']);
    const stockIdx = findIdx(['TOTAL RFT', 'STOCK', 'QTY', 'QUANTITY', 'TOTAL', 'REMAINING', 'IN STOCK', 'PIECES', 'PCS', 'BAL', 'BALANCE', 'CLOSING']);
    const makeIdx = findIdx(['MAKE', 'BRAND', 'COMPANY', 'MANUFACTURER', 'MFR', 'COIL', 'VENDOR']);
    const colorIdx = findIdx(['COLOUR', 'COLOR', 'SHADE', 'FINISH']);
    const thickIdx = findIdx(['THICKNESS', 'THK', 'SIZE', 'GUAGE', 'GAUGE', 'GSM', 'DIMENSION']);
    const unitIdx = findIdx(['UNIT', 'UOM', 'MEASURE']);

    const products: any[] = [];
    
    rows.slice(headerRowIdx + 1).forEach(row => {
      const name = nameIdx !== -1 ? String(row[nameIdx] || '') : '';
      const stock = stockIdx !== -1 ? Number(row[stockIdx]) : null;
      
      if (name && stock !== null && !isNaN(stock)) {
        const make = makeIdx !== -1 ? String(row[makeIdx] || '') : '';
        const color = colorIdx !== -1 ? String(row[colorIdx] || '') : '';
        const thick = thickIdx !== -1 ? String(row[thickIdx] || '') : '';
        const unit = unitIdx !== -1 ? String(row[unitIdx] || '') : (sheetName.toUpperCase().includes('JSW') ? 'RFT' : 'PCS');
        
        products.push({
          productName: name.trim(),
          brand: make.trim(),
          colour: color.trim(),
          thickness: thick.trim(),
          totalStock: stock,
          unit: unit.trim() || (stockIdx !== -1 && headers[stockIdx].includes('RFT') ? 'RFT' : 'PCS'),
          tableSource: sheetName
        });
      }
    });
    
    if (products.length > 0) {
      categories.push({ categoryName: sheetName, products });
    }
  });
  
  return { categories };
};


const getMaterialColor = (colorName: string) => {
  const c = (colorName || '').toLowerCase();
  if (c.includes('red')) return 'bg-red-500';
  if (c.includes('blue')) return 'bg-blue-600';
  if (c.includes('green')) return 'bg-green-600';
  if (c.includes('grey') || c.includes('gray')) return 'bg-slate-400';
  if (c.includes('white')) return 'bg-slate-200 text-slate-900 border border-slate-200';
  if (c.includes('black')) return 'bg-slate-900';
  if (c.includes('orange')) return 'bg-orange-500';
  if (c.includes('yellow')) return 'bg-yellow-400';
  if (c.includes('brown')) return 'bg-amber-800';
  if (c.includes('silver')) return 'bg-slate-300 text-slate-700';
  if (c.includes('gold')) return 'bg-amber-400';
  return 'bg-slate-900'; // Default
};

const InventoryRow = React.memo(({ 
  item, 
  onDelete, 
  onUpdateLimit 
}: { 
  item: InventoryItem; 
  onDelete: (id: string) => void;
  onUpdateLimit: (id: string, limit: number, remaining: number) => void;
}) => {
  const isLow = item.status === 'LOW_STOCK';
  const isOut = item.status === 'OUT_OF_STOCK';

  return (
    <tr id={`inv-row-${item.id}`} className={cn(
      "group border-b border-slate-800 transition-all hover:bg-slate-900/50", 
      isOut && "bg-red-950/20",
      isLow && "bg-amber-950/20",
      "bg-black text-white"
    )}>
       <td className="px-6 py-4">
          <div className="flex items-center gap-4">
             <div className={cn(
               "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105",
               isOut ? "bg-red-600 text-white" : isLow ? "bg-amber-500 text-white" : getMaterialColor(item.colour || '')
             )}>
                <Package size={18} className={isOut || isLow || item.colour?.toLowerCase() === 'white' ? '' : 'text-white'} />
             </div>
             <div className="min-w-0">
                <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-none mb-1.5">{item.productName}</p>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-black text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">{item.category}</span>
                   {(item.thickness && item.thickness !== '-') && (
                     <span className="text-[9px] font-black text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded bg-slate-900/40 tracking-widest whitespace-nowrap">
                       {item.thickness} {item.gsm && item.gsm !== '-' ? `| ${item.gsm}` : ''}
                     </span>
                   )}
                   {item.make && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{item.make}</span>}
                </div>
             </div>
          </div>
       </td>
       <td className="px-6 py-4 text-center">
          <div className="inline-flex flex-col items-center">
             <span className={cn(
               "text-sm font-black tracking-tight",
               isOut ? "text-red-400" : isLow ? "text-amber-400" : "text-green-400"
             )}>
                {item.remaining.toLocaleString()} {item.unit}
             </span>
             <div className="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={cn("h-full", isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500")}
                  style={{ width: `${Math.min(100, (item.remaining / (item.stock || 1)) * 100)}%` }}
                />
             </div>
          </div>
       </td>
       <td className="px-6 py-4 text-center hidden sm:table-cell">
           <div className={cn(
             "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border",
             isOut ? "bg-red-950/30 text-red-400 border-red-900" :
             isLow ? "bg-amber-950/30 text-amber-400 border-amber-900" :
             "bg-green-950/30 text-green-400 border-green-900"
           )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500")} />
              {isOut ? 'Empty' : isLow ? 'Low' : 'OK'}
           </div>
       </td>
       <td className="px-6 py-4 text-center">
           <div className={cn(
              "w-10 h-10 rounded-xl mx-auto flex flex-col items-center justify-center border",
              (item.estimatedDaysLeft || 0) < 7 && item.remaining > 0 ? "bg-red-950/30 border-red-900 text-red-400" : "bg-slate-900 border-slate-800 text-slate-300"
           )}>
              <span className="text-[11px] font-black leading-none">{item.estimatedDaysLeft && item.estimatedDaysLeft < 500 ? Math.round(item.estimatedDaysLeft) : '∞'}</span>
              <span className="text-[7px] font-black uppercase opacity-60 mt-0.5">Days</span>
           </div>
       </td>
       <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-500 uppercase mb-1">Limit</span>
                <input 
                  type="number" 
                  className="w-14 bg-slate-950 border border-slate-800 text-[10px] font-black h-7 rounded-lg text-center focus:ring-1 focus:ring-blue-500/20 text-white"
                  defaultValue={item.lowStockLimit || 500}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== item.lowStockLimit) {
                      onUpdateLimit(item.id!, val, item.remaining);
                    }
                  }}
                />
             </div>
             <button 
               onClick={() => onDelete(item.id!)}
               className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
             >
                <Trash2 size={14} />
             </button>
          </div>
       </td>
    </tr>
  );
});

const LogRow = React.memo(({ log }: { log: DispatchLog }) => (
  <tr className="hover:bg-slate-900/50 transition-colors bg-black border-b border-slate-900">
      <td className="px-8 py-5 text-[10px] font-bold text-slate-500">
         {new Date(log.createdAt).toLocaleString()}
      </td>
      <td className="px-8 py-5">
         <span className="px-2 py-1 rounded-lg bg-blue-950/50 text-[9px] font-black text-blue-400 uppercase">
           {log.materialName?.split(' - ')[0] || 'Unknown'}
         </span>
      </td>
      <td className="px-8 py-5">
         <p className="text-[11px] font-black text-white uppercase truncate max-w-md">
            {log.materialName}
         </p>
      </td>
      <td className="px-8 py-5 text-center font-black text-red-500">
         - {(log.qtyDeducted || log.quantityUsedRFT || 0).toFixed(2)} RFT
      </td>
      <td className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">
         {log.userName?.split('@')[0] || 'System'}
      </td>
  </tr>
));

export const InventoryManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [makeFilter, setMakeFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastAlert, setLastAlert] = useState<InventoryItem | null>(null);
  // Report status
  const [reportDue, setReportDue] = useState(false);

  useEffect(() => {
    // Check if report is due (Simulation: every 3 days)
    const lastReport = localStorage.getItem('last_stock_report_ts');
    if (lastReport) {
       const days = (Date.now() - Number(lastReport)) / (1000 * 60 * 60 * 24);
       if (days >= 3) setReportDue(true);
    } else {
       setReportDue(true);
    }
    const qInv = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(qInv, (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
      // Client-side sort by make and color
      const sortedItems = items.sort((a, b) => {
        if (a.make !== b.make) return a.make.localeCompare(b.make);
        return a.colour.localeCompare(b.colour);
      });
      setInventory(sortedItems);
      setLoading(false);

      // Check for low stock alerts (simple logic: find first item that just went low)
      const lowStockItem = items.find(it => it.remaining <= (it.lowStockLimit || 0) && it.remaining > 0);
      if (lowStockItem && !alertOpen) {
        setLastAlert(lowStockItem);
        setAlertOpen(true);
      }
    }, (error) => {
      console.error("Inventory Sync Error:", error);
    });

    const qLogs = query(collection(db, 'dispatch_logs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ ...d.data(), id: d.id } as DispatchLog)));
    }, (error) => {
      console.error("Logs Sync Error:", error);
    });

    return () => {
      unsubInv();
      unsubLogs();
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setMakeFilter('ALL');
    setSelectedCategory('ALL');
    setSelectedProduct('ALL');
    setStatusFilter('ALL');
  };

  const deleteMaterial = async (id: string) => {
    if (confirm("Delete this material permanently?")) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        
        const sheetData: Record<string, any[]> = {};
        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          sheetData[name] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        });

        setUploadProgress(30);
        
        // Manual Parsing (Replacing AI for performance & cost)
        const aiResponse = dynamicInventoryParser(sheetData);
        
        setUploadProgress(70);

        if (!aiResponse || !aiResponse.categories) {
          throw new Error("Analysis failed to interpret the file structure.");
        }

        const now = new Date().toISOString();
        const allItems: InventoryItem[] = [];

        aiResponse.categories.forEach(cat => {
          cat.products.forEach(p => {
            const lowLimit = cat.categoryName.toUpperCase().includes('JSW') || cat.categoryName.toUpperCase().includes('ROOFING') ? 500 : 50;
            
            allItems.push({
              category: cat.categoryName || 'GENERAL',
              productName: p.productName,
              brand: p.brand || '',
              size: p.size || '',
              make: p.brand || 'GENERAL',
              colour: p.colour || 'VARIOUS',
              thickness: p.thickness || '-',
              gsm: p.gsm || '-',
              stock: p.totalStock || 0,
              packedCoilStock: 0,
              openCoilStock: 0,
              used: 0,
              remaining: p.totalStock || 0,
              unit: p.unit || 'PCS',
              status: ((p.totalStock || 0) <= 0) ? 'OUT_OF_STOCK' : ((p.totalStock || 0) <= lowLimit) ? 'LOW_STOCK' : 'IN_STOCK',
              lowStockLimit: lowLimit,
              sourceSheet: p.tableSource || cat.categoryName,
              createdAt: now,
              updatedAt: now
            });
          });
        });

        if (allItems.length === 0) {
          alert("AI Analysis: No valid products detected in this file.");
          setUploading(false);
          return;
        }

        setUploadProgress(90);
        await syncMaterialsWithExcel(allItems);
        setUploadProgress(100);
        
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          
          const totalSheets = aiResponse.categories.length;
          let alertMsg = `AI Analysis Complete: Successfully processed ${totalSheets} categories and imported ${allItems.length} items.`;
          alert(alertMsg);
        }, 500);

      } catch (err) {
        console.error("AI Inventory Engine Error:", err);
        alert("AI Parser Error: " + (err instanceof Error ? err.message : String(err)));
        setUploading(false);
        setUploadProgress(0);
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const filteredInventory = React.useMemo(() => {
    return inventory.filter(it => {
      const searchStr = `${it.productName} ${it.category} ${it.sourceSheet}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesMake = makeFilter === 'ALL' || it.make === makeFilter;
      const matchesCategory = selectedCategory === 'ALL' || it.category === selectedCategory;
      const matchesProduct = selectedProduct === 'ALL' || it.colour === selectedProduct;
      
      let matchesStatus = true;
      if (statusFilter === 'LOW') matchesStatus = it.status === 'LOW_STOCK';
      if (statusFilter === 'OUT') matchesStatus = it.status === 'OUT_OF_STOCK';
      if (statusFilter === 'IN') matchesStatus = it.status === 'IN_STOCK';

      return matchesSearch && matchesMake && matchesCategory && matchesProduct && matchesStatus;
    });
  }, [inventory, searchTerm, makeFilter, selectedCategory, selectedProduct, statusFilter]);

  const categories = React.useMemo(() => 
    Array.from(new Set(inventory.map(it => it.category))).sort(), 
    [inventory]
  );

  const currentSheetVariants = React.useMemo(() => {
    if (selectedCategory === 'ALL') return [];
    return Array.from(new Set(
      inventory.filter(it => it.category === selectedCategory).map(it => it.colour)
    )).sort();
  }, [inventory, selectedCategory]);

  const generateReport = () => {
    const headers = ["Product Name", "Category", "Sheet", "Source Stock", "Consumed", "Current Balance", "Unit", "Status"];
    const rows = inventory.map(it => [
      it.productName,
      it.category,
      it.sourceSheet,
      it.stock,
      it.used || 0,
      it.remaining,
      it.unit,
      it.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Stock Report");
    XLSX.writeFile(wb, `Inventory_Intelligence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    localStorage.setItem('last_stock_report_ts', Date.now().toString());
    setReportDue(false);
  };

  const lowStockItems = React.useMemo(() => inventory.filter(i => i.status === 'LOW_STOCK'), [inventory]);
  const outOfStockItems = React.useMemo(() => inventory.filter(i => i.status === 'OUT_OF_STOCK'), [inventory]);
  const healthyItemsCount = inventory.length - lowStockItems.length - outOfStockItems.length;  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Package size={18} />
             </div>
             <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Stock Command</h1>
           </div>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Inventory & Material Intelligence</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           <label 
             className={cn(
               "flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-all shadow-xl active:scale-95 group",
               uploading && "opacity-50 pointer-events-none"
             )}
           >
              {uploading ? <RefreshCcw size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{uploading ? 'Processing...' : 'Sync Excel File'}</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={uploading} />
           </label>
           <button 
             onClick={generateReport}
             className="px-6 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2.5"
           >
              <Download size={14} />
              Report
           </button>
           <button 
             onClick={async () => {
               if (confirm("CRITICAL: This will permanently delete all inventory records. Usage logs will be preserved. Are you absolutely sure?")) {
                 if (confirm("Final confirmation: This action cannot be undone.")) {
                   setUploading(true);
                   await clearAllInventory();
                   setUploading(false);
                 }
               }
             }}
             className="w-10 h-10 flex items-center justify-center bg-white border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all"
             title="Reset Inventory"
           >
              <Trash2 size={16} />
           </button>
        </div>
      </header>

      {uploading && (
        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100 space-y-3 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-100">
            <span>Updating Master Repository...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
             <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Total Materials', value: inventory.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
           { label: 'Critically Low', value: lowStockItems.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: TriangleAlert },
           { label: 'Out of Stock', value: outOfStockItems.length, color: 'text-red-600', bg: 'bg-red-50', icon: CircleAlert },
           { label: 'Search Sheets', value: categories.length, color: 'text-slate-600', bg: 'bg-slate-100', icon: FileSpreadsheet },
         ].map((s) => (
           <div key={s.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", s.bg, s.color)}>
                 <s.icon size={22} />
              </div>
              <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{s.label}</p>
                  <p className="text-xl font-black text-slate-900 leading-none">{s.value}</p>
              </div>
           </div>
         ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
          {/* Enhanced Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-4">
              <div className="bg-slate-100 p-1.5 rounded-2xl flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'stock', label: 'Inventory list', icon: LayoutGrid },
                    { id: 'logs', label: 'Usage timeline', icon: History }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap flex-1",
                        activeTab === tab.id ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-4">
                  <div className="px-2">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Sheet Navigation</h4>
                      <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                          <button 
                            onClick={() => { setSelectedCategory('ALL'); setSelectedProduct('ALL'); }}
                            className={cn(
                              "w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between",
                              selectedCategory === 'ALL' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
                            )}
                          >
                             <span>All Collections</span>
                             <span className="opacity-40">{inventory.length}</span>
                          </button>
                          
                          {categories.map(cat => (
                            <button 
                              key={cat}
                              onClick={() => { setSelectedCategory(cat); setSelectedProduct('ALL'); }}
                              className={cn(
                                "w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between",
                                selectedCategory === cat ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                              )}
                            >
                               <span className="truncate mr-2">{cat}</span>
                               <span className={cn("text-[9px]", selectedCategory === cat ? "text-white/60" : "opacity-30")}>
                                 {inventory.filter(i => i.category === cat).length}
                               </span>
                            </button>
                          ))}
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 px-2 space-y-3">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Stock Filter</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                          {[
                            { id: 'LOW', label: 'Low', color: 'bg-amber-500', count: lowStockItems.length },
                            { id: 'OUT', label: 'Empty', color: 'bg-red-500', count: outOfStockItems.length },
                            { id: 'ALL', label: 'Reset', color: 'bg-slate-300', count: inventory.length }
                          ].map(f => (
                            <button
                              key={f.id}
                              onClick={() => setStatusFilter(f.id)}
                              className={cn(
                                "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-all",
                                statusFilter === f.id ? "bg-slate-100 text-slate-900 border border-slate-200" : "text-slate-400 hover:bg-slate-50"
                              )}
                            >
                               <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", f.color)} />
                               <span className="flex-1">{f.label}</span>
                               <span className="opacity-40">{f.count}</span>
                            </button>
                          ))}
                      </div>
                  </div>
              </div>
          </aside>

          {/* Main Workspace */}
          <main className="flex-1 min-w-0 space-y-6">
              {activeTab === 'stock' ? (
                <>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            placeholder="Find any item or category..."
                            className="w-full pl-11 h-11 bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest rounded-xl focus:ring-1 focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <select 
                        className="w-full sm:w-48 h-11 bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest rounded-xl px-4 cursor-pointer outline-none"
                        value={makeFilter}
                        onChange={e => setMakeFilter(e.target.value)}
                      >
                          <option value="ALL">All Manufacturers</option>
                          {Array.from(new Set(inventory.filter(i => i.make).map(it => it.make))).sort().map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                  </div>

                  <div className="bg-black rounded-[2rem] border border-slate-800 shadow-xl shadow-black/50 overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-slate-950 border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                     <th className="px-8 py-6">Material Database</th>
                                     <th className="px-6 py-6 text-center">Current Balance</th>
                                     <th className="px-6 py-6 text-center hidden sm:table-cell">Inventory Health</th>
                                     <th className="px-6 py-6 text-center">Stability</th>
                                     <th className="px-6 py-6 text-right">Control</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800">
                                  {filteredInventory.map((item) => (
                                      <InventoryRow 
                                        key={item.id} 
                                        item={item} 
                                        onDelete={deleteMaterial}
                                        onUpdateLimit={async (id, limit, remaining) => {
                                          const status = remaining <= 0 ? 'OUT_OF_STOCK' : remaining <= limit ? 'LOW_STOCK' : 'IN_STOCK';
                                          await updateDoc(doc(db, 'inventory', id), { lowStockLimit: limit, status });
                                        }}
                                      />
                                  ))}
                               </tbody>
                          </table>
                          {filteredInventory.length === 0 && (
                            <div className="py-32 text-center">
                               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Search className="text-slate-200" size={24} />
                               </div>
                               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">No results matched</h3>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Try resetting filters or changing the category</p>
                            </div>
                          )}
                      </div>
                  </div>
                </>
              ) : (
               <div className="bg-black rounded-[2rem] border border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-950 border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <th className="px-8 py-6">Event Time</th>
                                <th className="px-8 py-6">Category</th>
                                <th className="px-8 py-6">Material</th>
                                <th className="px-6 py-6 text-center">Impact</th>
                                <th className="px-8 py-6 text-right">Operator</th>
                             </tr>
                          </thead>
                         <tbody className="divide-y divide-slate-800">
                            {logs.map(log => (
                               <LogRow key={log.id || `log-${log.createdAt}`} log={log} />
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
          </main>
      </div>

      {/* Floating Stock Radar */}
      <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setAlertOpen(true)}
            className={cn(
              "p-4 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-3 group relative overflow-hidden",
              outOfStockItems.length > 0 ? "bg-red-600 animate-pulse text-white" :
              lowStockItems.length > 0 ? "bg-amber-500 text-white" : "bg-slate-900 text-white"
            )}
          >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <TriangleAlert size={20} className="relative z-10" />
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10 pr-2">Stock Analysis</span>
              {(lowStockItems.length + outOfStockItems.length > 0) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-slate-900 text-[9px] font-black flex items-center justify-center rounded-full shadow-lg">
                  {lowStockItems.length + outOfStockItems.length}
                </span>
              )}
          </button>
      </div>

      {/* Analysis Modal */}
      {alertOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] transition-all">
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-8 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Stock Warnings</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Action required for {lowStockItems.length + outOfStockItems.length} items</p>
                  </div>
                  <button onClick={() => setAlertOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                    <ChevronDown size={24} />
                  </button>
               </div>

               <div className="p-6 pt-2 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {[...outOfStockItems, ...lowStockItems].map((item, idx) => {
                    const isOut = item.status === 'OUT_OF_STOCK';
                    return (
                      <div key={`${item.id}-${idx}`} className={cn(
                        "p-4 rounded-2xl border flex items-center justify-between",
                        isOut ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                      )}>
                        <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", isOut ? "bg-red-600" : "bg-amber-500")}>
                             {isOut ? <CircleAlert size={18} /> : <TriangleAlert size={18} />}
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase">{item.category}</p>
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight">{item.productName}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={cn("text-[10px] font-black uppercase", isOut ? "text-red-600" : "text-amber-600")}>{Math.round(item.remaining)} {item.unit}</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Critical Threshold</p>
                        </div>
                      </div>
                    );
                  })}
               </div>

               <div className="p-8 pt-4">
                  <button onClick={() => setAlertOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    Acknowledge Intelligence
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
