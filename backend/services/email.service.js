import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@dealingindia.com';

// Detect production environment (check multiple indicators)
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.RENDER === 'true' || // Render sets this
                     process.env.VERCEL === 'true' || // Vercel sets this
                     !process.env.NODE_ENV || // If not set, assume production for safety
                     process.env.PORT !== undefined; // Render/Vercel always set PORT

console.log(`📧 Email Service Configuration:`, {
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  VERCEL: process.env.VERCEL,
  isProduction,
  hasEmailUser: !!EMAIL_USER,
  hasEmailPass: !!EMAIL_PASS,
  emailHost: EMAIL_HOST,
  emailPort: EMAIL_PORT,
});

// Create transporter
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  // Remove any spaces from EMAIL_PASS (common issue)
  const cleanEmailPass = EMAIL_PASS.replace(/\s+/g, '');
  
  if (EMAIL_PASS !== cleanEmailPass) {
    console.warn('⚠️  WARNING: EMAIL_PASS contains spaces. Auto-correcting...');
  }
  
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: cleanEmailPass, // Use cleaned password
    },
    // Increased timeouts for production (Render/Gmail connections can be slow)
    // Use isProduction instead of NODE_ENV check
    connectionTimeout: isProduction ? 60000 : 10000, // 60s in prod, 10s in dev
    greetingTimeout: isProduction ? 60000 : 10000,
    socketTimeout: isProduction ? 60000 : 10000,
    // Retry options for production
    pool: isProduction, // Use connection pooling in production
    maxConnections: isProduction ? 5 : 1,
    maxMessages: isProduction ? 100 : 1,
    // Enable debug only in local development
    debug: !isProduction && process.env.NODE_ENV === 'development',
    logger: !isProduction && process.env.NODE_ENV === 'development',
    // TLS options for better compatibility with Render/Gmail
    tls: {
      rejectUnauthorized: false, // Required for some SMTP servers
      minVersion: 'TLSv1.2', // Use modern TLS
    },
    // Additional options for production reliability
    ...(isProduction && {
      requireTLS: true,
      requireSSL: false, // We use STARTTLS on port 587
    }),
  });
  
  // Verify transporter configuration on startup (with longer timeout for production)
  const verifyTimeout = isProduction ? 60000 : 10000;
  const verifyPromise = new Promise((resolve) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
        console.error('⚠️  Emails may not be sent. Please check EMAIL_USER, EMAIL_PASS, EMAIL_HOST, and EMAIL_PORT configuration.');
        console.error('⚠️  Common issues:');
        console.error('   1. EMAIL_PASS has spaces (should be: vafkdfymgkgyubf, not: vafk dfym gkgr yubf)');
        console.error('   2. Gmail App Password incorrect');
        console.error('   3. Network/firewall blocking SMTP connection');
        resolve({ success: false, error });
      } else {
        console.log('✅ Email transporter configured successfully');
        console.log(`   Host: ${EMAIL_HOST}:${EMAIL_PORT}`);
        console.log(`   User: ${EMAIL_USER}`);
        console.log(`   Production Mode: ${isProduction}`);
        resolve({ success: true });
      }
    });
  });
  
  // Add timeout to verification
  Promise.race([
    verifyPromise,
    new Promise((resolve) => setTimeout(() => {
      console.warn('⚠️  Email verification timeout - continuing anyway');
      resolve({ success: false, timeout: true });
    }, verifyTimeout))
  ]).catch(err => {
    console.error('Error during email verification:', err);
  });
} else {
  const isProduction = process.env.NODE_ENV === 'production';
  console.error(`❌ Email service not configured. EMAIL_USER and EMAIL_PASS are required.`);
  if (isProduction) {
    console.error('⚠️  CRITICAL: Email service is required in production. Please set EMAIL_USER and EMAIL_PASS environment variables.');
  } else {
    console.warn('⚠️  Email service not configured. EMAIL_USER and EMAIL_PASS are required.');
  }
}

/**
 * Send email verification OTP
 * @param {String} email - Recipient email address
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Object>} Email send result
 */
export const sendVerificationEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // If transporter is not configured, log OTP and return error
    if (!transporter) {
      const isProduction = process.env.NODE_ENV === 'production';
      console.error('❌ Email service not configured. EMAIL_USER and EMAIL_PASS are required.');
      console.log(`📧 [EMAIL NOT CONFIGURED] Verification OTP for ${email}: ${otp}`);
      
      // In production, this is a critical error
      if (isProduction) {
        console.error(`🚨 PRODUCTION ERROR: Cannot send verification email to ${email}. Email service must be configured.`);
      }
      
      // Return error but don't throw - allow registration to proceed
      return { 
        success: false, 
        message: 'Email service not configured. Please contact support.',
        error: 'EMAIL_SERVICE_NOT_CONFIGURED',
        devMode: !isProduction,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show OTP in dev mode
      };
    }

    const mailOptions = {
      from: `"Dealing India" <${EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email - Dealing India',
      html: `
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
      `,
      text: `
        Email Verification - Dealing India
        
        Hello,
        
        Thank you for registering with Dealing India. Please use the following code to verify your email address:
        
        ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        © ${new Date().getFullYear()} Dealing India. All rights reserved.
      `,
    };

    // Send email with timeout to prevent hanging (increased timeout for production)
    // Render/Gmail connections can be slow, so we use longer timeout
    // Use isProduction instead of NODE_ENV check
    const timeoutDuration = isProduction ? 60000 : 10000; // 60s in prod, 10s in dev
    let info;
    
    try {
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Email send timeout after ${timeoutDuration}ms`)), timeoutDuration)
      );

      info = await Promise.race([sendPromise, timeoutPromise]);
      
      // Enhanced logging for production debugging
      const logMessage = `✅ Verification email sent to ${email}`;
      const messageId = info.messageId || 'N/A';
      console.log(`${logMessage} (MessageID: ${messageId})`);
      
      // In production, also log to help debug if emails don't arrive
      if (isProduction) {
        console.log(`📧 Production Email Log: Sent verification OTP to ${email} at ${new Date().toISOString()}`);
        console.log(`📧 OTP: ${otp} (logged for debugging)`);
      }
      
      return {
        success: true,
        message: 'Verification email sent successfully',
        messageId: info.messageId,
      };
    } catch (sendError) {
      // Enhanced error logging
      console.error('❌ Error sending verification email:', {
        message: sendError.message,
        code: sendError.code,
        command: sendError.command,
        response: sendError.response,
        responseCode: sendError.responseCode,
        stack: sendError.stack, // Always log stack in production
      });
      
      // Check if it's a timeout error
      const isTimeout = sendError.message?.includes('timeout') || 
                       sendError.message?.includes('Connection timeout') ||
                       sendError.code === 'ETIMEDOUT';
      
      if (isTimeout) {
        // Log OTP for manual verification in case of timeout
        console.error(`🚨 EMAIL TIMEOUT: Verification OTP for ${email}: ${otp}`);
        console.error('⚠️  Email service timeout. This might be due to network/firewall issues on Render.');
        console.error('⚠️  User can still verify using OTP from server logs.');
        
        return {
          success: false,
          message: 'Email service timeout. Please contact support or check server logs for OTP.',
          error: 'EMAIL_TIMEOUT',
          code: 'TIMEOUT',
          otp: isProduction ? otp : undefined, // Log OTP in production for manual verification
        };
      }
      
      // Return error instead of throwing
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: sendError.message || 'EMAIL_SEND_FAILED',
        code: sendError.code,
      };
    }
  } catch (error) {
    // Enhanced error logging
    console.error('❌ Error sending verification email:', error.message);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    
    // Log OTP in case email fails so user can still verify (check server logs)
    console.log(`📧 [EMAIL FAILED] Verification OTP for ${email}: ${otp}`);
    
    // Don't throw error - allow registration to proceed, but log the issue
    return {
      success: false,
      message: 'Failed to send email, but OTP has been generated. Check server logs for OTP.',
      error: error.message,
      errorCode: error.code,
      devMode: process.env.NODE_ENV === 'development',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show OTP in dev mode
    };
  }
};

/**
 * Send password reset OTP
 * @param {String} email - Recipient email address
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Object>} Email send result
 */
export const sendPasswordResetEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // If transporter is not configured, log OTP and return success
    if (!transporter) {
      console.warn('⚠️ Email service not configured. EMAIL_USER and EMAIL_PASS are required.');
      console.log(`📧 [EMAIL NOT CONFIGURED] Password Reset OTP for ${email}: ${otp}`);
      return { 
        success: true, 
        message: 'OTP generated. Email service not configured - check server logs for OTP.',
        devMode: true,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };
    }

    const mailOptions = {
      from: `"Dealing India" <${EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset - Dealing India',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #e74c3c; margin-top: 0;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password. Please use the following code to reset your password:</p>
            <div style="background-color: #ffffff; border: 2px dashed #e74c3c; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="color: #e74c3c; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p><strong>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #7f8c8d; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dealing India. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - Dealing India
        
        Hello,
        
        We received a request to reset your password. Please use the following code to reset your password:
        
        ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        © ${new Date().getFullYear()} Dealing India. All rights reserved.
      `,
    };

    // Send email with timeout to prevent hanging
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout')), 10000) // 10 second timeout
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    
    console.log(`✅ Password reset email sent to ${email}`);
    return {
      success: true,
      message: 'Password reset email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    // Log OTP in case email fails
    console.log(`📧 [EMAIL FAILED] Password Reset OTP for ${email}: ${otp}`);
    // Don't throw error - allow password reset to proceed
    return {
      success: false,
      message: 'Failed to send email, but OTP has been generated. Check server logs.',
      error: error.message,
      devMode: true,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    };
  }
};

/**
 * Send return request confirmation
 */
export const sendReturnRequestConfirmation = async (email, returnData) => {
  // Implementation for return request confirmation email
  // Simplified for now
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 [DEV MODE] Return Request Confirmation to ${email}`);
  }
  return { success: true };
};

/**
 * Send return status update
 */
export const sendReturnStatusUpdate = async (email, returnData, status) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 [DEV MODE] Return Status Update (${status}) to ${email}`);
  }
  return { success: true };
};

/**
 * Send refund processed notification
 */
export const sendRefundProcessed = async (email, returnData, amount) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 [DEV MODE] Refund Processed (${amount}) to ${email}`);
  }
  return { success: true };
};

const emailService = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendReturnRequestConfirmation,
  sendReturnStatusUpdate,
  sendRefundProcessed
};

export default emailService;
