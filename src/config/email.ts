import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Load directly from process.env
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Eventful';

// Simple check - are credentials present?
const hasCredentials = SMTP_USER.length > 0 && SMTP_PASS.length > 0;

if (hasCredentials) {
  logger.info(`✅ Email credentials found for: ${SMTP_USER}`);
} else {
  logger.warn('⚠️ No email credentials found - using console preview mode');
}

// Create transporter only if credentials exist
const transporter = hasCredentials ? nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  connectionTimeout: 10000, // Added timeout
  socketTimeout: 10000, // Added timeout
  tls: {
    rejectUnauthorized: false,
    // Force IPv4 by specifying ciphers
    ciphers: 'DEFAULT@SECLEVEL=1'
  }
}) : null;

// Verify connection if transporter exists
if (transporter) {
  transporter.verify((error) => {
    if (error) {
      logger.error(`❌ Gmail connection failed: ${error.message}`);
    } else {
      logger.info(`✅ Gmail SMTP ready - emails will be sent from ${SMTP_USER}`);
    }
  });
}

export const emailService = {
  async sendEmail(to: string | string[], subject: string, html: string) {
    // PREVIEW MODE - if no credentials
    if (!transporter) {
      logger.info('📧 [EMAIL PREVIEW]');
      logger.info(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Content preview: ${html.substring(0, 100)}...`);
      logger.info('✅ Email logged (preview mode - no credentials)');
      return true;
    }

    // REAL MODE - send actual email
    try {
      const info = await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html,
      });
      
      logger.info(`✅ Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
      logger.info(`📧 Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to send email: ${error.message}`);
      return false;
    }
  },

  async sendEventReminder(to: string, eventName: string, eventDate: Date, eventLocation: string, ticketId: string) {
    const subject = `🔔 Reminder: ${eventName}`;
    const html = `
      <h2>Event Reminder</h2>
      <p><strong>${eventName}</strong></p>
      <p>📅 ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}</p>
      <p>📍 ${eventLocation}</p>
      <p>🎫 Ticket ID: ${ticketId}</p>
    `;
    return this.sendEmail(to, subject, html);
  },

  async sendTicketConfirmation(to: string, eventName: string, ticketId: string, qrCodeUrl: string) {
    const subject = `✅ Ticket Confirmed: ${eventName}`;
    const html = `
      <h2>Ticket Confirmed!</h2>
      <p><strong>${eventName}</strong></p>
      <p>🎫 Ticket ID: ${ticketId}</p>
      <p>📱 Your QR Code:</p>
      <img src="${qrCodeUrl}" width="200" />
    `;
    return this.sendEmail(to, subject, html);
  }
};