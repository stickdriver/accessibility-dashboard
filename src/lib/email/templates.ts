import { EmailTemplate, EmailTemplateData } from './interface';

export function getActivationEmailTemplate(data: EmailTemplateData): EmailTemplate {
  const { name, activationUrl, companyName, companyLogoUrl, supportEmail } = data;
  
  const subject = `Activate Your ${companyName} Account`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 15px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #2563eb; }
        .footer { border-top: 1px solid #f0f0f0; padding: 20px 0; font-size: 14px; color: #666; text-align: center; }
        .security-note { background: #f8f9fa; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; font-size: 14px; }
        @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName}" class="logo">` : `<h1>${companyName}</h1>`}
        </div>
        
        <div class="content">
            <h2>Welcome${name ? ` ${name}` : ''}!</h2>
            
            <p>Thank you for signing up for ${companyName}. To get started, please activate your account by clicking the button below.</p>
            
            <div style="text-align: center;">
                <a href="${activationUrl}" class="button">Activate My Account</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px;">${activationUrl}</p>
            
            <div class="security-note">
                <strong>Security Note:</strong> This activation link will expire in 24 hours for your security. If you didn't create this account, you can safely ignore this email.
            </div>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
Welcome${name ? ` ${name}` : ''}!

Thank you for signing up for ${companyName}. To get started, please activate your account by visiting this link:

${activationUrl}

This activation link will expire in 24 hours for your security.

If you didn't create this account, you can safely ignore this email.

Need help? Contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
`;

  return { subject, html, text };
}

export function getPasswordResetEmailTemplate(data: EmailTemplateData): EmailTemplate {
  const { name, resetUrl, companyName, companyLogoUrl, supportEmail } = data;
  
  const subject = `Reset Your ${companyName} Password`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 15px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #b91c1c; }
        .footer { border-top: 1px solid #f0f0f0; padding: 20px 0; font-size: 14px; color: #666; text-align: center; }
        .security-note { background: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; font-size: 14px; }
        @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName}" class="logo">` : `<h1>${companyName}</h1>`}
        </div>
        
        <div class="content">
            <h2>Password Reset Request</h2>
            
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>We received a request to reset your ${companyName} account password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626; font-family: monospace; background: #fef2f2; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            
            <div class="security-note">
                <strong>Security Note:</strong> This reset link will expire in 1 hour for your security. If you didn't request this password reset, you can safely ignore this email and your password will remain unchanged.
            </div>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
Password Reset Request

Hi${name ? ` ${name}` : ''},

We received a request to reset your ${companyName} account password. Visit this link to create a new password:

${resetUrl}

This reset link will expire in 1 hour for your security.

If you didn't request this password reset, you can safely ignore this email and your password will remain unchanged.

Need help? Contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
`;

  return { subject, html, text };
}

export function getWelcomeEmailTemplate(data: EmailTemplateData): EmailTemplate {
  const { name, companyName, companyLogoUrl, supportEmail } = data;
  
  const subject = `Welcome to ${companyName}!`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .footer { border-top: 1px solid #f0f0f0; padding: 20px 0; font-size: 14px; color: #666; text-align: center; }
        .feature-list { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-list ul { margin: 0; padding-left: 20px; }
        .feature-list li { margin: 10px 0; }
        @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName}" class="logo">` : `<h1>${companyName}</h1>`}
        </div>
        
        <div class="content">
            <h2>Welcome to ${companyName}${name ? `, ${name}` : ''}! 🎉</h2>
            
            <p>Your account has been successfully activated and you're ready to get started!</p>
            
            <div class="feature-list">
                <h3>What you can do now:</h3>
                <ul>
                    <li>Access your dashboard</li>
                    <li>Start using our accessibility scanning tools</li>
                    <li>Generate detailed reports</li>
                    <li>Manage your account settings</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.baseUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
Welcome to ${companyName}${name ? `, ${name}` : ''}!

Your account has been successfully activated and you're ready to get started!

What you can do now:
• Access your dashboard
• Start using our accessibility scanning tools  
• Generate detailed reports
• Manage your account settings

Visit your dashboard: ${data.baseUrl}

If you have any questions or need assistance, don't hesitate to reach out to our support team.

Need help? Contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
`;

  return { subject, html, text };
}