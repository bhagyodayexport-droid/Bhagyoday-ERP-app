import { Request, Response } from 'express';
import { whatsappQueue, isRedisConnected } from '../lib/queue';
import path from 'path';
import fs from 'fs-extra';
import { getAdminDb } from '../lib/firebaseAdmin';
import { generateQuotationPdf, QuotationData } from '../services/pdfService';
import { uploadMedia, sendDocumentMessage } from '../services/whatsappService';

export const sendQuotation = async (req: Request, res: Response) => {
  const { quotationData, phoneNumber } = req.body;

  // FALLBACK: If Redis is not connected or queue is not initialized, process synchronously
  if (!isRedisConnected || !whatsappQueue) {
    console.warn('⚠️ Queue unavailable. Processing WhatsApp send synchronously...');
    // ... rest of sync logic
    const tempDir = path.join(process.cwd(), 'temp');
    const fileName = `Quotation_${quotationData.estNo || Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    try {
      await fs.ensureDir(tempDir);
      
      // Fetch settings for branding
      const db = getAdminDb();
      let settings = null;
      if (db) {
        const settingsDoc = await db.collection('settings').doc('global').get();
        if (settingsDoc.exists) settings = settingsDoc.data();
      }

      await generateQuotationPdf(quotationData as QuotationData, filePath, settings);
      const mediaId = await uploadMedia(filePath);
      await sendDocumentMessage(phoneNumber, mediaId, fileName);
      await fs.remove(filePath);

      return res.status(200).json({
        success: true,
        message: 'Quotation sent successfully (Sync Fallback)',
        sync: true
      });
    } catch (error: any) {
      if (await fs.pathExists(filePath)) await fs.remove(filePath);
      return res.status(500).json({
        success: false,
        message: 'Failed to send quotation (Sync Fallback)',
        error: error.message
      });
    }
  }

  try {
    // Standard Async Queue Path
    const job = await whatsappQueue.add('send-pdf', 
      { quotationData, phoneNumber },
      { 
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true
      }
    );

    res.status(202).json({
      success: true,
      message: 'Quotation delivery queued',
      jobId: job.id
    });
  } catch (error: any) {
    console.error('Queue Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to queue quotation delivery',
      error: error.message
    });
  }
};

export const getJobStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  if (!whatsappQueue) {
    return res.status(200).json({ success: true, status: 'unknown', message: 'Queue is disabled' });
  }

  try {
    const job = await whatsappQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const state = await job.getState();
    res.status(200).json({
      success: true,
      status: state
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
