import PDFDocument from 'pdfkit';
import fs from 'fs-extra';

/**
 * PDF Generation Service
 * ----------------------
 * Responsible for creating the server-side Proforma Invoice.
 * Uses PDFKit for low-level drawing and precise layout control.
 */

export interface QuotationData {
  id?: string;
  custName: string;
  waNo: string;
  estNo: string;
  date: string;
  items: any[];
  gross: string;
  gstAmt: string;
  grandTotal: string;
  notes?: string;
}

/**
 * Generates a high-fidelity PDF document for a given quotation.
 * 
 * @param quotation - The source data for the invoice
 * @param outputPath - Destination filesystem path
 * @param settings - Global company settings for branding
 */
export const generateQuotationPdf = async (quotation: QuotationData, outputPath: string, settings?: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ 
        size: 'A4',
        margin: 40,
        compress: true, // Explicitly enable compression for smallest possible size
        info: {
          Title: `Quotation_${quotation.estNo}_${quotation.custName}`,
          Author: settings?.company?.name || 'Bhagyoday ERP'
        }
      });

      const writeStream = fs.createWriteStream(outputPath);
      pdf.pipe(writeStream);

      // --- Design Tokens ---
      const BRAND_BLUE = settings?.pdfCfg?.color || '#003DA5';
      const ACCENT_RED = '#C41E3A';
      const UTILITY_GRAY = '#4B5563';

      // --- HEADER SECTION ---
      pdf.rect(0, 0, pdf.page.width, 40).fill(BRAND_BLUE);
      pdf.fillColor('white')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('PROFORMA INVOICE', 0, 15, { align: 'center', characterSpacing: 2 });

      // Company Branding & Logo
      const logoUrl = settings?.company?.logo;
      if (logoUrl) {
        try {
          // Embed logo with explicit width to reduce memory footprint
          pdf.image(logoUrl, 40, 55, { width: 45 });
        } catch (e) {
          console.warn('PDF Generator: Logo parsing failed, falling back to text');
        }
      }

      const textStartX = logoUrl ? 95 : 40;
      pdf.fillColor(BRAND_BLUE).fontSize(18).font('Helvetica-Bold').text(settings?.company?.name || 'BHAGYODAY ROOF INDUSTRIES', textStartX, 60);
      pdf.fillColor(UTILITY_GRAY).fontSize(8).font('Helvetica').text(`${settings?.company?.addr1 || 'GIDC Vapi, Gujarat'} | GSTIN: ${settings?.company?.gst || '24AAPFB3533N1Z7'}`, textStartX, 80);
      
      // Quotation Metadata
      pdf.fillColor(ACCENT_RED).fontSize(10).font('Helvetica-Bold').text('ESTIMATE FOR', 400, 60, { align: 'right' });
      pdf.fillColor('black').fontSize(12).text(quotation.custName, 400, 75, { align: 'right' });
      pdf.fillColor(UTILITY_GRAY).fontSize(9).font('Helvetica').text(`Estimate #: ${quotation.estNo}`, 400, 95, { align: 'right' });
      pdf.text(`Date: ${quotation.date}`, 400, 110, { align: 'right' });

      // --- MATERIAL SPECIFICATIONS BLOCK ---
      pdf.rect(40, 135, 515, 45).lineWidth(0.5).stroke(UTILITY_GRAY);
      pdf.fillColor(ACCENT_RED).fontSize(8).font('Helvetica-Bold').text('DESCRIPTION / MATERIAL DETAIL', 45, 140);
      pdf.fillColor('black').fontSize(9).font('Helvetica').text(quotation.notes || 'As per measurement discussed.', 45, 155, { width: 500 });

      // --- PRODUCT TABLE ---
      const TABLE_Y_START = 200;
      const ROW_HEIGHT = 20;

      // Table Header Row
      pdf.rect(40, TABLE_Y_START, 515, ROW_HEIGHT).fill(ACCENT_RED);
      pdf.fillColor('white').fontSize(8).font('Helvetica-Bold');
      pdf.text('#', 45, TABLE_Y_START + 6);
      pdf.text('PARTICULARS', 65, TABLE_Y_START + 6);
      pdf.text('PC(S)', 300, TABLE_Y_START + 6, { width: 30, align: 'center' });
      pdf.text('QTY', 340, TABLE_Y_START + 6, { width: 50, align: 'center' });
      pdf.text('RATE', 400, TABLE_Y_START + 6, { width: 60, align: 'center' });
      pdf.text('SUBTOTAL', 470, TABLE_Y_START + 6, { width: 80, align: 'right' });

      let currentCursorY = TABLE_Y_START + ROW_HEIGHT;

      quotation.items.forEach((lineItem, index) => {
        pdf.fillColor('black').fontSize(9).font('Helvetica');
        
        // Zebra Striping for readability
        if (index % 2 === 1) {
          pdf.rect(40, currentCursorY, 515, ROW_HEIGHT).fill('#F3F4F6');
          pdf.fillColor('black');
        }

        pdf.text((index + 1).toString(), 45, currentCursorY + 6);
        pdf.text(lineItem.name || 'Product Entry', 65, currentCursorY + 6, { width: 230 });
        pdf.text(lineItem.pcs?.toString() || '0', 300, currentCursorY + 6, { width: 30, align: 'center' });
        pdf.text(lineItem.qty?.toString() || '0', 340, currentCursorY + 6, { width: 50, align: 'center' });
        pdf.text(`₹${lineItem.rate || '0'}`, 400, currentCursorY + 6, { width: 60, align: 'center' });
        pdf.fillColor(BRAND_BLUE).font('Helvetica-Bold').text(`₹${(lineItem.total || 0).toLocaleString('en-IN')}`, 470, currentCursorY + 6, { width: 80, align: 'right' });

        currentCursorY += ROW_HEIGHT;
      });

      // --- FINANCIAL SUMMARY ---
      currentCursorY += 15;
      const TOTAL_LABEL_X = 350;
      const TOTAL_VALUE_X = 470;

      // Subtotals
      pdf.fillColor(UTILITY_GRAY).fontSize(10).font('Helvetica').text('Gross Total:', TOTAL_LABEL_X, currentCursorY);
      pdf.fillColor('black').font('Helvetica-Bold').text(`₹${Number(quotation.gross).toLocaleString('en-IN')}`, TOTAL_VALUE_X, currentCursorY, { align: 'right' });

      currentCursorY += 20;
      pdf.fillColor(UTILITY_GRAY).font('Helvetica').text('GST Calculation (18%):', TOTAL_LABEL_X, currentCursorY);
      pdf.fillColor('black').font('Helvetica-Bold').text(`₹${Number(quotation.gstAmt).toLocaleString('en-IN')}`, TOTAL_VALUE_X, currentCursorY, { align: 'right' });

      // Highlighted Grand Total
      currentCursorY += 25;
      pdf.rect(TOTAL_LABEL_X - 5, currentCursorY - 5, 210, 32).fill(ACCENT_RED);
      pdf.fillColor('white').fontSize(12).font('Helvetica-Bold').text('NET PAYABLE:', TOTAL_LABEL_X, currentCursorY + 5);
      pdf.text(`₹${Number(quotation.grandTotal).toLocaleString('en-IN')}`, TOTAL_VALUE_X, currentCursorY + 5, { align: 'right' });

      // --- FOOTER & COMPLIANCE ---
      const FOOTER_Y = 650;
      
      // Bank Details
      pdf.fillColor(ACCENT_RED).fontSize(8).font('Helvetica-Bold').text('BANK DETAILS', 40, FOOTER_Y);
      pdf.fillColor('black').fontSize(8).font('Helvetica').text(settings?.pdfCfg?.bank || 'HDFC Bank, Gunjan Vapi\nA/C: 50200014059221\nIFSC: HDFC0000737', 40, FOOTER_Y + 15, { width: 200 });

      // QR Codes (if available)
      if (settings?.company?.qrCodes?.length > 0) {
        let qrX = 40;
        settings.company.qrCodes.slice(0, 3).forEach((qr: any) => {
          try {
             pdf.image(qr.url, qrX, FOOTER_Y + 45, { width: 40 });
             pdf.fontSize(6).text(qr.label || 'PAY', qrX, FOOTER_Y + 87, { width: 40, align: 'center' });
             qrX += 50;
          } catch(e) {}
        });
      }

      // Terms
      pdf.fillColor(ACCENT_RED).fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS', 300, FOOTER_Y);
      pdf.fillColor('black').fontSize(7).font('Helvetica').text(settings?.pdfCfg?.terms || '1. 50% Advance\n2. Subject to Vapi Jurisdiction', 300, FOOTER_Y + 15, { width: 250 });

      pdf.fillColor(UTILITY_GRAY).fontSize(8).font('Helvetica')
         .text('This is a computer-generated document and does not require a physical signature.', 0, 780, { align: 'center' });
      
      pdf.fillColor(BRAND_BLUE).fontSize(10).font('Helvetica-Bold')
         .text(settings?.company?.name || 'BHAGYODAY ROOF INDUSTRIES', 0, 800, { align: 'center' });

      pdf.end();

      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', (err) => reject(err));
    } catch (criticalError) {
      reject(criticalError);
    }
  });
};
