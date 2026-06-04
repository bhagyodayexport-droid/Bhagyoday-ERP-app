import React from 'react';
import { Save, FileText, Landmark, ShieldAlert } from 'lucide-react';
import { GlobalSettings } from '../../types';

/**
 * PDF & Documentation Settings
 * ----------------------------
 * Configures the visual theme and legal metadata for generated PDFs.
 * Manages bank details, terms of service, and document branding.
 */

interface PdfSettingsProps {
  settings: GlobalSettings;
  setSettings: (updated: GlobalSettings) => void;
  onSave: (final: GlobalSettings) => void;
}

export const PdfSettings: React.FC<PdfSettingsProps> = ({ settings, setSettings, onSave }) => {
  return (
    <div className="space-y-8">
      {/* Header with context indication */}
      <header className="border-b border-slate-100 pb-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">PDF Export Engine</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                Visual brand control and legislative overrides
              </p>
            </div>
         </div>
      </header>

      {/* Visual Identity Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Default Document Caption</label>
          <input 
            className="w-full text-sm font-bold bg-slate-50 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-slate-900 transition-all font-sans" 
            value={settings.pdfCfg.title} 
            onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, title: e.target.value}})} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Theme Color (Hex)</label>
          <div className="flex gap-2">
             <input 
               className="flex-1 text-sm font-bold bg-slate-50 border-none rounded-xl h-12 px-4 font-mono focus:ring-2 focus:ring-slate-900 transition-all uppercase" 
               value={settings.pdfCfg.color} 
               onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, color: e.target.value}})} 
             />
             <div 
               className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm shrink-0" 
               style={{ backgroundColor: settings.pdfCfg.color }} 
             />
          </div>
        </div>
      </div>

      {/* Compliance & Financial Metadata */}
      <div className="space-y-6 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
             <Landmark size={14} className="text-slate-400" />
             <label className="text-[10px] font-black uppercase text-slate-400">Electronic Transfer (Bank Info)</label>
          </div>
          <textarea 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-2xl p-4 min-h-[80px] focus:ring-2 focus:ring-slate-900 transition-all resize-none" 
            placeholder="Account Name, Number, IFSC, and Bank Branch..."
            value={settings.pdfCfg.bank} 
            onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, bank: e.target.value}})} 
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
             <ShieldAlert size={14} className="text-slate-400" />
             <label className="text-[10px] font-black uppercase text-slate-400">Standard Legal Disclaimer</label>
          </div>
          <textarea 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-slate-900 transition-all resize-none" 
            placeholder="Terms of service, validity, and scope of work..."
            value={settings.pdfCfg.terms} 
            onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, terms: e.target.value}})} 
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Small Print Footer</label>
            <input 
              className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-slate-900" 
              value={settings.pdfCfg.footer} 
              onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, footer: e.target.value}})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Closing Signature Legend</label>
            <input 
              className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-slate-900" 
              value={settings.pdfCfg.footerRegards || ''} 
              onChange={e => setSettings({...settings, pdfCfg: {...settings.pdfCfg, footerRegards: e.target.value}})} 
              placeholder="e.g. Authorized Signatory for Bhagyoday"
            />
          </div>
        </div>
      </div>

      {/* Integration Control Section */}
      <footer className="pt-6 border-t border-slate-100">
        <button 
          onClick={() => onSave(settings)} 
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200 active:scale-95 transition-all hover:bg-slate-800"
        >
          <Save size={18} /> Update PDF Design
        </button>
      </footer>
    </div>
  );
};
