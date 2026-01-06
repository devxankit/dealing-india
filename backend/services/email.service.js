import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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

/**
 * Get or create the nodemailer transporter
 * Implements dynamic creation pattern from reference documentation
 */
const getTransporter = () => {
  // If transporter already exists, return it
  if (transporter) return transporter;

  // Validation: Check if credentials are present
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️ SMTP not configured. EMAIL_USER and EMAIL_PASS are required.');
    return null;
  }

  // Clean password (remove spaces)
  const cleanEmailPass = EMAIL_PASS.replace(/\s+/g, '');

  // Gmail Special Case Logic (from reference docs)
  const isGmail = EMAIL_HOST.toLowerCase().includes('gmail.com');

  if (isGmail) {
    console.log('📧 Configuring Email Service: Gmail Mode');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: cleanEmailPass,
      },
      // Force IPv4 for reliability on Render
      family: 4, 
    });
  } else {
    console.log('📧 Configuring Email Service: Generic SMTP Mode');
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // True for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: cleanEmailPass,
      },
      // Force IPv4 for reliability
      family: 4,
      // Connection pooling for performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // Verify connection (non-blocking)
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email Transporter Verification Failed:', error.message);
      transporter = null; // Reset to force recreation on next attempt
    } else {
      console.log('✅ Email Transporter Verified Successfully');
    }
  });

  return transporter;
};

/**
 * Base Sending Function
 * Wraps transporter.sendMail with error handling and logging
 */
const sendEmail = async (to, subject, html, text) => {
  const mailTransporter = getTransporter();

  // Development/Fallback Mode
  if (!mailTransporter) {
    console.log('⚠️ [DEV MODE] Email would have been sent to:', to);
    console.log('Subject:', subject);
    console.log('Content (Preview):', text?.substring(0, 100) + '...');
    return { success: false, error: 'Transporter not configured' };
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
    
    // Check for timeout or connection issues
    if (error.code === 'ETIMEDOUT' || error.command === 'CONN') {
       console.error('⚠️ Network timeout detected. Resetting transporter.');
       transporter = null; // Reset transporter for next attempt
    }
    
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
