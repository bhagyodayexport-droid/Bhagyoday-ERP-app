import React, { useState } from 'react';
import { Save, Plus, Trash2, Ruler } from 'lucide-react';
import { GlobalSettings } from '../../types';

/**
 * Master Data Management Component
 * -------------------------------
 * Responsible for maintaining global dropdown catalogs such as 
 * units, colors, and material thicknesses.
 * Implements a "Single Source of Truth" pattern for defaults and availability.
 */

interface MasterListsProps {
  settings: GlobalSettings;
  setSettings: (updated: GlobalSettings) => void;
  onSave: (final: GlobalSettings) => void;
}

export const MasterLists: React.FC<MasterListsProps> = ({ settings, setSettings, onSave }) => {
  const [unitInput, setUnitInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [thicknessInput, setThicknessInput] = useState('');

  const onAddSimpleItem = (category: 'units' | 'colors' | 'thicknesses', value: string) => {
    const sanitizedValue = value.trim().toUpperCase();
    if (!sanitizedValue) return;
    
    const existingItems = settings[category] || [];
    if (existingItems.includes(sanitizedValue)) return;
    
    setSettings({ ...settings, [category]: [...existingItems, sanitizedValue] });
  };

  const onRemoveSimpleItem = (category: 'units' | 'colors' | 'thicknesses', value: string) => {
    const existingItems = settings[category] || [];
    setSettings({ 
      ...settings, 
      [category]: existingItems.filter(item => item !== value) 
    });
  };

  const onUpdateDimensionUnitPolicy = (unitName: string, policyField: 'active' | 'isDefaultLen' | 'isDefaultWid', state: boolean) => {
    const updatedMaster = (settings.dimensionUnitMaster || []).map(unitEntry => {
      // Direct match handling
      if (unitEntry.unit === unitName) {
        return { ...unitEntry, [policyField]: state };
      }
      
      // Mutual Exclusivity: Only one default can exist per dimension
      const isSwitchingOnDefault = (policyField === 'isDefaultLen' || policyField === 'isDefaultWid') && state;
      if (isSwitchingOnDefault) {
        return { ...unitEntry, [policyField]: false };
      }
      
      return unitEntry;
    });
    
    setSettings({ ...settings, dimensionUnitMaster: updatedMaster });
  };

  const onRegisterNewDimensionUnit = (newUnit: string) => {
     const normalizedName = newUnit.trim().toUpperCase();
     if (!normalizedName) return;
     
     const existingItems = settings.dimensionUnitMaster || [];
     if (existingItems.some(u => u.unit === normalizedName)) return;
     
     setSettings({
       ...settings,
       dimensionUnitMaster: [...existingItems, { unit: normalizedName, active: true }]
     });
  };

  return (
    <div className="space-y-10">
      <header className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Master Data Management</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global catalogs for dropdowns and measurement units</p>
      </header>

      {/* Dimension Units Policy Table */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
           <Ruler size={14} className="text-blue-500" /> Measurement Units (Advanced)
        </h3>
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm text-slate-700">
           <div className="grid grid-cols-4 gap-4 mb-4 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 pb-2">
              <div className="col-span-1">Metric/Unit</div>
              <div className="text-center">Visibility</div>
              <div className="text-center">L-Default</div>
              <div className="text-center">W-Default</div>
           </div>
           <div className="space-y-2">
             {(settings.dimensionUnitMaster || []).map((entry) => (
               <div key={entry.unit} className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded-xl border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="font-bold text-sm uppercase text-slate-700">{entry.unit}</span>
                  <div className="flex justify-center">
                     <input 
                       type="checkbox" 
                       className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4" 
                       checked={entry.active} 
                       onChange={e => onUpdateDimensionUnitPolicy(entry.unit, 'active', e.target.checked)} 
                     />
                  </div>
                  <div className="flex justify-center">
                     <input 
                       type="radio" 
                       className="focus:ring-slate-900 text-slate-900 h-4 w-4" 
                       checked={entry.isDefaultLen} 
                       onChange={() => onUpdateDimensionUnitPolicy(entry.unit, 'isDefaultLen', true)} 
                     />
                  </div>
                  <div className="flex justify-center">
                     <input 
                       type="radio" 
                       className="focus:ring-slate-900 text-slate-900 h-4 w-4" 
                       checked={entry.isDefaultWid} 
                       onChange={() => onUpdateDimensionUnitPolicy(entry.unit, 'isDefaultWid', true)} 
                     />
                  </div>
               </div>
             ))}
           </div>
           
           {/* Inline Unit Addition */}
           <div className="mt-4 flex gap-2">
              <input 
                className="flex-1 h-10 px-4 rounded-lg text-xs font-bold bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900" 
                placeholder="New Metric (e.g. INCH, MM, FEET)"
                value={unitInput}
                onChange={e => setUnitInput(e.target.value)}
              />
              <button 
                onClick={() => { onRegisterNewDimensionUnit(unitInput); setUnitInput(''); }} 
                className="px-6 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                Assign
              </button>
           </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Color Catalog */}
        <div className="space-y-4">
           <h3 className="text-xs font-black uppercase text-slate-900">Shade Palette</h3>
           <div className="flex flex-wrap gap-2 min-h-[40px]">
              {(settings.colors || []).map(color => (
                <div key={color} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg group transition-all hover:bg-slate-200">
                   <span className="text-[10px] font-bold uppercase text-slate-600">{color}</span>
                   <button 
                     onClick={() => onRemoveSimpleItem('colors', color)} 
                     className="text-slate-400 hover:text-red-500"
                     title="Delete shade"
                   >
                     <Trash2 size={12} />
                   </button>
                </div>
              ))}
           </div>
           <div className="flex gap-2">
              <input 
                className="flex-1 h-10 px-4 rounded-lg text-xs font-bold border border-slate-100 bg-slate-50 focus:bg-white transition-colors" 
                placeholder="Add shade..."
                value={colorInput} 
                onChange={e => setColorInput(e.target.value)} 
              />
              <button 
                onClick={() => { onAddSimpleItem('colors', colorInput); setColorInput(''); }} 
                className="px-4 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase transition-transform active:scale-95"
              >
                Add
              </button>
           </div>
        </div>

        {/* Thickness Catalog */}
        <div className="space-y-4">
           <h3 className="text-xs font-black uppercase text-slate-900">Dimensional Thickness</h3>
           <div className="flex flex-wrap gap-2 min-h-[40px]">
              {(settings.thicknesses || []).map(thick => (
                <div key={thick} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg group transition-all hover:bg-slate-200">
                   <span className="text-[10px] font-bold uppercase text-slate-600">{thick}</span>
                   <button 
                     onClick={() => onRemoveSimpleItem('thicknesses', thick)} 
                     className="text-slate-400 hover:text-red-500"
                     title="Delete thickness"
                   >
                     <Trash2 size={12} />
                   </button>
                </div>
              ))}
           </div>
           <div className="flex gap-2">
              <input 
                className="flex-1 h-10 px-4 rounded-lg text-xs font-bold border border-slate-100 bg-slate-50 focus:bg-white transition-colors" 
                placeholder="Thickness value..."
                value={thicknessInput} 
                onChange={e => setThicknessInput(e.target.value)} 
              />
              <button 
                onClick={() => { onAddSimpleItem('thicknesses', thicknessInput); setThicknessInput(''); }} 
                className="px-4 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase transition-transform active:scale-95"
              >
                Add
              </button>
           </div>
        </div>
      </div>

      <footer className="pt-6">
        <button 
          onClick={() => onSave(settings)} 
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Save size={18} /> Consolidate Master Records
        </button>
      </footer>
    </div>
  );
};
