import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailProvider, EmailConfig } from '../interface';
import { getActivationEmailTemplate, getPasswordResetEmailTemplate } from '../templates';

export class GoogleWorkspaceSMTPProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) {
        console.warn('Google Workspace SMTP credentials not configured');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // false for 587 (STARTTLS)
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_APP_PASSWORD,
        },
        tls: {
          // Do not fail on invalid certs (for development)
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Google Workspace SMTP configuration error:', error);
        } else {
          console.log('Google Workspace SMTP server is ready to send emails');
        }
      });
    } catch (error) {
      console.error('Failed to initialize Google Workspace SMTP transporter:', error);
    }
  }

  isConfigured(): boolean {
    return (
      this.transporter !== null &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_APP_PASSWORD &&
      !!this.config.fromEmail &&
      !!this.config.fromName
    );
  }

  async sendActivationEmail(
    to: string,
    activationToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        error: 'Email service not properly configured',
      };
    }

    try {
      const activationUrl = `${this.config.baseUrl}/activate?token=${activationToken}`;
      
      const template = getActivationEmailTemplate({
        name: userData.name,
        email: userData.email,
        activationUrl,
        companyName: this.config.companyName,
        companyLogoUrl: this.config.companyLogoUrl,
        supportEmail: this.config.supportEmail,
        baseUrl: this.config.baseUrl,
      });

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: to,
        replyTo: this.config.replyToEmail || this.config.supportEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send activation email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        error: 'Email service not properly configured',
      };
    }

    try {
      const resetUrl = `${this.config.baseUrl}/reset-password?token=${resetToken}`;
      
      const template = getPasswordResetEmailTemplate({
        name: userData.name,
        email: userData.email,
        resetUrl,
        companyName: this.config.companyName,
        companyLogoUrl: this.config.companyLogoUrl,
        supportEmail: this.config.supportEmail,
        baseUrl: this.config.baseUrl,
      });

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: to,
        replyTo: this.config.replyToEmail || this.config.supportEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendWelcomeEmail(
    to: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        error: 'Email service not properly configured',
      };
    }

    try {
      const template = getWelcomeEmailTemplate({
        name: userData.name,
        email: userData.email,
        companyName: this.config.companyName,
        companyLogoUrl: this.config.companyLogoUrl,
        supportEmail: this.config.supportEmail,
        baseUrl: this.config.baseUrl,
      });

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: to,
        replyTo: this.config.replyToEmail || this.config.supportEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Test email configuration
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured() || !this.transporter) {
      return {
        success: false,
        error: 'Email service not properly configured',
      };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}