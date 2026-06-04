import React, { useState, useEffect } from 'react';
import { DbService } from '../database/dbService';
import { GlobalSettings } from '../types';
import { Building, FileText, Briefcase, Link as LinkIcon, Database, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { BusinessProfile } from './settings/BusinessProfile';
import { StandardRates } from './settings/StandardRates';
import { PdfSettings } from './settings/PdfSettings';
import { MasterLists } from './settings/MasterLists';
import { StaffAccess } from './settings/StaffAccess';
import { TrashBin } from './settings/TrashBin';

export const SettingsLayout: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [activeSec, setActiveSec] = useState('company');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const s = await DbService.getGlobalSettings();
      if (s) setSettings({
        ...s,
        // Ensure defaults if missing
        empPermissions: s.empPermissions || {
          canAccessHistory: true,
          canAccessClients: true,
          canAccessSales: false,
          canAccessSettings: false,
          canAccessInventory: false
        },
        pdfCfg: s.pdfCfg || {
          title: 'QUOTATION',
          color: '#000000',
          footer: '',
          bank: '',
          terms: ''
        }
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSettings = async (updates: Partial<GlobalSettings>) => {
    if (!settings) return;
    try {
      const next = { ...settings, ...updates };
      setSettings(next);
      await DbService.updateGlobalSettings(next);
      setSuccessMsg('Settings Saved Successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'qrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!settings) return;
        setSettings({
          ...settings,
          company: { ...settings.company, [field]: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !settings) return <div className="p-12 text-center text-[10px] font-black uppercase text-slate-400">Loading Configuration...</div>;

  const sections = [
    { id: 'company', label: 'Company Info', icon: Building },
    { id: 'rates', label: 'Standard Rates', icon: Briefcase },
    { id: 'pdf', label: 'PDF & Footer', icon: FileText },
    { id: 'masters', label: 'Master Lists', icon: Database },
    { id: 'trash', label: 'Trash Bin', icon: Trash2 },
    { id: 'staff', label: 'Staff Access', icon: ShieldCheck, adminOnly: true },
  ].filter(s => !s.adminOnly || profile?.role === 'admin');

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-6 relative">
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold z-50 animate-in slide-in-from-right duration-300">
          {successMsg}
        </div>
      )}
      <aside className="md:w-64 space-y-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSec(s.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all",
              activeSec === s.id ? "bg-black text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <s.icon size={18} />
            {s.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {activeSec === 'company' && <BusinessProfile {...{ settings, setSettings, onSave: saveSettings, handleFileUpload }} />}
        {activeSec === 'rates' && <StandardRates {...{ settings, setSettings, onSave: saveSettings }} />}
        {activeSec === 'pdf' && <PdfSettings {...{ settings, setSettings, onSave: saveSettings }} />}
        {activeSec === 'masters' && <MasterLists {...{ settings, setSettings, onSave: saveSettings }} />}
        {activeSec === 'staff' && <StaffAccess {...{ settings, setSettings, onSave: saveSettings }} />}
        {activeSec === 'trash' && <TrashBin />}
      </main>
    </div>
  );
};
