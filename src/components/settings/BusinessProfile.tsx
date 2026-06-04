import React from 'react';
import { Save, Building, Plus, Trash2, QrCode } from 'lucide-react';
import { GlobalSettings } from '../../types';

/**
 * Business Profile Component
 * --------------------------
 * Handles core identity settings including logo, naming, address, 
 * and payment QR code assets used across the ERP.
 */

interface BusinessProfileProps {
  settings: GlobalSettings;
  setSettings: (updated: GlobalSettings) => void;
  onSave: (final: GlobalSettings) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'qrCode') => void;
}

export const BusinessProfile: React.FC<BusinessProfileProps> = ({ 
  settings, 
  setSettings, 
  onSave, 
  handleFileUpload 
}) => {

  const onAddQrCode = (event: React.ChangeEvent<HTMLInputElement>) => {
    const freshFile = event.target.files?.[0];
    if (freshFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const existingCodes = settings.company.qrCodes || [];
        
        setSettings({
          ...settings,
          company: {
            ...settings.company,
            qrCodes: [...existingCodes, { url: dataUrl, label: 'New Payment Gateway' }]
          }
        });
      };
      reader.readAsDataURL(freshFile);
    }
  };

  const onRemoveQrCode = (targetIndex: number) => {
    const list = settings.company.qrCodes || [];
    setSettings({
      ...settings,
      company: {
        ...settings.company,
        qrCodes: list.filter((_, idx) => idx !== targetIndex)
      }
    });
  };

  const onUpdateQrLabel = (targetIndex: number, newLabel: string) => {
    const list = settings.company.qrCodes || [];
    const updatedList = [...list];
    updatedList[targetIndex] = { ...updatedList[targetIndex], label: newLabel };
    
    setSettings({
      ...settings,
      company: {
        ...settings.company,
        qrCodes: updatedList
      }
    });
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-900">Business Identity</h2>
      </header>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Logo and Identity Branding */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400">Corporate Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {settings.company.logo ? (
                <img src={settings.company.logo} alt="Business Logo" className="w-full h-full object-contain" />
              ) : (
                <Building className="text-slate-200" size={32} />
              )}
            </div>
            <div className="space-y-2">
              <input 
                type="file" 
                id="logo-upload-input" 
                onChange={event => handleFileUpload(event, 'logo')} 
                className="hidden" 
              />
              <label 
                htmlFor="logo-upload-input" 
                className="cursor-pointer bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all block text-center"
              >
                Choose File
              </label>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
                Square aspect ratio recommended.<br/>PNG or JPG.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Payment QR Gateways */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
            <QrCode size={14} /> Multi-Payment QR Setup
          </label>
          <div className="space-y-3">
             {(settings.company.qrCodes || []).map((qr, index) => (
                <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                   <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                      <img src={qr.url} alt={`QR Code ${index}`} className="w-full h-full object-contain" />
                   </div>
                   <div className="flex-1">
                      <input 
                        className="w-full h-8 text-[11px] font-black uppercase bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300" 
                        value={qr.label} 
                        placeholder="e.g. UPI, GPAY, PHONEPE"
                        onChange={e => onUpdateQrLabel(index, e.target.value)}
                      />
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Render Target: Print/PDF Footer</p>
                   </div>
                   <button 
                     onClick={() => onRemoveQrCode(index)} 
                     className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
                     title="Remove logic"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>
             ))}

             <div className="pt-2">
                <input type="file" id="qr-bulk-upload" onChange={onAddQrCode} className="hidden" />
                <label 
                  htmlFor="qr-bulk-upload" 
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-100 rounded-2xl py-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                   <Plus size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                   <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 transition-colors">Append New Gateway QR</span>
                </label>
             </div>
          </div>
        </div>
      </div>

      {/* Corporate Details Form */}
      <section className="grid md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Legal Company Name</label>
          <input 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900 transition-shadow" 
            value={settings.company.name} 
            onChange={e => setSettings({...settings, company: {...settings.company, name: e.target.value}})} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Global Social/Web Link</label>
          <input 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900 transition-shadow" 
            value={settings.company.social || ''} 
            onChange={e => setSettings({...settings, company: {...settings.company, social: e.target.value}})} 
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Registered Address</label>
          <input 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900 transition-shadow" 
            value={settings.company.addr1} 
            onChange={e => setSettings({...settings, company: {...settings.company, addr1: e.target.value}})} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">GSTIN (Tax Registration)</label>
          <input 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900 transition-shadow" 
            value={settings.company.gst} 
            onChange={e => setSettings({...settings, company: {...settings.company, gst: e.target.value}})} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Support Contact Number</label>
          <input 
            className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl h-11 px-4 focus:ring-2 focus:ring-slate-900 transition-shadow" 
            value={settings.company.phone} 
            onChange={e => setSettings({...settings, company: {...settings.company, phone: e.target.value}})} 
          />
        </div>
      </section>

      <footer>
        <button 
          onClick={() => onSave(settings)} 
          className="bg-slate-900 border-2 border-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200 mt-6 active:scale-95 hover:bg-slate-800 transition-all"
        >
          <Save size={18} /> Consolidate Settings
        </button>
      </footer>
    </div>
  );
};
