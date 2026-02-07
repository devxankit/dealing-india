import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
import util from 'util';

dotenv.config();

const resolve4 = util.promisify(dns.resolve4);

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587; // Default to 587 if not set
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@dealingindia.com';

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  process.env.VERCEL === 'true' ||
  !process.env.NODE_ENV;

// Singleton-like pattern for transporter
let transporter = null;
let isTransporterVerified = false;

/**
 * Robust Transporter Creation with Fallback Strategy
 * Tries Port 465 (SSL) first, then falls back to Port 587 (TLS)
 */
const createRobustTransporter = async () => {
  // Remove all whitespace from password (App Passwords may have spaces)
  const cleanEmailPass = EMAIL_PASS ? EMAIL_PASS.replace(/\s+/g, '') : '';

  // Validate credentials
  if (!EMAIL_USER || !cleanEmailPass) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required');
  }

  // Debug: Log password length (but not the actual password for security)
  console.log(`🔐 Email config check: User=${EMAIL_USER}, Password length=${cleanEmailPass.length} chars`);
  if (cleanEmailPass.length !== 16) {
    console.warn(`⚠️  WARNING: Gmail App Password should be 16 characters. Current length: ${cleanEmailPass.length}`);
    console.warn(`   If your App Password has spaces, they will be removed automatically.`);
  }

  const isGmail = EMAIL_HOST.toLowerCase().includes('gmail.com');

  // Strategy 1: Preferred Secure SSL (Port 465)
  // This is usually the most reliable on Cloud Functions/Render
  const configSecure = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: cleanEmailPass },
    family: 4, // Force IPv4
    timeout: 10000, // 10s connection timeout
  };

  // Strategy 2: Legacy TLS (Port 587)
  // Fallback if 465 is blocked
  const configTLS = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: EMAIL_USER, pass: cleanEmailPass },
    family: 4,
    timeout: 10000,
    tls: {
      ciphers: 'SSLv3'
    }
  };

  // Helper to test a config
  const tryConfig = async (config, name) => {
    console.log(`📧 Attempting SMTP Connection (${name})...`);
    console.log(`   Using email: ${EMAIL_USER}`);
    const t = nodemailer.createTransport(config);
    try {
      await t.verify();
      console.log(`✅ SMTP Connection Successful (${name})`);
      return t;
    } catch (error) {
      console.warn(`⚠️ SMTP Connection Failed (${name}):`, error.message);

      // Provide helpful error messages
      if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
        console.error('💡 TIP: Make sure you are using Gmail App Password, not regular password.');
        console.error('   Generate App Password: https://myaccount.google.com/apppasswords');
        console.error('   Ensure 2-Step Verification is enabled on your Google account.');
      }

      return null;
    }
  };

  if (isGmail) {
    // Try 465 first
    let t = await tryConfig(configSecure, 'Gmail SSL/465');
    if (t) return t;

    // Try 587 second
    console.log('� Falling back to TLS/587...');
    t = await tryConfig(configTLS, 'Gmail TLS/587');
    if (t) return t;

    throw new Error('All SMTP connection strategies failed.');
  } else {
    // Generic Non-Gmail Logic
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: { user: EMAIL_USER, pass: cleanEmailPass },
      family: 4
    });
  }
};

/**
 * Get or create the nodemailer transporter (Async)
 */
const getTransporter = async () => {
  if (transporter && isTransporterVerified) return transporter;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️ SMTP not configured. EMAIL_USER and EMAIL_PASS are required.');
    console.warn(`   EMAIL_USER: ${EMAIL_USER ? 'Set' : 'Missing'}`);
    console.warn(`   EMAIL_PASS: ${EMAIL_PASS ? 'Set (' + EMAIL_PASS.replace(/\s+/g, '').length + ' chars)' : 'Missing'}`);
    return null;
  }

  try {
    transporter = await createRobustTransporter();
    isTransporterVerified = true;
    return transporter;
  } catch (error) {
    console.error('❌ FATAL: Could not initialize email transporter:', error.message);
    console.error('   Please verify:');
    console.error('   1. Gmail App Password is correct (16 characters, no spaces in .env)');
    console.error('   2. 2-Step Verification is enabled on Google account');
    console.error('   3. App Password was generated from: https://myaccount.google.com/apppasswords');
    transporter = null;
    isTransporterVerified = false;
    return null;
  }
};

/**
 * Base Sending Function
 * Wraps transporter.sendMail with error handling and logging
 */
const sendEmail = async (to, subject, html, text) => {
  const mailTransporter = await getTransporter();

  // Development/Fallback Mode
  if (!mailTransporter) {
    console.log('⚠️ [DEV MODE/FAILURE] Email would have been sent to:', to);
    console.log('Subject:', subject);
    return { success: false, error: 'Transporter not configured or failed' };
  }

  const mailOptions = {
    from: `"Dealing India" <${EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);

    // Invalidate transporter on error to force reconnection next time
    transporter = null;
    isTransporterVerified = false;

    throw error;
  }
};

/**
 * Send email verification OTP
 * @param {String} email - Recipient email address
 * @param {String} otp - 4-digit OTP code
 */
export const sendVerificationEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  const subject = 'Verify Your Email - Dealing India';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Email Verification</h2>
        <p>Hello,</p>
        <p>Thank you for registering with Dealing India. Please use the following code to verify your email address:</p>
        <div style="background-color: #ffffff; border: 2px dashed #3498db; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #3498db; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Email Verification - Dealing India
    
    Hello,
    
    Thank you for registering with Dealing India. Please use the following code to verify your email address:
    
    ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this verification, please ignore this email.
    
    © ${new Date().getFullYear()} Dealing India. All rights reserved.
  `;

  try {
    const result = await sendEmail(email, subject, html, text);

    // Check if email actually succeeded
    if (!result || !result.success) {
      // Email failed but didn't throw - log OTP for manual verification
      console.error(`🚨 EMAIL FAILED: Verification OTP for ${email}: ${otp}`);
      console.error('⚠️  User can verify using OTP from server logs.');
      console.error(`   Error: ${result?.error || 'Unknown error'}`);

      return {
        success: false,
        message: result?.error || 'Failed to send verification email',
        error: result?.error || 'Email service not configured or failed',
        otp: otp, // Return OTP in response for manual verification
      };
    }

    // Log OTP in production for backup verification (Critical for user experience)
    if (isProduction) {
      console.log(`📧 [BACKUP LOG] OTP for ${email}: ${otp}`);
    }

    return {
      success: true,
      message: 'Verification email sent successfully',
      ...result
    };
  } catch (error) {
    // Critical Fallback: Always log OTP if email fails so user is not blocked
    console.error(`🚨 EMAIL FAILED: Verification OTP for ${email}: ${otp}`);
    console.error('⚠️  User can verify using OTP from server logs.');
    console.error(`   Error: ${error.message}`);

    return {
      success: false,
      message: 'Email service timeout. Please check server logs for OTP.',
      error: error.message,
      otp: otp, // Return OTP in response if allowed (or relying on logs)
    };
  }
};

/**
 * Send password reset OTP
 * @param {String} email - Recipient email address
 * @param {String} otp - 4-digit OTP code
 */
export const sendPasswordResetEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  const subject = 'Password Reset Request - Dealing India';
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c0392b; margin-top: 0;">Password Reset</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the code below to proceed:</p>
        <div style="background-color: #ffffff; border: 2px dashed #c0392b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #c0392b; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't ask for this, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Your password reset code is: ${otp}`;

  try {
    await sendEmail(email, subject, html, text);
    return { success: true, message: 'Password reset email sent' };
  } catch (error) {
    console.error(`� EMAIL FAILED: Reset OTP for ${email}: ${otp}`);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Dealing India!';
  const html = `
    <h1>Welcome ${name}!</h1>
    <p>Thank you for joining Dealing India. Your account is now verified.</p>
    <p>You can now browse and shop in our B2B marketplace.</p>
  `;
  const text = `Welcome ${name}! Thank you for joining Dealing India. Your account is now verified.`;

  return sendEmail(email, subject, html, text);
};
