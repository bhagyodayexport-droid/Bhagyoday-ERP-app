import React from 'react';
import { Product, GlobalSettings, InventoryItem } from '../../types';
import { Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuotationRowProps {
  index: number;
  item: Partial<Product>;
  settings: GlobalSettings | null;
  inventory: InventoryItem[];
  rowErrors: { [field: string]: string };
  onUpdate: (index: number, updates: Partial<Product>) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  isMetricUnit: (unit?: string) => boolean;
  handleEnterColStep: (e: React.KeyboardEvent<HTMLElement>) => void;
  quotationLenUnit: string;
  quotationWidUnit: string;
  PRODUCT_DESCRIPTIONS: { [key: string]: string };
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  errors: any;
  setErrors: any;
}

export const QuotationRow: React.FC<QuotationRowProps> = ({
  index,
  item,
  settings,
  inventory,
  rowErrors,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
  isMetricUnit,
  handleEnterColStep,
  quotationLenUnit,
  quotationWidUnit,
  PRODUCT_DESCRIPTIONS,
  setNotes,
  errors,
  setErrors
}) => {
  const isMetric = isMetricUnit(item.unit);

  return (
    <div className={cn(
      "grid grid-cols-[40px_minmax(180px,2fr)_minmax(120px,1fr)_85px_100px_100px_80px_100px_110px_minmax(140px,1.5fr)_40px] gap-0 border-b border-slate-100 hover:bg-blue-50/10 group items-stretch transition-colors relative",
      Object.keys(rowErrors).length > 0 && "bg-red-50/20"
    )}>
      {/* Num */}
      <div className="py-2 flex items-center justify-center border-r border-slate-100 text-[10px] font-black text-slate-400 bg-slate-50/50">
        {index + 1}
      </div>

      {/* Product */}
      <div className="p-1 border-r border-slate-100">
        <select 
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent text-[11px] font-black text-black uppercase focus:ring-2 focus:ring-blue-100 px-2 rounded cursor-pointer transition-all hover:bg-slate-50",
            rowErrors.name ? "ring-2 ring-red-400 text-red-600 bg-red-50" : ""
          )}
          value={settings?.rates.findIndex(r => r.name === item.name) ?? -1}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val >= 0) {
              const r = settings!.rates[val];
              
              // Logic to handle Notes update: remove previous and add new
              const oldName = item.name;
              const oldDesc = oldName ? (settings?.rates.find(rate => rate.name === oldName)?.description || PRODUCT_DESCRIPTIONS[oldName.toUpperCase()]) : '';
              const newDesc = r.description || PRODUCT_DESCRIPTIONS[r.name.toUpperCase()];

              onUpdate(index, { 
                name: r.name, 
                rate: r.rate, 
                costPrice: r.costPrice || 0,
                rUnit: r.unit, 
                baseUnit: r.baseUnit || 'RFT',
                unit: r.baseUnit || 'RFT',
                wid: r.width, 
                standardWidth: r.width,
                hsn: r.hsn 
              });

              if (newDesc || oldDesc) {
                setNotes(prev => {
                  let next = prev;
                  // If we found the exact old description, replace it
                  if (oldDesc && next.includes(oldDesc)) {
                    next = next.replace(oldDesc, newDesc || '');
                  } else if (newDesc && !next.includes(newDesc)) {
                    // Otherwise append if not present
                    next = next.trim() ? `${next.trim()}\n\n${newDesc}` : newDesc;
                  }
                  return next.trim();
                });
              }
              
              if (errors.items?.[index]?.name) {
                const nextItems = { ...errors.items };
                delete nextItems[index].name;
                setErrors({ ...errors, items: nextItems });
              }
            }
          }}
          title={item.name}
        >
          <option value="-1" disabled>Select...</option>
          {settings?.rates.map((r, idx) => (
            <option key={idx} value={idx}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Variant */}
      <div className="p-1 border-r border-slate-100">
        <select 
          className="w-full h-full min-h-[40px] bg-transparent border-transparent text-[11px] font-bold text-black uppercase focus:ring-2 focus:ring-blue-100 px-2 rounded cursor-pointer transition-all hover:bg-slate-50 truncate"
          value={item.colour || ''} 
          onChange={e => {
            const colour = e.target.value;
            const match = inventory.find(it => it.make === item.make && it.colour === colour);
            if (match) {
               onUpdate(index, { 
                 colour, 
                 thickness: match.thickness, 
                 gsm: match.gsm,
                 category: match.category
               });
            } else {
               onUpdate(index, { colour });
            }
          }}
          title={item.colour}
        >
           <option value="">Color...</option>
           {Array.from(new Set([
             ...(settings?.colors || []),
             ...inventory.filter(it => it.make === item.make).map(it => it.colour).filter(Boolean)
           ] as string[])).map((c) => (
              <option key={c} value={c}>{c}</option>
           ))}
        </select>
      </div>

      {/* Thk */}
      <div className="p-1 border-r border-slate-100 flex items-center justify-center">
        <input 
          list={`thk-presets-${index}`}
          type="text"
          placeholder="Thk"
          data-col="thk"
          data-row={index}
          className="w-full h-full min-h-[40px] bg-transparent border-transparent text-[10px] font-black text-slate-800 text-center uppercase focus:ring-2 focus:ring-blue-100 px-1 rounded transition-all hover:bg-slate-50"
          value={item.thickness || ''}
          onChange={e => onUpdate(index, { thickness: e.target.value })}
          onKeyDown={handleEnterColStep}
        />
        <datalist id={`thk-presets-${index}`}>
          {(settings?.thicknesses || []).map(t => <option key={t} value={t} />)}
        </datalist>
      </div>

      {/* Width */}
      <div className="p-1 border-r border-slate-100">
        <input 
          title="Width"
          type="number" 
          step="0.001"
          data-col="w"
          data-row={index}
          list={`preset-widths-${index}`}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onKeyDown={handleEnterColStep}
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent text-xs font-black text-black text-center focus:ring-2 focus:ring-blue-100 px-1 rounded transition-all hover:bg-slate-50",
            rowErrors.wid ? "ring-2 ring-red-400 text-red-600 bg-red-50" : ""
          )}
          placeholder="W"
          value={item.wid || ''}
          onChange={e => {
            onUpdate(index, { wid: parseFloat(e.target.value) });
            if (rowErrors.wid) {
              const nextItems = { ...errors.items };
              delete nextItems[index].wid;
              setErrors({ ...errors, items: nextItems });
            }
          }}
        />
        <datalist id={`preset-widths-${index}`}>
           {(settings?.presetWidths || []).map(w => <option key={w} value={w} />)}
        </datalist>
      </div>

      {/* Length */}
      <div className="p-1 border-r border-slate-100">
        <input 
          title="Length"
          type="number" 
          step="0.001"
          data-col="l"
          data-row={index}
          list={`preset-lengths-${index}`}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onKeyDown={handleEnterColStep}
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent text-xs font-black text-black text-center focus:ring-2 focus:ring-blue-100 px-1 rounded transition-all hover:bg-slate-50",
            rowErrors.len ? "ring-2 ring-red-400 text-red-600 bg-red-50" : ""
          )}
          placeholder="L"
          value={item.len || ''}
          onChange={e => {
            onUpdate(index, { len: parseFloat(e.target.value) });
            if (rowErrors.len) {
              const nextItems = { ...errors.items };
              delete nextItems[index].len;
              setErrors({ ...errors, items: nextItems });
            }
          }}
        />
        <datalist id={`preset-lengths-${index}`}>
           {(settings?.presetLengths || []).map(l => <option key={l} value={l} />)}
        </datalist>
      </div>

      {/* Qty */}
      <div className="p-1 border-r border-slate-100">
        <input 
          type="number" 
          data-col="q"
          data-row={index}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onKeyDown={handleEnterColStep}
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent text-xs font-black text-black text-center focus:ring-2 focus:ring-blue-100 px-1 rounded transition-all hover:bg-slate-50",
            rowErrors.pcs ? "ring-2 ring-red-400 text-red-600 bg-red-50" : ""
          )}
          placeholder="Q"
          value={item.pcs || ''}
          onChange={e => {
            onUpdate(index, { pcs: parseFloat(e.target.value) });
            if (rowErrors.pcs) {
              const nextItems = { ...errors.items };
              delete nextItems[index].pcs;
              setErrors({ ...errors, items: nextItems });
            }
          }}
        />
      </div>

      {/* Unit */}
      <div className="p-1 border-r border-slate-100 bg-slate-50/10">
        <select 
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent text-[10px] font-black uppercase focus:ring-2 focus:ring-blue-100 px-1 rounded cursor-pointer transition-all hover:bg-slate-50 text-center",
            isMetric ? "text-blue-700 bg-blue-50/30" : "text-slate-600"
          )}
          value={item.unit || 'RFT'}
          onChange={e => onUpdate(index, { unit: e.target.value })}
        >
          {(settings?.units && settings.units.length > 0 ? settings.units : ['RFT', 'SQFT', 'SQM', 'RMT', 'PCS', 'KG', 'MT']).map((u, uIdx) => (
            <option key={`${u}-${uIdx}`} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Rate */}
      <div className="p-1 border-r border-slate-100 flex items-center justify-end px-2 group/rate bg-slate-50/30">
        <span className={cn("text-[9px] font-black mr-1", rowErrors.rate ? "text-red-400" : "text-slate-300 group-focus-within/rate:text-blue-400")}>₹</span>
        <input 
          title="Net Unit Rate"
          type="number" 
          step="0.01"
          data-col="r"
          data-row={index}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onKeyDown={handleEnterColStep}
          className={cn(
            "w-full h-full min-h-[40px] bg-transparent border-transparent p-0 text-right text-xs font-black text-slate-900 focus:ring-0 rounded transition-all",
            rowErrors.rate ? "text-red-700 placeholder:text-red-300" : ""
          )}
          placeholder="0.00"
          value={item.convertedRate || item.rate || ''}
          onChange={e => {
            onUpdate(index, { convertedRate: parseFloat(e.target.value) });
            if (rowErrors.rate) {
              const nextItems = { ...errors.items };
              delete nextItems[index].rate;
              setErrors({ ...errors, items: nextItems });
            }
          }}
        />
      </div>

      {/* Total */}
      <div className="p-2 border-r border-slate-100 flex items-center justify-end bg-slate-50/50">
        <div className="text-right">
           <div className="text-sm font-black text-slate-900">₹ {item.total?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0.00'}</div>
           {item.qty && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.qty} {item.unit}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="p-1 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <button onClick={() => onRemove(index)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Remove"><Trash2 size={12}/></button>
        <button onClick={() => onDuplicate(index)} className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors" title="Duplicate"><Copy size={12}/></button>
        <div className="flex flex-col">
          <button onClick={() => onMove(index, 'up')} className="p-1 text-slate-400 hover:text-blue-600" title="Move Up"><ChevronUp size={10}/></button>
          <button onClick={() => onMove(index, 'down')} className="p-1 text-slate-400 hover:text-blue-600" title="Move Down"><ChevronDown size={10}/></button>
        </div>
      </div>
    </div>
  );
};
