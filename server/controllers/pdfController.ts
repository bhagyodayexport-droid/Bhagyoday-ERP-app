import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { getAdminDb } from '../lib/firebaseAdmin';
import { generateQuotationPdf, QuotationData } from '../services/pdfService';
import logger from '../lib/logger';

export const downloadQuotationPdf = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tempDir = path.join(process.cwd(), 'temp');
  const filePath = path.join(tempDir, `Quotation_${id}.pdf`);

  try {
    const db = getAdminDb();
    if (!db) {
       throw new Error('Database connection failed');
    }

    const snap = await db.collection('quotations').doc(id).get();

    // Also fetch global settings for branding
    const settingsSnap = await db.collection('settings').doc('global').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : null;

    if (!snap.exists) {
       return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const data = snap.data() as QuotationData;

    await fs.ensureDir(tempDir);
    await generateQuotationPdf(data, filePath, settings);

    res.download(filePath, `Quotation_${data.estNo || id}.pdf`, async (err) => {
      if (err) logger.error({ err }, 'PDF Download Error');
      await fs.remove(filePath);
    });

  } catch (error: unknown) {
    const err = error as Error;
    logger.error({ err: err.message }, 'Server PDF Generation Failed');
    res.status(500).json({ success: false, error: err.message });
  }
};
