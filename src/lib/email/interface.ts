// Email service interface for provider abstraction
export interface EmailProvider {
  sendActivationEmail(
    to: string, 
    activationToken: string, 
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  sendWelcomeEmail?(
    to: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;

  // Health check
  isConfigured(): boolean;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateData {
  name?: string;
  email: string;
  activationUrl?: string;
  resetUrl?: string;
  companyName: string;
  companyLogoUrl?: string;
  supportEmail: string;
  unsubscribeUrl?: string;
}

export type EmailProviderType = 
  | 'google_workspace_smtp'
  | 'google_workspace_api'
  | 'postmark'
  | 'sendgrid'
  | 'aws_ses'
  | 'console'; // For development

export interface EmailConfig {
  provider: EmailProviderType;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  companyName: string;
  companyLogoUrl?: string;
  supportEmail: string;
  baseUrl: string;
}