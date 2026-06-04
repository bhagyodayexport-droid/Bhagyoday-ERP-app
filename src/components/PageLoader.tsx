import React from 'react';
import { motion } from 'motion/react';

const PageLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <div className="relative">
        {/* Main outer ring */}
        <motion.div 
          className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner pulsing core */}
        <motion.div 
          className="absolute inset-0 m-auto w-6 h-6 bg-slate-900 rounded-lg shadow-lg"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>
      
      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Bhagyoday ERP</p>
        <p className="text-sm font-bold text-slate-800">Synchronizing Module Data...</p>
      </motion.div>
    </div>
  );
};

export default PageLoader;
