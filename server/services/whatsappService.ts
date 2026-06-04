import axios from 'axios';
import fs from 'fs-extra';
import FormData from 'form-data';

/**
 * WhatsApp Business API Service
 * ----------------------------
 * Handles communication with Meta's Graph API for WhatsApp.
 * Operations include:
 * 1. Uploading local media files to Meta's servers (generating a media handle).
 * 2. Dispatching document messages using the generated handle.
 */

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BUSINESS_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

/**
 * Uploads a file to WhatsApp Media server.
 * Returns the unique Media ID required for sending message payloads.
 * 
 * @param localPath - Path to the local file to be uploaded
 */
export const uploadMedia = async (localPath: string): Promise<string> => {
  if (!ACCESS_TOKEN || !BUSINESS_PHONE_ID) {
    throw new Error('CONFIG_ERROR: WhatsApp credentials (token/phone_id) are missing in environment.');
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${BUSINESS_PHONE_ID}/media`;
  
  const payload = new FormData();
  payload.append('file', fs.createReadStream(localPath));
  payload.append('type', 'application/pdf');
  payload.append('messaging_product', 'whatsapp');

  try {
    const res = await axios.post(endpoint, payload, {
      headers: {
        ...payload.getHeaders(),
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    return res.data.id;
  } catch (err: any) {
    if (err.response) {
      console.error('[WhatsApp Media Upload Failure]', JSON.stringify(err.response.data));
      throw new Error(`WhatsApp API Error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
};

/**
 * Sends a PDF document to a specific recipient.
 * 
 * @param recipient - The destination phone number
 * @param mediaHandle - The ID returned from the uploadMedia step
 * @param originalFilename - The display name for the document in WhatsApp
 */
export const sendDocumentMessage = async (recipient: string, mediaHandle: string, originalFilename: string): Promise<any> => {
  if (!ACCESS_TOKEN || !BUSINESS_PHONE_ID) {
    throw new Error('CONFIG_ERROR: WhatsApp credentials missing.');
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${BUSINESS_PHONE_ID}/messages`;
  
  // Sanitize: ensure only digits are present
  const targetNumber = recipient.replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: targetNumber,
    type: 'document',
    document: {
      id: mediaHandle,
      filename: originalFilename
    }
  };

  try {
    const res = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (err: any) {
    if (err.response) {
      console.error('[WhatsApp Send Failure]', JSON.stringify(err.response.data));
      throw new Error(`WhatsApp API Error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
};
