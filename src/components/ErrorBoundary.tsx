import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UI ERROR:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white border border-red-100 rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              The application encountered an unexpected state. This has been logged for our engineers.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Trace</p>
               <p className="text-[11px] font-mono text-red-600 break-all">{this.state.error?.message || 'Unknown Runtime Error'}</p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
            >
              <RotateCcw size={16} />
              Reboot Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
