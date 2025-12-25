import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@dealingindia.com';

// Create transporter
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn('⚠️  Email service not configured. EMAIL_USER and EMAIL_PASS are required.');
}

/**
 * Send email verification OTP
 * @param {String} email - Recipient email address
 * @param {String} otp - 4-digit OTP code
 * @returns {Promise<Object>} Email send result
 */
export const sendVerificationEmail = async (email, otp) => {
  try {
    if (!transporter) {
      console.warn('Email service not configured. OTP:', otp);
      // In development, log the OTP instead of sending email
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [DEV MODE] Verification OTP for ${email}: ${otp}`);
        return { success: true, message: 'OTP logged in console (dev mode)' };
      }
      throw new Error('Email service is not configured');
    }

    if (!email || !otp) {
      throw new Error('Email and OTP are required');
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

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: 'Verification email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
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
    if (!transporter) {
      console.warn('Email service not configured. OTP:', otp);
      // In development, log the OTP instead of sending email
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [DEV MODE] Password Reset OTP for ${email}: ${otp}`);
        return { success: true, message: 'OTP logged in console (dev mode)' };
      }
      throw new Error('Email service is not configured');
    }

    if (!email || !otp) {
      throw new Error('Email and OTP are required');
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

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: 'Password reset email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

