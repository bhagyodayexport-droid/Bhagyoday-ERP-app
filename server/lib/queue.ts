import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs-extra';
import { getAdminDb, initAdmin } from './firebaseAdmin';
import { generateQuotationPdf, QuotationData } from '../services/pdfService';
import { uploadMedia, sendDocumentMessage } from '../services/whatsappService';
import logger from './logger';

/**
 * Background Task Queue (BullMQ)
 * ------------------------------
 * Manages asynchronous jobs like printing PDFs and sending WhatsApp messages.
 * 
 * DESIGN RATIONALE:
 * We use a "Graceful Fallback" strategy. If Redis is unavailable or unconfigured,
 * the application continues to function in synchronous mode rather than crashing.
 */

const rawUrl = process.env.REDIS_URL || '';
// Sanitize: extract only the actual URL part
// 1. Decode potential URL encoding (like %20 for spaces)
// 2. Extract anything starting with redis:// or rediss://
// 3. Remove any trailing flags often found in copy-pasted CLI commands
const decodedUrl = decodeURIComponent(rawUrl);
const match = decodedUrl.match(/(rediss?:\/\/[^\s"'() ]+)/);
let sanitizedUrl = match ? match[1] : decodedUrl.trim();

// Remove accidental trailing punctuation (., );) often picked up from sentences or markdown
sanitizedUrl = sanitizedUrl.replace(/[.,);!]+$/, "");

const REDIS_URL = sanitizedUrl;
// Only attempt to use Redis if we have a valid non-local connection string and it doesn't look like a placeholder
const containsPlaceholder = REDIS_URL.includes('...') || REDIS_URL.includes('<') || REDIS_URL.includes('PASSWORD');
const SHOULD_USE_REDIS = !!REDIS_URL && 
                         !REDIS_URL.includes('localhost') && 
                         !REDIS_URL.includes('127.0.0.1') && 
                         !containsPlaceholder;

export let isRedisConnected = false;

// Initialize Redis Client with lazy-loading
// If SHOULD_USE_REDIS is false, we create a disconnected client that won't spam errors
const redisOptions: any = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 10000, // Keep connection alive (heartbeat)
  reconnectOnError: (err: Error) => {
    const message = err.message || '';
    // Reconnect on connection reset or read-only errors
    if (message.includes('ECONNRESET') || message.includes('READONLY') || message.includes('ETIMEDOUT')) {
      return true;
    }
    return false;
  },
  retryStrategy: (attempt: number) => {
    // If we've explicitly determined we shouldn't use Redis, don't retry at all
    if (!SHOULD_USE_REDIS) return null;
    
    // In production, try up to 3 times with exponential backoff before giving up
    if (attempt > 3) {
      logger.error('❌ Redis: Maximum reconnection attempts reached. Falling back to synchronous processing.');
      return null;
    }
    return Math.min(attempt * 1000, 5000);
  },
  enableOfflineQueue: false,
  connectTimeout: 5000,
};

// Upstash and similar providers require explicit TLS if using rediss://
if (REDIS_URL.startsWith('rediss://')) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const FINAL_REDIS_URL = SHOULD_USE_REDIS ? REDIS_URL : 'redis://127.0.0.1:6379';
export const connection = new IORedis(FINAL_REDIS_URL, redisOptions);

connection.on('connect', () => {
  isRedisConnected = true;
  logger.info('✅ Queue Engine: Redis connection confirmed');
});

connection.on('error', (err) => {
  // Only log loss of connection if we successfully established it earlier
  if (isRedisConnected) {
    logger.warn({ err: err.message }, '⚠️ Queue Engine: Handshake lost');
  }
  isRedisConnected = false;
});

// Explicitly trigger connection only for production-like environments
if (SHOULD_USE_REDIS) {
  logger.info({ REDIS_URL }, 'Queue Engine: Handshaking with remote Redis...');
  connection.connect().catch((err) => {
    isRedisConnected = false;
    logger.info({ err: err.message }, 'ℹ️ Queue Engine: Redis unreachable. Falling back to Inline Processing.');
  });
} else {
  isRedisConnected = false;
}

/**
 * WHATSAPP SENDER ASYNC WORKER
 * ----------------------------
 * Handlers rendering of PDF and subsequent API handshakes.
 */

// 1. Initialize Queue
export const whatsappQueue = SHOULD_USE_REDIS ? new Queue('whatsapp-sender', { connection }) : null;

// 2. Initialize Worker
export const whatsappWorker = SHOULD_USE_REDIS ? new Worker('whatsapp-sender', async (job: Job) => {
  const { quotationData, phoneNumber } = job.data;
  const TEMP_STORAGE = path.join(process.cwd(), 'temp');
  const filename = `Quotation_${quotationData.estNo || Date.now()}.pdf`;
  const fullPath = path.join(TEMP_STORAGE, filename);

  try {
    await fs.ensureDir(TEMP_STORAGE);
    
    // Step A: Fetch Settings for branding
    const db = getAdminDb();
    let settings = null;
    if (db) {
      const settingsDoc = await db.collection('settings').doc('global').get();
      if (settingsDoc.exists) settings = settingsDoc.data();
    }

    // Step B: Draw the PDF
    await generateQuotationPdf(quotationData as QuotationData, fullPath, settings);
    
    // Step C: Upload to Meta Servers
    const mediaId = await uploadMedia(fullPath);
    
    // Step C: Send Document via WASP API
    await sendDocumentMessage(phoneNumber, mediaId, filename);
    
    // Cleanup
    await fs.remove(fullPath);
    
    return { success: true, estNo: quotationData.estNo };
  } catch (error: any) {
    // Ensure we don't leave temporary files behind on failure
    if (await fs.pathExists(fullPath)) await fs.remove(fullPath);
    throw error; 
  }
}, { 
  connection,
  settings: {
    backoffStrategy: (attempts: number) => {
      const retryWindows = [1000, 5000, 30000]; // 1s, 5s, 30s
      return retryWindows[attempts - 1] || 60000;
    }
  }
}) : null;

// Audit Trail for Failed Jobs
if (whatsappWorker) {
  whatsappWorker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[QUEUE CRITICAL] Job failed to complete');
    
    if (job) {
      const db = getAdminDb();
      const admin = initAdmin();
      
      if (db && admin) {
        try {
          // Log failure to Firestore for administrative review
          await db.collection('failedJobs').add({
            jobId: job.id,
            queueName: job.queueName,
            payload: job.data,
            error: err.message,
            occuredAt: admin.firestore.FieldValue.serverTimestamp(),
            service: 'whatsapp_sender'
          });
        } catch (logErr: any) {
          logger.error({ logErr: logErr.message }, 'Audit Trail: Failed to record job failure in Firestore');
        }
      }
    }
  });
}
