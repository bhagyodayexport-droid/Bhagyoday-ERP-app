import { Router } from 'express';
import { sendQuotation, getJobStatus } from '../controllers/whatsappController';

/**
 * WhatsApp Bridge Routes
 * ----------------------
 * Handles the asynchronous dispatch and status tracking for WhatsApp messages.
 */

const router = Router();

/**
 * Route: POST /api/whatsapp/send-quotation
 * Initiates a background job to build and send a PDF quotation via WhatsApp.
 */
router.post('/send-quotation', sendQuotation);

/**
 * Route: GET /api/whatsapp/status/:jobId
 * Retrieves the current processing status of a specific message job.
 */
router.get('/status/:jobId', getJobStatus);

export default router;
