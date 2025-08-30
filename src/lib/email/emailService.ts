import { EmailProvider, EmailConfig, EmailProviderType } from './interface';
import { GoogleWorkspaceSMTPProvider } from './providers/googleWorkspaceSMTP';
import { ConsoleEmailProvider } from './providers/console';

export class EmailService {
  private provider: EmailProvider;
  private config: EmailConfig;

  constructor() {
    this.config = this.loadConfig();
    this.provider = this.createProvider();
  }

  private loadConfig(): EmailConfig {
    const providerType = (process.env.EMAIL_PROVIDER || 'console') as EmailProviderType;
    
    // Validate required environment variables based on provider
    const requiredVars = this.getRequiredEnvVars(providerType);
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0 && providerType !== 'console') {
      console.warn(`Missing email configuration variables: ${missingVars.join(', ')}. Falling back to console provider.`);
    }

    return {
      provider: missingVars.length > 0 ? 'console' : providerType,
      fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
      fromName: process.env.FROM_NAME || 'Accessibility Scanner',
      replyToEmail: process.env.REPLY_TO_EMAIL,
      companyName: process.env.COMPANY_NAME || 'Accessibility Scanner',
      companyLogoUrl: process.env.COMPANY_LOGO_URL,
      supportEmail: process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@example.com',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.ACTIVATION_BASE_URL || 'http://localhost:3000',
    };
  }

  private getRequiredEnvVars(provider: EmailProviderType): string[] {
    switch (provider) {
      case 'google_workspace_smtp':
        return ['SMTP_USER', 'SMTP_APP_PASSWORD', 'FROM_EMAIL', 'FROM_NAME'];
      case 'google_workspace_api':
        return ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'FROM_EMAIL', 'FROM_NAME'];
      case 'postmark':
        return ['POSTMARK_SERVER_TOKEN', 'FROM_EMAIL', 'FROM_NAME'];
      case 'sendgrid':
        return ['SENDGRID_API_KEY', 'FROM_EMAIL', 'FROM_NAME'];
      case 'aws_ses':
        return ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'FROM_EMAIL', 'FROM_NAME'];
      case 'console':
      default:
        return [];
    }
  }

  private createProvider(): EmailProvider {
    switch (this.config.provider) {
      case 'google_workspace_smtp':
        return new GoogleWorkspaceSMTPProvider(this.config);
      case 'console':
      default:
        return new ConsoleEmailProvider(this.config);
    }
  }

  // Main email sending methods
  async sendActivationEmail(
    to: string,
    activationToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📧 Sending activation email to ${to} using ${this.config.provider} provider`);
      const result = await this.provider.sendActivationEmail(to, activationToken, userData);
      
      if (result.success) {
        console.log(`✅ Activation email sent successfully (ID: ${result.messageId})`);
      } else {
        console.error(`❌ Failed to send activation email: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error('Email service error:', error);
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
    try {
      console.log(`📧 Sending password reset email to ${to} using ${this.config.provider} provider`);
      const result = await this.provider.sendPasswordResetEmail(to, resetToken, userData);
      
      if (result.success) {
        console.log(`✅ Password reset email sent successfully (ID: ${result.messageId})`);
      } else {
        console.error(`❌ Failed to send password reset email: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error('Email service error:', error);
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
    try {
      if (!this.provider.sendWelcomeEmail) {
        return { success: true }; // Optional feature
      }

      console.log(`📧 Sending welcome email to ${to} using ${this.config.provider} provider`);
      const result = await this.provider.sendWelcomeEmail(to, userData);
      
      if (result.success) {
        console.log(`✅ Welcome email sent successfully (ID: ${result.messageId})`);
      } else {
        console.error(`❌ Failed to send welcome email: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Configuration and health methods
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  getProviderInfo(): { provider: EmailProviderType; configured: boolean } {
    return {
      provider: this.config.provider,
      configured: this.provider.isConfigured(),
    };
  }

  getConfig(): Omit<EmailConfig, 'provider'> {
    const { provider, ...config } = this.config;
    return config;
  }

  // Test email functionality (development)
  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Email service is not properly configured',
      };
    }

    // Test with Google Workspace SMTP provider if available
    if (this.provider instanceof GoogleWorkspaceSMTPProvider) {
      return await this.provider.testConnection();
    }

    // For other providers, just check configuration
    return { success: true };
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

// Re-export types for convenience
export type { EmailProvider, EmailConfig, EmailProviderType } from './interface';