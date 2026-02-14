import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export class QRCodeService {
  constructor() {
    // Log Cloudinary config (without exposing secrets)
    logger.info(`✅ Cloudinary configured with cloud name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  }

  async generateTicketQRCode(ticketNumber: string, ticketId: string): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
    try {
      // Create QR code data
      const verificationUrl = `${process.env.API_BASE_URL}/api/v1/tickets/verify/${ticketNumber}`;
      const qrData = JSON.stringify({
        ticketId,
        ticketNumber,
        verificationUrl,
        timestamp: new Date().toISOString(),
      });

      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H',
      });

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: `ticket-${ticketNumber}-${uuidv4()}`,
            folder: 'eventful/qrcodes',
            format: 'png',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              logger.error(`❌ Cloudinary upload error: ${error.message}`);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Create readable stream from buffer and pipe to uploadStream
        const readableStream = new Readable();
        readableStream.push(qrBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });

      const qrCodeUrl = (result as any).secure_url;
      
      logger.info(`✅ QR code generated and uploaded to Cloudinary for ticket: ${ticketNumber}`);
      logger.info(`✅ QR code URL: ${qrCodeUrl}`);
      
      return {
        qrCodeData: qrData,
        qrCodeUrl,
      };
    } catch (error: any) {
      logger.error(`❌ QR code generation error: ${error.message}`);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateQRCodeForData(data: any): Promise<string> {
    try {
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
        margin: 1,
      });

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: `qr-${uuidv4()}`,
            folder: 'eventful/misc',
            format: 'png',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        const readableStream = new Readable();
        readableStream.push(qrBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });

      return (result as any).secure_url;
    } catch (error: any) {
      logger.error(`❌ QR code generation error: ${error.message}`);
      throw error;
    }
  }

  async generateQRCodeBuffer(data: any): Promise<Buffer> {
    try {
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      const buffer = await QRCode.toBuffer(qrData, {
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H',
      });

      return buffer;
    } catch (error: any) {
      logger.error(`❌ QR code buffer generation error: ${error.message}`);
      throw error;
    }
  }

  decodeQRCodeData(qrData: string): any {
    try {
      return JSON.parse(qrData);
    } catch (error: any) {
      logger.error(`❌ QR code decoding error: ${error.message}`);
      throw new Error('Invalid QR code data');
    }
  }

  generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }
}

export const qrCodeService = new QRCodeService();