import React, { useEffect, useState } from 'react';
import { Quotation, GlobalSettings } from '../types';
import { Share2, Download, Printer, CheckCircle2, Phone, Mail, FileText, RefreshCcw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

import { apiClient } from '../lib/apiClient';
import { sendWhatsAppPdf } from '../lib/whatsapp';

interface PreviewProps {
  quotation: Quotation;
}

export const Preview: React.FC<PreviewProps> = ({ quotation }) => {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) setSettings(snap.data() as GlobalSettings);
    };
    fetch();
  }, []);

  const handleWhatsAppPdf = async () => {
    if (sendingWhatsApp) return;
    setSendingWhatsApp(true);

    try {
      const result = await sendWhatsAppPdf(quotation);
      if (result.success) {
        alert('Quotation PDF sent successfully via WhatsApp!');
      } else {
        throw new Error(result.message || 'Failed to send WhatsApp');
      }
    } catch (error: any) {
      alert('Failed to send PDF via WhatsApp. Please check console.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleWhatsAppText = async () => {
    // 1. WhatsApp Redirection (Legacy Text Flow)
    const products = quotation.items.map(it => `* ${it.name}  — ${it.pcs} pcs`).join('\n');
    
    const msg = `🏛️ *${settings?.company.name || 'BHAGYODAY ROOF INDUSTRIES'}*
${settings?.company.addr1 || ''}
📞 ${settings?.company.phone || ''}
━━━━━━━━━━━━━━━━━━

Dear *${quotation.custName}*,

Greetings from *${settings?.company.name || 'BHAGYODAY ROOF INDUSTRIES'}*!

Your PROFORMA INVOICE is ready:

*Products:*
${products}

📊 *QUOTATION SUMMARY*
━━━━━━━━━━━━━━━━━━
Gross: ₹ ${Number(quotation.gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
GST 18%: ₹ ${Number(quotation.gstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
*Total: ₹ ${Number(quotation.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*
━━━━━━━━━━━━━━━━━━

📎 PDF shared separately. Please confirm.

Thank you!

${settings?.pdfCfg.footerRegards || 'Team Bhagyoday'}
${settings?.company.name || 'BHAGYODAY ROOF INDUSTRIES'}
📞 ${settings?.company.phone || ''}`;

    const encoded = encodeURIComponent(msg);
    const link = `https://wa.me/91${quotation.waNo}?text=${encoded}`;
    window.open(link, '_blank');
  };

  const amtWords = (n: number) => {
    return n.toLocaleString('en-IN') + " Rupees Only";
  };

  const handleDownload = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      const fileName = `${quotation.estNo}_${quotation.custName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;

      // Priority: Server-Side PDF (Small, High Quality, No CSS issues)
      if (quotation.id) {
        try {
          const res = await apiClient.get(`/quotations/${quotation.id}/pdf`, { responseType: 'blob' });
          const url = URL.createObjectURL(res);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        } catch (serverErr) {
          console.warn('Server PDF failed, falling back to client', serverErr);
        }
      }

      // Fallback: Client Side (Only if server fails or quotation not saved)
      const element = document.getElementById('invoiceWrap');
      if (!element) throw new Error('Invoice content not found');

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(fileName);
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      window.print();
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    const element = document.getElementById('invoiceWrap');
    if (!element) {
      window.print();
      return;
    }

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('invoiceWrap');
          if (el) {
            el.style.boxShadow = 'none';
            el.style.border = 'none';
            el.style.margin = '0';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.setProperties({
        title: `Quotation_${quotation.estNo}_${quotation.custName}_${quotation.date}`
      });

      // Open print dialog directly if possible
      window.open(pdf.output('bloburl'), '_blank');
    } catch (error) {
      console.error('Reliable Print Error:', error);
      window.print();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-xl flex items-center justify-between shadow-lg shadow-slate-200 no-print">
        <div className="flex items-center gap-4">
          <CheckCircle2 size={24} className="text-blue-500" />
          <div>
            <h4 className="font-bold text-sm leading-none uppercase tracking-tight">Quotation Ready</h4>
            <p className="text-slate-400 text-[10px] mt-1 font-medium tracking-wide uppercase">Estimate #{quotation.estNo} • {quotation.custName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={generating}
            onClick={handleDownload}
            className={cn(
              "px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors flex items-center gap-2",
              generating && "opacity-50 pointer-events-none"
            )}
          >
            {generating ? <RefreshCcw size={12} className="animate-spin" /> : <Download size={12} />}
            {generating ? 'GENERATING...' : 'DOWNLOAD PDF'}
          </button>
          <button 
             onClick={handlePrint}
             className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
          >
            PRINT PREVIEW
          </button>
        </div>
      </div>

      {/* Main Invoice Preview */}
      <div id="invoiceWrap" className="bg-white shadow-2xl overflow-hidden border border-gray-100 font-sans print:shadow-none print:border-none" style={{ minHeight: '1123px' }}>
        
        {/* Top Header Bar */}
        <div className="p-8 pb-4 flex justify-between items-start">
           <div className="flex gap-4">
             {/* Logo */}
             {settings?.company.logo ? (
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden border border-slate-100 p-2">
                   <img src={settings.company.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
             ) : (
                <div className="w-16 h-16 bg-[#003DA5] rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                   <div className="relative">
                     <div className="w-8 h-6 bg-orange-400 rounded-sm"></div>
                     <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[8px] border-b-orange-600"></div>
                   </div>
                </div>
             )}
             <div>
               <h2 className="text-2xl font-black text-[#003DA5] tracking-tight leading-none uppercase mb-2">
                 {settings?.company.name || 'BHAGYODAY ROOF INDUSTRIES'}
               </h2>
               <div className="text-[10px] font-bold text-gray-600 space-y-0.5">
                 <p>GSTIN: {settings?.company.gst || '24AAPFB3533N1Z7'} | State: {settings?.company.state || '24-Gujarat'}</p>
                 <p>{settings?.company.addr1 || 'Plot No.146/2, GIDC, Vapi-396195, Gujarat'}</p>
                 <p>UDYAM: {settings?.company.udyam || 'UDYAM-GJ-25-0036721'} | {settings?.company.email || 'bhagyodaysteel@rediffmail.com'}</p>
               </div>
             </div>
           </div>
           <div className="flex flex-col items-end gap-1 text-[10px] font-bold">
              <div className="flex items-center gap-2 text-[#C41E3A]">
                <Phone size={12} className="fill-[#C41E3A] text-white" />
                <span>{settings?.company.phone || '9712955388'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#003DA5]">
                <Mail size={12} className="fill-[#003DA5] text-white" />
                <span>{settings?.company.email || 'bhagyodaysteel@rediffmail.com'}</span>
              </div>
           </div>
        </div>

        {/* Proforma Invoice Title */}
        <div className="mx-8 bg-[#EEF4FF] py-2 flex justify-center border-y-2 border-[#003DA5]">
           <h1 className="text-xl font-black text-[#003DA5] tracking-[0.5em] uppercase">PROFORMA INVOICE</h1>
        </div>

        {/* Meta Info Section */}
        <div className="p-8 grid grid-cols-2 gap-10">
           <div>
              <p className="text-[11px] font-black text-[#C41E3A] uppercase mb-1">ESTIMATE FOR</p>
              <h4 className="text-lg font-black text-[#003DA5] leading-none mb-2">{quotation.custName}</h4>
              <p className="text-[11px] font-black text-gray-900 flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 flex items-center justify-center rounded">📱</span>
                <span className="font-black">+91 {quotation.waNo}</span>
              </p>
           </div>
           <div className="flex flex-col items-end">
              <div className="w-full max-w-[200px] space-y-1">
                <div className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100">
                  <span className="font-bold text-gray-500 uppercase tracking-tighter">Estimate No.</span>
                  <span className="font-black text-[#003DA5] uppercase">#{quotation.estNo}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100">
                  <span className="font-bold text-gray-500 uppercase tracking-tighter">Date</span>
                  <span className="font-black text-[#003DA5] uppercase">{quotation.date}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100">
                  <span className="font-bold text-gray-500 uppercase tracking-tighter">Place of Supply</span>
                  <span className="font-black text-[#003DA5] uppercase">{settings?.company.state || '24-Gujarat'}</span>
                </div>
              </div>
           </div>
        </div>

        {/* Description Section */}
        <div className="mx-8 mb-4 border-2 border-gray-200 rounded-lg">
           <div className="bg-gray-50 p-2 border-b-2 border-gray-200 flex items-center gap-2">
              <FileText size={14} className="text-[#C41E3A]" />
              <span className="text-[11px] font-black text-[#C41E3A] uppercase tracking-widest">DESCRIPTION / MATERIAL DETAIL</span>
           </div>
           <div className="p-3 min-h-[40px] text-xs text-gray-900 font-extrabold leading-relaxed uppercase whitespace-pre-wrap">
              {quotation.notes || '—'}
           </div>
        </div>

        {/* Table Content */}
        <div className="px-8 overflow-hidden">
           <table className="w-full border-collapse">
              <thead>
                 <tr className="bg-[#C41E3A] text-white text-[10px] font-black uppercase">
                    <th className="p-2 border border-[#ffffff33] text-center w-8">#</th>
                    <th className="p-2 border border-[#ffffff33] text-left">ITEM NAME</th>
                    <th className="p-2 border border-[#ffffff33] text-center">HSN/SAC</th>
                    <th className="p-2 border border-[#ffffff33] text-center">LENGTH</th>
                    <th className="p-2 border border-[#ffffff33] text-center">WIDTH</th>
                    <th className="p-2 border border-[#ffffff33] text-center">PCS</th>
                    <th className="p-2 border border-[#ffffff33] text-center">QTY</th>
                    <th className="p-2 border border-[#ffffff33] text-center">UNIT</th>
                    <th className="p-2 border border-[#ffffff33] text-center">RATE</th>
                    <th className="p-2 border border-[#ffffff33] text-right">AMOUNT</th>
                 </tr>
              </thead>
              <tbody className="text-[11px] font-bold text-gray-800">
                 {quotation.items.map((item, i) => {
                    const isNewGroup = i === 0 || (
                       quotation.items[i-1].name !== item.name || 
                       quotation.items[i-1].make !== item.make || 
                       quotation.items[i-1].colour !== item.colour
                    );
                    
                    return (
                      <tr key={`${i}-${item.name}`} className={cn(isNewGroup ? "border-t-2 border-gray-300" : "border-t border-gray-100")}>
                         <td className="p-2 border border-gray-200 text-center">{i+1}</td>
                         <td className={cn(
                            "p-2 border border-gray-200 uppercase",
                            !isNewGroup && "text-gray-300 font-medium"
                         )}>
                            {isNewGroup ? (
                               <div>
                                  <div className="font-black">{item.name}</div>
                                  {(item.make || item.colour) && (
                                     <div className="text-[10px] font-bold text-gray-600 mt-0.5">
                                        {[item.make, item.colour].filter(Boolean).join(' | ')}
                                     </div>
                                  )}
                               </div>
                            ) : (
                               "↳ (Same Product)"
                            )}
                         </td>
                         <td className="p-2 border border-gray-200 text-center">{item.hsn || '8419'}</td>
                         <td className="p-2 border border-gray-200 text-center font-mono">
                            {item.len || '—'} <span className="text-[7px] text-gray-400">{item.lenUnit || 'RFT'}</span>
                         </td>
                         <td className="p-2 border border-gray-200 text-center font-mono">
                            {item.wid || '—'} <span className="text-[7px] text-gray-400">{item.widUnit || 'RFT'}</span>
                         </td>
                         <td className="p-2 border border-gray-200 text-center">{item.pcs}</td>
                         <td className="p-2 border border-gray-200 text-center">{item.qty}</td>
                         <td className="p-2 border border-gray-200 text-center">{item.unit || item.rUnit}</td>
                         <td className="p-2 border border-gray-200 text-center">₹{item.convertedRate || item.rate}</td>
                         <td className="p-2 border border-gray-200 text-right text-[#003DA5]">₹ {(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                 })}
                 <tr className="bg-gray-50">
                    <td colSpan={6} className="p-2 border border-gray-200 text-xs font-black">Total</td>
                    <td className="p-2 border border-gray-200 text-center font-black">{quotation.items.reduce((acc, it) => acc + (it.qty || 0), 0).toFixed(2)}</td>
                    <td className="border border-gray-200"></td>
                    <td className="border border-gray-200"></td>
                    <td className="p-2 border border-gray-200 text-right font-black text-[#003DA5]">₹ {Number(quotation.gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
              </tbody>
           </table>

           <div className="mt-4 flex justify-end">
              <table className="w-72 border-collapse text-xs font-bold text-gray-600">
                 <tbody>
                    <tr>
                       <td className="p-2 border border-gray-200 bg-gray-50">Sub Total</td>
                       <td className="p-2 border border-gray-200 text-right text-gray-900 font-extrabold">₹ {Number(quotation.gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                       <td className="p-2 border border-gray-200 bg-gray-50">Loading Charges</td>
                       <td className="p-2 border border-gray-200 text-right text-green-600 font-extrabold">FREE</td>
                    </tr>
                    <tr>
                       <td className="p-2 border border-gray-200 bg-gray-50">Freight Charges</td>
                       <td className="p-2 border border-gray-200 text-right text-amber-500 font-extrabold uppercase">EXTRA</td>
                    </tr>
                    <tr>
                       <td className="p-2 border border-gray-200 bg-gray-50">GST @ 18%</td>
                       <td className="p-2 border border-gray-200 text-right text-gray-900 font-extrabold">₹ {Number(quotation.gstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-[#C41E3A] text-white">
                       <td className="p-2 border border-[#C41E3A] uppercase font-black">Total</td>
                       <td className="p-2 border border-[#C41E3A] text-right font-black text-lg">₹ {Number(quotation.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>

        {/* Amount in words */}
        <div className="mx-8 mt-4 border border-gray-200 rounded-lg overflow-hidden">
           <div className="bg-[#EEF4FF] p-2">
              <p className="text-[10px] font-black text-[#C41E3A] uppercase">AMOUNT IN WORDS</p>
           </div>
           <div className="p-2 text-xs font-bold text-gray-700">
              {amtWords(Number(quotation.grandTotal))}
           </div>
        </div>


        {/* Bank & Terms */}
        <div className="p-8 grid grid-cols-2 gap-10">
           <div>
              <p className="text-[11px] font-black text-[#C41E3A] uppercase border-b-2 border-[#C41E3A] inline-block mb-3">BANK DETAILS</p>
              <div className="text-[10px] font-bold text-gray-600 space-y-1 uppercase leading-relaxed whitespace-pre-wrap">
                 {settings?.pdfCfg.bank || 'BHAGYODAY ROOF INDUSTRIES\nA/C No: 50200014059221\nIFSC: HDFC0000737\nHDFC BANK, GUNJAN, VAPI'}
              </div>
              
              {/* Display Multiple QR Codes if available, fallback to legacy qrCode */}
              <div className="mt-8 flex flex-wrap gap-6">
                {(settings?.company.qrCodes && settings.company.qrCodes.length > 0) ? (
                   settings.company.qrCodes.map((qr, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                         <div className="p-1 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <img src={qr.url} alt={qr.label} className="w-16 h-16 object-contain" />
                         </div>
                         <p className="text-[7px] font-black text-slate-400 uppercase leading-none tracking-widest">{qr.label}</p>
                      </div>
                   ))
                ) : settings?.company.qrCode ? (
                  <div className="flex items-center gap-4">
                    <div className="p-2 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <img src={settings.company.qrCode} alt="QR" className="w-20 h-20 object-contain" />
                    </div>
                    <div className="max-w-[100px]">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-tight tracking-widest">Digital Audit / Payment</p>
                    </div>
                  </div>
                ) : null}
              </div>
           </div>
           <div>
              <p className="text-[11px] font-black text-[#C41E3A] uppercase border-b-2 border-[#C41E3A] inline-block mb-3">TERMS & CONDITIONS</p>
              <div className="text-[10px] font-bold text-gray-600 space-y-1 leading-relaxed whitespace-pre-wrap">
                 {settings?.pdfCfg.terms || '1. 50% advance against P.O. — 50% before despatch.'}
              </div>
           </div>
        </div>

        {/* Footer Bar */}
        <div className="mt-auto bg-[#C41E3A] p-4 text-[10px] text-white font-bold flex flex-col items-center gap-2">
           {settings?.pdfCfg.footerRegards && (
             <div className="mb-2 text-sm font-black tracking-widest uppercase py-1 border-y border-[#ffffff33] px-8">
               {settings.pdfCfg.footerRegards}
             </div>
           )}
           <div className="flex items-center gap-4 opacity-80">
              <span>{settings?.pdfCfg.footer || 'Bhagyoday Roof Industries | High performance roofing solutions'}</span>
              <span>📞 {settings?.company.phone || '9712955388'}</span>
           </div>
           {settings?.company.social && (
             <div className="text-[8px] opacity-80 font-black tracking-widest uppercase">
               🌐 {settings.company.social}
             </div>
           )}
           <div className="bg-white text-[#C41E3A] px-2 py-0.5 rounded font-black tracking-widest text-[10px] mt-2">
              BHAGYODAY ORIGINAL
           </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 no-print text-white">
         <button 
           onClick={handleDownload}
           className="flex-1 min-w-[200px] bg-white border border-slate-200 h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
         >
            <Download size={18} className="text-slate-400" />
            DOWNLOAD PDF
         </button>
         <button 
           disabled={sendingWhatsApp}
           onClick={handleWhatsAppPdf}
           className={cn(
             "flex-1 min-w-[200px] bg-slate-900 text-white h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200",
             sendingWhatsApp && "opacity-50 pointer-events-none"
           )}
         >
            {sendingWhatsApp ? <RefreshCcw size={18} className="animate-spin text-blue-400" /> : <Share2 size={18} className="text-blue-400" />}
            {sendingWhatsApp ? 'SENDING PDF...' : 'WHATSAPP PDF (ClOUD API)'}
         </button>
         <button 
           onClick={handleWhatsAppText}
           className="flex-1 min-w-[200px] bg-green-600 text-white h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-sm hover:bg-green-700 transition-all shadow-xl shadow-green-100"
         >
            <Share2 size={18} className="text-white" />
            WHATSAPP TEXT (DIRECT)
         </button>
         <button 
           onClick={handlePrint}
           className="w-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
         >
            <Printer size={20} />
         </button>
      </div>
    </div>
  );
};

