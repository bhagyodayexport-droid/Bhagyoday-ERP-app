/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
} from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db } from './lib/firebase';
import { GlobalSettings, Quotation, UserProfile } from './types';
import { cn } from './lib/utils';
import { 
  Plus, 
  Users, 
  History, 
  BarChart3, 
  FileText, 
  LogOut, 
  Crown,
  CircleAlert,
  ShieldCheck,
  Mail,
  Lock,
  Package
} from 'lucide-react';

// --- Lazy Load Components ---
const QuotationForm = React.lazy(() => import('./components/QuotationForm').then(m => ({ default: m.QuotationForm })));
const Preview = React.lazy(() => import('./components/Preview').then(m => ({ default: m.Preview })));
const ClientList = React.lazy(() => import('./components/ClientList').then(m => ({ default: m.ClientList })));
const HistoryList = React.lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const SettingsLayout = React.lazy(() => import('./components/Settings').then(m => ({ default: m.SettingsLayout })));
const SalesAnalytics = React.lazy(() => import('./components/SalesAnalytics').then(m => ({ default: m.SalesAnalytics })));
const InventoryManager = React.lazy(() => import('./components/InventoryManager').then(m => ({ default: m.InventoryManager })));

import PageLoader from './components/PageLoader';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DbService } from './database/dbService';

// --- Components ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalType, setPortalType] = useState<'staff' | 'admin'>('staff');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [success, setSuccess] = useState('');
  const { profile, logout } = useAuth();

  useEffect(() => {
    // If user is logged in but profile doesn't match portal requirements, sign them out
    const checkAccess = async () => {
      if (profile) {
        if (portalType === 'admin' && profile.role !== 'admin') {
          setError('Access Denied: Admin privileges required for this office.');
          await signOut(auth);
        } else if (portalType === 'staff' && !['employee', 'admin'].includes(profile.role)) {
          setError('Access Denied: Invalid credentials for staff portal.');
          await signOut(auth);
        }
      }
    };
    checkAccess();
  }, [profile, portalType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'forgot') {
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset link sent! Check your email.');
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
          setError('No account found with this email.');
        } else {
          setError(err.message || 'Failed to send reset email.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (mode === 'register') {
        if (portalType === 'admin') {
          throw new Error('Admin registration is restricted to backend only.');
        }
        
        // Employee Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const employeeProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName,
          role: 'employee',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'users', user.uid), employeeProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // After sign in, the useEffect will check the profile role
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Try logging in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Check your email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#f8fafc] font-sans">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col md:flex-row min-h-[600px]">
        <section className="bg-slate-900 p-16 text-white md:w-5/12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl shadow-lg">B</div>
               <div className="h-8 w-[1px] bg-white/20"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Quotation Hub</p>
            </div>
            
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight mb-6">
              Bhagyoday<br />
              <span className="text-blue-400">Industries</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-medium">
              Enterprise management portal for high-precision roofing solutions and industrial quotations.
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-6">
             <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Notice for Staff</p>
                <p className="text-xs text-slate-300 leading-relaxed">Please ensure all site measurements are verified before generating final estimates.</p>
             </div>
             <div className="flex items-center gap-3 text-slate-500 uppercase font-black text-[9px] tracking-widest px-2">
                <ShieldCheck size={14} className="text-blue-500" />
                256-bit Encrypted Session
             </div>
          </div>
        </section>
        
        <section className="p-16 md:w-7/12 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            <header className="mb-10">
              <div className="flex p-1 bg-slate-100 rounded-xl mb-8 w-fit">
                <button 
                  onClick={() => { setPortalType('staff'); setMode('login'); }}
                  className={cn(
                    "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    portalType === 'staff' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >Staff Portal</button>
                <button 
                  onClick={() => { setPortalType('admin'); setMode('login'); }}
                  className={cn(
                    "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    portalType === 'admin' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >Admin Office</button>
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                {mode === 'login' ? 'Welcome Back' : mode === 'forgot' ? 'Reset Password' : 'Join Employee Network'}
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Authorized Access Only</p>
            </header>

            <form onSubmit={handleLogin} className="space-y-6">
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@bhagyoday.com"
                    className="w-full pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
                    required
                  />
                </div>
              </div>
              
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
                      required
                    />
                  </div>
                  {mode === 'login' && (
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => setMode('forgot')}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-[10px] font-bold text-green-600 uppercase tracking-tight">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600 uppercase tracking-tight">
                  <CircleAlert size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 mt-4 active:scale-95"
              >
                {loading ? 'Processing...' : 
                  mode === 'login' 
                    ? `Enter ${portalType === 'admin' ? 'Admin Office' : 'Staff Portal'}`
                    : mode === 'forgot'
                      ? 'Send Reset Link'
                      : `Register as Employee`
                }
              </button>

              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              )}

              {portalType === 'staff' && (
                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {mode === 'login' ? 'Create new employee account' : 'Already have an account? Login'}
                  </button>
                </div>
              )}
            </form>

            <footer className="mt-12 pt-8 border-t border-slate-100 text-center">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                 Controlled by Bhagyoday IT Security Team
               </p>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
};

const Header = () => {
  const { profile, logout } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-white font-bold text-xl shadow-sm">B</div>
        <div>
          <h1 className="text-lg font-bold leading-none text-slate-800 uppercase tracking-tight">Bhagyoday Roof Industries</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Cloud Quotation & Sales</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right border-r border-slate-100 pr-4">
          <p className="text-sm font-semibold text-slate-700">{profile?.displayName || profile?.email}</p>
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-tighter">{profile?.role || 'User'}</p>
        </div>
        <button onClick={logout} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('new');
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
  const [editInitialData, setEditInitialData] = useState<Partial<Quotation> | undefined>(undefined);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const { profile, user } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      const s = await DbService.getGlobalSettings();
      if (s) setSettings(s);
    };
    fetchSettings();
  }, []);

  const handleGenerated = (q: Quotation) => {
    setCurrentQuotation(q);
    setActiveTab('preview');
    setEditInitialData(undefined);
  };

  const startNewQuote = (initial?: Partial<Quotation>) => {
    setEditInitialData(initial);
    setActiveTab('new');
  };

  const tabs = [
    { id: 'new', label: '✏️ New', icon: Plus },
    { id: 'clients', label: '👥 Clients', icon: Users, permission: 'canAccessClients' },
    { id: 'history', label: '📋 History', icon: History, permission: 'canAccessHistory' },
    { id: 'preview', label: '📄 Preview', icon: FileText },
    { id: 'sales', label: '📊 Sales', icon: BarChart3, adminOnly: true, permission: 'canAccessSales' },
    { id: 'inventory', label: '📦 Inventory', icon: Package, permission: 'canAccessInventory' },
    { id: 'settings', label: '⚙️ Settings', icon: Crown, adminOnly: true, permission: 'canAccessSettings' },
  ];

  const filteredTabs = tabs.filter(t => {
    if (profile?.role === 'admin') return true;
    
    // Employee logic
    if (t.permission && settings?.empPermissions) {
      return !!(settings.empPermissions as any)[t.permission];
    }
    
    // Default: if marked adminOnly and no specific employee permission was checked/granted above
    if (t.adminOnly) return false;
    
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 flex justify-center shadow-sm">
        <div className="flex gap-1 p-1">
          {filteredTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                if (t.id === 'new' && activeTab !== 'new') setEditInitialData(undefined);
              }}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2",
                activeTab === t.id 
                  ? "text-blue-600 bg-blue-50 border border-blue-100 shadow-sm" 
                  : "text-slate-400 hover:bg-slate-50 border border-transparent"
              )}
            >
              <t.icon size={14} />
              {t.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 pb-24 overflow-y-auto bg-slate-50/30">
        <React.Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            {activeTab === 'new' && (
            <motion.div
              key={editInitialData ? 'edit-' + activeTab : 'new-' + activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <QuotationForm onGenerated={handleGenerated} uid={user?.uid || ''} initialData={editInitialData} />
            </motion.div>
          )}
          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {currentQuotation ? (
                <Preview quotation={currentQuotation} />
              ) : (
                <div className="flex flex-col items-center justify-center p-20 text-[#5a6a9a]">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                    <FileText size={40} className="opacity-10" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-300">Generate a quotation first</p>
                </div>
              )}
            </motion.div>
          )}
          { activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity:0 }} animate={{ opacity:1 }}>
               <InventoryManager />
            </motion.div>
          )}
          {activeTab === 'clients' && (
             <motion.div key="clients" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <ClientList 
                  onNewQuote={(client) => startNewQuote({ custName: client.name, waNo: client.number })} 
                  onShareLast={(q) => { setCurrentQuotation(q); setActiveTab('preview'); }} 
                />
             </motion.div>
          )}
          {activeTab === 'history' && (
             <motion.div key="history" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <HistoryList 
                  onView={(q) => { setCurrentQuotation(q); setActiveTab('preview'); }} 
                  onEdit={(q) => startNewQuote(q)} 
                />
             </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity:0 }} animate={{ opacity:1 }}>
               <SettingsLayout />
            </motion.div>
          )}
          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity:0 }} animate={{ opacity:1 }}>
               <SalesAnalytics />
            </motion.div>
          )}
        </AnimatePresence>
      </React.Suspense>
    </main>

    {/* Bottom Admin Bar */}
    <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 fixed bottom-0 left-0 right-0 z-40">
      <div className="flex items-center gap-2">
        <div className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">SYSTEM ONLINE</div>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">Cloud Sync Active • Firebase Connected</span>
      </div>
      <div className="flex items-center gap-1 group cursor-default">
        <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tighter">{profile?.role || 'User'}</span>
        <span className="text-sm filter drop-shadow-sm">👑</span>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1"></div>
      </div>
    </footer>
  </div>
);
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black tracking-widest uppercase text-slate-400">Loading Workspace</p>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}
