// Main email service exports
export { EmailService, getEmailService } from './emailService';
export type { EmailProvider, EmailConfig, EmailProviderType } from './interface';
export { getActivationEmailTemplate, getPasswordResetEmailTemplate, getWelcomeEmailTemplate } from './templates';

// Provider exports
export { GoogleWorkspaceSMTPProvider } from './providers/googleWorkspaceSMTP';
export { ConsoleEmailProvider } from './providers/console';