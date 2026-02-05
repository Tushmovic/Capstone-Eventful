import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@eventful.com';
const FROM_NAME = process.env.FROM_NAME || 'Eventful';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error: Error | null) => { // ADDED TYPE ANNOTATION
      if (error) {
        logger.error(`SMTP connection error: ${error.message}`); // CHANGED error to error.message
      } else {
        logger.info('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error: any) {
      logger.error(`Email sending error: ${error.message}`);
      return false;
    }
  }

  async sendEventReminder(
    to: string,
    eventName: string,
    eventDate: Date,
    eventLocation: string,
    ticketId: string
  ): Promise<boolean> {
    const subject = `Reminder: ${eventName} is coming up!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Event Reminder 🎉</h2>
        <p>Hello,</p>
        <p>This is a reminder for the event:</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${eventName}</h3>
          <p><strong>Date:</strong> ${eventDate.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${eventDate.toLocaleTimeString()}</p>
          <p><strong>Location:</strong> ${eventLocation}</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
        </div>
        <p>Don't forget to bring your QR code for entry!</p>
        <p>Best regards,<br>The Eventful Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendTicketConfirmation(
    to: string,
    eventName: string,
    ticketId: string,
    qrCodeUrl: string
  ): Promise<boolean> {
    const subject = `Ticket Confirmation: ${eventName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Ticket Confirmation ✅</h2>
        <p>Hello,</p>
        <p>Your ticket purchase for <strong>${eventName}</strong> has been confirmed!</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>QR Code:</strong></p>
          <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px;">
        </div>
        <p>Please present this QR code at the event entrance.</p>
        <p>Best regards,<br>The Eventful Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();