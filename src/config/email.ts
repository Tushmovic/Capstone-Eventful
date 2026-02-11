import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587'); // Changed from 465 to 587
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Eventful';

// Check if we have valid credentials
const hasValidCredentials = (): boolean => {
  return !!(SMTP_USER && SMTP_PASS && SMTP_USER.includes('@') && SMTP_PASS.length > 0);
};

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private useFallback: boolean;

  constructor() {
    this.useFallback = !hasValidCredentials();
    
    if (this.useFallback) {
      logger.warn('⚠️ Email: Using FALLBACK mode (no real emails)');
      logger.info('📧 To enable real emails, update SMTP_USER and SMTP_PASS in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // Changed from SMTP_PORT === 465 to false for Gmail with port 587
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false // Helps with Gmail connection issues
        }
      });

      logger.info('✅ Email service initialized with Gmail');
    } catch (error: any) {
      logger.error(`❌ Email init error: ${error.message}`);
      this.useFallback = true;
    }
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    // FALLBACK MODE
    if (this.useFallback || !this.transporter) {
      logger.info('📧 [EMAIL PREVIEW - FALLBACK MODE]');
      logger.info(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Content preview: ${html.substring(0, 150)}...`);
      logger.info('✅ Email logged (not sent - fallback mode)');
      return true;
    }

    // REAL MODE
    try {
      const mailOptions = {
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`✅ Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
      logger.info(`📧 Message ID: ${info.messageId}`);
      
      return true;
    } catch (error: any) {
      logger.error(`❌ Email sending error: ${error.message}`);
      
      // If it's an auth error, provide helpful message
      if (error.message.includes('Application-specific password required')) {
        logger.error('🔐 Gmail requires an App Password. Generate one at:');
        logger.error('   https://myaccount.google.com/apppasswords');
      }
      
      // Switch to fallback mode for next attempts
      this.useFallback = true;
      
      // Retry in fallback mode
      return this.sendEmail(to, subject, html, text);
    }
  }

  async sendEventReminder(
    to: string,
    eventName: string,
    eventDate: Date,
    eventLocation: string,
    ticketId: string
  ): Promise<boolean> {
    const subject = `🔔 Reminder: ${eventName} is coming up!`;
    const html = this.getReminderEmailTemplate(eventName, eventDate, eventLocation, ticketId);
    return this.sendEmail(to, subject, html);
  }

  async sendTicketConfirmation(
    to: string,
    eventName: string,
    ticketId: string,
    qrCodeUrl: string
  ): Promise<boolean> {
    const subject = `✅ Ticket Confirmed: ${eventName}`;
    const html = this.getTicketConfirmationTemplate(eventName, ticketId, qrCodeUrl);
    return this.sendEmail(to, subject, html);
  }

  private getReminderEmailTemplate(
    eventName: string,
    eventDate: Date,
    eventLocation: string,
    ticketId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; margin: 0;">🎭 Eventful</h1>
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">⏰ Event Reminder</h2>
        </div>
        <div style="padding: 20px;">
          <h3 style="color: #333; margin-top: 0;">${eventName}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>📅 Date:</strong> ${eventDate.toLocaleDateString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>⏰ Time:</strong> ${eventDate.toLocaleTimeString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>📍 Location:</strong> ${eventLocation}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px;">
                <strong>🎫 Ticket ID:</strong> ${ticketId}
              </td>
            </tr>
          </table>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              <strong>📱 Don't forget to bring your QR code!</strong><br>
              Your ticket QR code is available in your account dashboard.
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Eventful. All rights reserved.</p>
          <p>This is an automated reminder, please do not reply to this email.</p>
        </div>
      </div>
    `;
  }

  private getTicketConfirmationTemplate(
    eventName: string,
    ticketId: string,
    qrCodeUrl: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; margin: 0;">🎭 Eventful</h1>
        </div>
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; border-radius: 10px; color: white; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">🎉 Purchase Successful!</h2>
        </div>
        <div style="padding: 20px;">
          <h3 style="color: #333; margin-top: 0;">${eventName}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>🎫 Ticket ID:</strong> ${ticketId}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>📅 Purchase Date:</strong> ${new Date().toLocaleDateString()}
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <h4 style="color: #333;">Your QR Code</h4>
            <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px; border: 1px solid #eee; padding: 10px; border-radius: 10px;">
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
              Present this QR code at the event entrance for scanning
            </p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Eventful. All rights reserved.</p>
          <p>Need help? Contact support@eventful.com</p>
        </div>
      </div>
    `;
  }
}

// Always export a working email service
let emailService: EmailService;

try {
  emailService = new EmailService();
} catch (error) {
  logger.warn('⚠️ Email service falling back to console mode');
  emailService = new EmailService(); // Will use fallback mode internally
}

export { emailService };