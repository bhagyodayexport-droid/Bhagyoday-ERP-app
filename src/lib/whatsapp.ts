import { Quotation } from '../types';
import { apiClient } from './apiClient';

export const sendWhatsAppPdf = async (quotation: Quotation) => {
  try {
    const result = await apiClient.post('/whatsapp/send-quotation', {
      quotationData: {
        ...quotation,
        date: quotation.date,
        custName: quotation.custName,
        custPhone: quotation.waNo,
        estNo: quotation.estNo,
        items: quotation.items,
        grandTotal: quotation.grandTotal
      },
      phoneNumber: quotation.waNo
    });

    return result;
  } catch (error: any) {
    console.error('WhatsApp Service Error:', error);
    throw error;
  }
};
