import nodemailer from 'nodemailer';
import { log } from './vite';

/**
 * Notification service for sending alerts via email
 */
class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      log('SMTP configuration incomplete. Email notifications disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    log('Email notification service initialized');
  }

  /**
   * Send email notification for high-priority alerts
   */
  async sendAlertNotification(
    to: string,
    subject: string,
    alertTitle: string,
    alertMessage: string,
    priority: 'high' | 'medium' | 'low'
  ): Promise<boolean> {
    if (!this.transporter) {
      log('Email transporter not configured, skipping notification');
      return false;
    }

    try {
      const priorityColors = {
        high: '#dc3545',
        medium: '#ffc107',
        low: '#28a745'
      };

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${priorityColors[priority]}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">Kaka HQ Alert Notification</h2>
            <span style="font-size: 14px;">Priority: ${priority.toUpperCase()}</span>
          </div>
          <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
            <h3>${alertTitle}</h3>
            <p style="line-height: 1.6;">${alertMessage}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from Kaka HQ Monitoring System.<br>
              Please check the dashboard for more details.
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `[${priority.toUpperCase()}] ${subject}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      log(`Alert notification sent: ${info.messageId}`);
      return true;
    } catch (error) {
      log(`Failed to send alert notification: ${error}`);
      return false;
    }
  }

  /**
   * Send notification for critical alerts to all admin users
   */
  async notifyAdminsOfCriticalAlert(alertTitle: string, alertMessage: string): Promise<void> {
    // In a real implementation, you'd fetch admin emails from database
    // For now, use environment variable
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

    if (adminEmails.length === 0) {
      log('No admin emails configured for critical alert notifications');
      return;
    }

    const subject = 'Critical Alert: Action Required';
    let successCount = 0;

    for (const email of adminEmails) {
      const success = await this.sendAlertNotification(
        email.trim(),
        subject,
        alertTitle,
        alertMessage,
        'high'
      );
      if (success) successCount++;
    }

    log(`Critical alert notification sent to ${successCount}/${adminEmails.length} admins`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();