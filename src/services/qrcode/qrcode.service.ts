import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { getFileUrl } from '../../config/upload';
import path from 'path';
import fs from 'fs';

export class QRCodeService {
  private qrCodeDir = 'uploads/qrcodes';

  constructor() {
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.qrCodeDir)) {
      fs.mkdirSync(this.qrCodeDir, { recursive: true });
    }
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

      // Generate QR code image
      const fileName = `ticket-${ticketNumber}-${uuidv4()}.png`;
      const filePath = path.join(this.qrCodeDir, fileName);
      
      await QRCode.toFile(filePath, qrData, {
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H',
      });

      const qrCodeUrl = getFileUrl(fileName);
      
      logger.info(`QR code generated for ticket: ${ticketNumber}`);
      
      return {
        qrCodeData: qrData,
        qrCodeUrl,
      };
    } catch (error: any) {
      logger.error(`QR code generation error: ${error.message}`);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateQRCodeForData(data: any): Promise<string> {
    try {
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      const fileName = `qr-${uuidv4()}.png`;
      const filePath = path.join(this.qrCodeDir, fileName);
      
      await QRCode.toFile(filePath, qrData, {
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
        margin: 1,
      });

      return getFileUrl(fileName);
    } catch (error: any) {
      logger.error(`QR code generation error: ${error.message}`);
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
      logger.error(`QR code buffer generation error: ${error.message}`);
      throw error;
    }
  }

  decodeQRCodeData(qrData: string): any {
    try {
      return JSON.parse(qrData);
    } catch (error: any) {
      logger.error(`QR code decoding error: ${error.message}`);
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