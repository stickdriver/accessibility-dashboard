# Google Workspace SMTP Setup Guide

This guide walks you through setting up Google Workspace SMTP for sending activation emails from your company domain.

## 🎯 Quick Setup Summary

You need to complete **2 simple steps**:

1. **Generate App Password** in your Google Account (5 minutes)
2. **Configure Environment Variables** in your dashboard (2 minutes)

## 📋 Step-by-Step Setup

### Step 1: Enable 2-Step Verification

1. Go to your **Google Account Settings**: [myaccount.google.com](https://myaccount.google.com)
2. Click **"Security"** in the left sidebar
3. Under **"Signing in to Google"**, click **"2-Step Verification"**
4. If not already enabled, click **"Get started"** and follow the setup process
5. ✅ **Verification:** You should see "2-Step Verification is on"

### Step 2: Generate App Password

1. In the same **Security** section, click **"App passwords"**
   - *Note: You'll only see this option if 2-Step Verification is enabled*
2. Click **"Select app"** dropdown and choose **"Mail"**
3. Click **"Select device"** dropdown and choose **"Other (custom name)"**
4. Enter a name like: **"Accessibility Dashboard"**
5. Click **"Generate"**
6. **📝 IMPORTANT:** Copy the **16-character password** (something like: `abcd efgh ijkl mnop`)
   - You won't be able to see this again!
   - Store it securely (password manager recommended)

### Step 3: Configure Environment Variables

Create or update your `.env.local` file with these settings:

```env
# Email Configuration
EMAIL_PROVIDER=google_workspace_smtp

# Google Workspace SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_APP_PASSWORD=your-16-char-app-password-here

# Email Branding
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Your Company Name"
SUPPORT_EMAIL=support@yourdomain.com
COMPANY_NAME="Your Company"
COMPANY_LOGO_URL=https://yourdomain.com/logo.png

# App Configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Test the Configuration

Start your development server and test registration:

```bash
npm run dev
```

Register a test user - you should see the activation email in the console (development) or your inbox (with SMTP configured).

## 🔧 Configuration Details

### Required Email Address

The `SMTP_USER` must be a **valid Google Workspace email address** in your domain:

✅ **Good examples:**
- `noreply@yourdomain.com`
- `system@yourdomain.com`  
- `notifications@yourdomain.com`

❌ **Won't work:**
- `noreply@gmail.com` (not your domain)
- `fake@yourdomain.com` (doesn't exist)

### Email Address Setup

If the email address doesn't exist yet:

1. Go to **Google Workspace Admin Console**: [admin.google.com](https://admin.google.com)
2. Navigate to **Users** → **Add a user**
3. Create the email address (e.g., `noreply@yourdomain.com`)
4. Use this address for `SMTP_USER`

## 🔒 Security Best Practices

### App Password Security
- ✅ Store app passwords securely (password manager)
- ✅ Use descriptive names for app passwords
- ✅ Rotate app passwords periodically (every 6-12 months)
- ✅ Revoke unused app passwords

### Email Security
- ✅ Use a dedicated email for system notifications
- ✅ Don't use personal admin accounts for SMTP
- ✅ Monitor unusual email activity

## 📊 DNS Configuration (Optional but Recommended)

For better email deliverability, configure these DNS records:

### SPF Record
Add this TXT record to your domain:
```
Name: @
Value: v=spf1 include:_spf.google.com ~all
```

### DKIM Signing
1. In Google Workspace Admin → **Apps** → **Google Workspace** → **Gmail**
2. Go to **"Authenticate email"**
3. Turn on **DKIM signing**
4. Add the provided DNS record to your domain

### DMARC Policy
Add this TXT record:
```
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## 🧪 Testing & Troubleshooting

### Test Email Sending

```bash
# Test with console provider (development)
EMAIL_PROVIDER=console npm run dev

# Test with Google Workspace SMTP
EMAIL_PROVIDER=google_workspace_smtp npm run dev
```

### Common Issues

**❌ "Invalid credentials" error:**
- Verify the app password is correct (16 characters, no spaces)
- Ensure 2-Step Verification is enabled
- Check that `SMTP_USER` is a valid Google Workspace email

**❌ "Authentication failed" error:**  
- The email address might not exist in Google Workspace
- App password might be expired or revoked
- Try generating a new app password

**❌ Emails not being delivered:**
- Check spam folder
- Verify DNS records (SPF/DKIM)
- Monitor in Google Workspace Admin Console

**❌ "Less secure app access" error:**
- This shouldn't happen with app passwords
- Make sure you're using an app password, not your regular password

### Verify Configuration

```bash
# Check if email service is configured
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User"}'
```

## 🚀 Production Deployment

For production, update these environment variables:

```env
# Production Email Settings
EMAIL_PROVIDER=google_workspace_smtp
SMTP_USER=noreply@yourdomain.com
SMTP_APP_PASSWORD=your-production-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="Your Company Name"
NEXT_PUBLIC_APP_URL=https://dashboard.yourdomain.com
COMPANY_LOGO_URL=https://yourdomain.com/logo.png
```

## 📈 Monitoring

Monitor your email sending in:

1. **Google Workspace Admin Console**
   - Go to **Reports** → **Email log search**
   - Monitor delivery status and failures

2. **Application Logs**
   - Check console output for email sending status
   - Monitor failed email attempts

3. **Google Postmaster Tools** (optional)
   - Sign up at [postmaster.google.com](https://postmaster.google.com)
   - Monitor your domain's sending reputation

## 🔄 Upgrading to Service Account Later

When you're ready to upgrade to Google Cloud Service Account authentication:

1. Keep current SMTP settings as backup
2. Add service account environment variables
3. Change `EMAIL_PROVIDER=google_workspace_api`
4. Test thoroughly before removing SMTP config

The email service will automatically switch providers without code changes!

## ✅ Setup Checklist

- [ ] 2-Step Verification enabled on Google Account
- [ ] App password generated and saved securely
- [ ] Email address exists in Google Workspace
- [ ] Environment variables configured
- [ ] Test email sending works
- [ ] DNS records configured (optional)
- [ ] Production environment configured

## 🆘 Need Help?

If you run into issues:

1. **Check the console logs** when starting the development server
2. **Verify environment variables** are loaded correctly
3. **Test with console provider** first (`EMAIL_PROVIDER=console`)
4. **Check Google Workspace Admin Console** for any account issues

The email service provides detailed logging to help diagnose any configuration problems.