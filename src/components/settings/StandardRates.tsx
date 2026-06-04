import React from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { GlobalSettings } from '../../types';

/**
 * Standard Rates & Catalog Management Component
 * --------------------------------------------
 * Primary configuration for the material and labor price list.
 * Handles cost price, selling rates, and technical specifications for inventory items.
 */

interface StandardRatesProps {
  settings: GlobalSettings;
  setSettings: (updated: GlobalSettings) => void;
  onSave: (final: GlobalSettings) => void;
}

export const StandardRates: React.FC<StandardRatesProps> = ({ settings, setSettings, onSave }) => {
  
  const onAddNewProduct = () => {
    const templateRate = {
      name: '', 
      rate: 0, 
      unit: 'RFT', 
      baseUnit: 'RFT', 
      width: 3.5, 
      standardWidth: 3.5, 
      hsn: '7210', 
      description: ''
    };

    setSettings({
      ...settings, 
      rates: [...settings.rates, templateRate]
    });
  };

  const onCommitRateUpdate = (updatedIndex: number, field: string, value: any) => {
    const list = [...settings.rates];
    list[updatedIndex] = { ...list[updatedIndex], [field]: value };
    
    // Synced unit handling for consistency across calculation engines
    if (field === 'baseUnit') {
      list[updatedIndex].unit = value;
    }

    setSettings({ ...settings, rates: list });
  };

  const deleteProductEntry = (targetIndex: number) => {
    const productName = settings.rates[targetIndex].name || 'this item';
    if (confirm(`Are you sure you want to remove ${productName} from the catalog?`)) {
      const filteredList = settings.rates.filter((_, idx) => idx !== targetIndex);
      setSettings({ ...settings, rates: filteredList });
    }
  };

  return (
    <div className="space-y-8">
      {/* Catalog Header Controls */}
      <header className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Product Catalog</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">Master pricing and technical documentation</p>
        </div>
        <button 
          onClick={onAddNewProduct} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Add New Entry
        </button>
      </header>

      {/* Product List Grid */}
      <section className="space-y-6">
        {settings.rates.map((product, index) => (
          <div key={index} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
            <div className="flex gap-6 items-start">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Official Item Name</label>
                <input 
                  className="w-full text-sm font-black uppercase bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900" 
                  value={product.name} 
                  placeholder="e.g. JSW CERULEAN BLUE 0.50MM"
                  onChange={e => onCommitRateUpdate(index, 'name', e.target.value)} 
                />
              </div>
              
              <div className="w-28">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Landing Cost</label>
                <input 
                  type="number" 
                  className="w-full text-sm font-black bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900" 
                  value={product.costPrice || ''} 
                  onChange={e => onCommitRateUpdate(index, 'costPrice', Number(e.target.value))} 
                />
              </div>
              
              <div className="w-28">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1 text-blue-600">Sale Rate</label>
                <input 
                  type="number" 
                  className="w-full text-sm font-black bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-blue-600 font-mono text-blue-700" 
                  value={product.rate || ''} 
                  onChange={e => onCommitRateUpdate(index, 'rate', Number(e.target.value))} 
                />
              </div>
              
              <div className="w-24">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Metric</label>
                <select 
                  className="w-full text-[10px] font-black bg-slate-50 border-none rounded-xl h-11 px-3 focus:ring-2 focus:ring-slate-900" 
                  value={product.baseUnit || product.unit} 
                  onChange={e => onCommitRateUpdate(index, 'baseUnit', e.target.value)}
                >
                  {(settings.units || ['RFT', 'SQFT', 'SQM', 'RMT']).map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={() => deleteProductEntry(index)} 
                className="mt-6 text-slate-300 hover:text-red-500 transition-colors p-2"
                title="Remove Entry"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            {/* Extended Meta-Data */}
            <div className="pt-4 border-t border-slate-50">
              <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block ml-1">Document Specifications (Technical Specs / Internal Notes)</label>
              <textarea 
                className="w-full text-[11px] font-bold bg-slate-50 border-none rounded-2xl p-4 min-h-[70px] placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 transition-all resize-none"
                placeholder="Specify dimensions, coil quality, shade references, or quoting guidelines for the sales team..."
                value={product.description || ''}
                onChange={e => onCommitRateUpdate(index, 'description', e.target.value)}
              />
            </div>
          </div>
        ))}
      </section>
      
      {/* Persistence Footer */}
      <footer className="pt-6 border-t border-slate-100">
        <button 
          onClick={() => onSave(settings)} 
          className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Save size={18} /> Synchronize Global Catalog
        </button>
      </footer>
    </div>
  );
};
