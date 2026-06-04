import React from 'react';
import { Save, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { GlobalSettings, EmployeePermissions } from '../../types';
import { cn } from '../../lib/utils';

/**
 * Staff Access & RBAC Configuration Component
 * -------------------------------------------
 * Manages global permission overrides for users designated with the 'EMPLOYEE' role.
 * Note: 'ADMIN' roles bypass these gates and inherently possess full system access.
 */

interface StaffAccessProps {
  settings: GlobalSettings;
  setSettings: (updated: GlobalSettings) => void;
  onSave: (final: GlobalSettings) => void;
}

interface PermissionSchema {
  key: keyof EmployeePermissions;
  label: string;
  description: string;
}

export const StaffAccess: React.FC<StaffAccessProps> = ({ settings, setSettings, onSave }) => {
  
  const onTogglePermission = (targetKey: keyof EmployeePermissions) => {
    // Fallback to default schema if state is currently undefined
    const currentPermissions = settings.empPermissions || {
      canAccessHistory: true,
      canAccessClients: true,
      canAccessSales: false,
      canAccessSettings: false,
      canAccessInventory: false
    };
    
    setSettings({
      ...settings,
      empPermissions: {
        ...currentPermissions,
        [targetKey]: !currentPermissions[targetKey]
      }
    });
  };

  // Human-readable mapping of available system modules
  const permissionManifest: PermissionSchema[] = [
    { key: 'canAccessHistory', label: 'History & Archive', description: 'Search and retrieve past generated quotations' },
    { key: 'canAccessClients', label: 'Client Directory', description: 'Centralized access to customer contact database' },
    { key: 'canAccessSales', label: 'Financial Reports', description: 'Business intelligence and critical profit metrics' },
    { key: 'canAccessInventory', label: 'Asset Inventory', description: 'Real-time stock master and warehouse syncing' },
    { key: 'canAccessSettings', label: 'System Configuration', description: 'Modify corporate profile and global material rates' },
  ];

  return (
    <div className="space-y-8">
      {/* Identity Header */}
      <header className="border-b border-slate-100 pb-4">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Control (RBAC)</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">Global guarding policies for staff-level accounts</p>
            </div>
         </div>
      </header>

      {/* Role Hierarchy Advisory */}
      <aside className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4 text-amber-900">
         <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-amber-100">
            <Lock size={18} />
         </div>
         <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-tight mb-1">Authorization Context</h4>
            <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-wider">
               THESE POLICY OVERRIDES APPLY ONLY TO THE <span className="text-amber-900 underline font-black">EMPLOYEE</span> ROLE. 
               ADMINISTRATIVE ACCOUNTS REMAIN PERMANENTLY UNRESTRICTED.
            </p>
         </div>
      </aside>

      {/* Permission Toggle Grid */}
      <section className="space-y-3">
        {permissionManifest.map((policy) => {
          const isPermitted = (settings.empPermissions as any)?.[policy.key];
          
          return (
            <div 
              key={policy.key} 
              className={cn(
                "p-5 rounded-3xl border transition-all cursor-pointer group flex items-center justify-between",
                isPermitted 
                  ? "bg-white border-slate-200 shadow-sm hover:border-slate-300" 
                  : "bg-slate-50 border-slate-100 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
              )}
              onClick={() => onTogglePermission(policy.key)}
            >
               <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    isPermitted 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                      : "bg-slate-200 text-slate-500"
                  )}>
                     {isPermitted ? <Unlock size={20} /> : <Lock size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                      {policy.label}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {policy.description}
                    </p>
                  </div>
               </div>
               
               <div className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                 isPermitted 
                   ? "bg-green-50 text-green-600 border-green-200" 
                   : "bg-slate-100 text-slate-400 border-slate-200"
               )}>
                 {isPermitted ? 'Authorized' : 'Restricted'}
               </div>
            </div>
          );
        })}
      </section>

      <footer className="pt-4">
        <button 
          onClick={() => onSave(settings)} 
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Save size={18} /> Consolidate Auth Policies
        </button>
      </footer>
    </div>
  );
};
