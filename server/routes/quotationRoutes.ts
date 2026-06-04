import { Router } from 'express';
import { downloadQuotationPdf } from '../controllers/pdfController';

/**
 * Quotation Asset Routes
 * ----------------------
 * Manages access to generated assets (PDFs, exports) for quotations.
 */

const router = Router();

/**
 * Route: GET /api/v1/quotations/:id/pdf
 * Dynamically generates and downloads the PDF version of a quotation.
 */
router.get('/:id/pdf', downloadQuotationPdf);

export default router;
