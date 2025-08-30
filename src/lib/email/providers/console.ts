import { EmailProvider, EmailConfig } from '../interface';
import { getActivationEmailTemplate, getPasswordResetEmailTemplate, getWelcomeEmailTemplate } from '../templates';

export class ConsoleEmailProvider implements EmailProvider {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return true; // Console provider is always configured
  }

  async sendActivationEmail(
    to: string,
    activationToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    console.log('\n📧 ACTIVATION EMAIL (Console Provider)\n');
    console.log(`To: ${to}`);
    console.log(`From: ${this.config.fromName} <${this.config.fromEmail}>`);
    console.log(`Subject: ${template.subject}`);
    console.log('\n--- TEXT VERSION ---');
    console.log(template.text);
    console.log('\n--- ACTIVATION URL ---');
    console.log(`🔗 ${activationUrl}`);
    console.log('\n--- END EMAIL ---\n');

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    console.log('\n🔐 PASSWORD RESET EMAIL (Console Provider)\n');
    console.log(`To: ${to}`);
    console.log(`From: ${this.config.fromName} <${this.config.fromEmail}>`);
    console.log(`Subject: ${template.subject}`);
    console.log('\n--- TEXT VERSION ---');
    console.log(template.text);
    console.log('\n--- RESET URL ---');
    console.log(`🔗 ${resetUrl}`);
    console.log('\n--- END EMAIL ---\n');

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendWelcomeEmail(
    to: string,
    userData: { name?: string; email: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getWelcomeEmailTemplate({
      name: userData.name,
      email: userData.email,
      companyName: this.config.companyName,
      companyLogoUrl: this.config.companyLogoUrl,
      supportEmail: this.config.supportEmail,
      baseUrl: this.config.baseUrl,
    });

    console.log('\n🎉 WELCOME EMAIL (Console Provider)\n');
    console.log(`To: ${to}`);
    console.log(`From: ${this.config.fromName} <${this.config.fromEmail}>`);
    console.log(`Subject: ${template.subject}`);
    console.log('\n--- TEXT VERSION ---');
    console.log(template.text);
    console.log('\n--- END EMAIL ---\n');

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}