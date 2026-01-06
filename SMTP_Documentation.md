# SMTP Services & Email Architecture Documentation

This document provides a detailed analysis of the SMTP services implementation in the SaaS CRM backend. It covers the technology stack, configuration, core logic, and usage patterns across the application.

## 1. Overview

The application uses **Nodemailer**, a module for Node.js applications to allow easy email sending. The email service is encapsulated in a utility file, providing a centralized interface for all email-related operations.

- **File Path**: `backend/utils/emailService.js`
- **Library**: `nodemailer`
- **Primary Features**:
  - Dynamic transporter configuration (Gmail & Standard SMTP).
  - HTML email template support.
  - Development mode fallback (logs to console if credentials missing).
  - Fire-and-forget sending pattern (non-blocking).

## 2. Configuration

The email service relies on environment variables defined in `.env`.

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | The hostname of the SMTP server (e.g., `smtp.gmail.com` or `smtp.sendgrid.net`). |
| `SMTP_USER` | The username or email address for authentication. |
| `SMTP_PASS` | The password or app-specific password for authentication. |
| `SMTP_PORT` | (Optional) Port to connect to (defaults to `587`). |
| `SMTP_SECURE` | (Optional) Boolean string (`'true'`/`'false'`) for SSL/TLS usage. |
| `FRONTEND_URL`| Used in email templates for links (e.g., dashboard, reset password). |

## 3. Implementation Logic

### Transporter Management (`getTransporter`)
The system uses a singleton-like pattern (variable `transporter`) but re-initializes it dynamically to ensure up-to-date credentials.

1.  **Validation**: Checks if `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are present. If not, it logs a warning and returns `null` (preventing crashes in dev environments).
2.  **Gmail Special Case**: If `SMTP_HOST` contains `gmail.com`, it configures the transporter specifically for the `gmail` service.
3.  **Generic SMTP**: For other hosts, it uses standard configuration (`host`, `port`, `secure`).
4.  **Error Handling**: If the transporter fails to verify, it resets the `transporter` variable to `null` to force recreation on the next attempt.

### Base Sending Function (`sendEmail`)
A helper function that wraps the transporter's `sendMail` method.
- **Input**: `to`, `subject`, `html` content.
- **Process**: 
  - Gets the transporter.
  - If no transporter (missing config), logs the email content to the console (Dev Mode).
  - Sends the email and logs success/failure.

## 4. Exported Email Functions

The `emailService.js` module exports specific functions for business logic:

### 1. `sendOTPEmail`
- **Purpose**: Sends a 6-digit OTP for account verification.
- **Parameters**: `email`, `otp`.
- **Used In**: Admin Registration.

### 2. `sendPasswordResetOTPEmail`
- **Purpose**: Sends a 6-digit OTP for password reset requests.
- **Parameters**: `email`, `otp`.
- **Used In**: Admin Password Reset.

### 3. `sendPasswordResetConfirmationEmail`
- **Purpose**: Notifies the user that their password has been successfully changed.
- **Parameters**: `email`.
- **Used In**: Admin Password Reset.

### 4. `sendAdminWelcomeEmailWithSubscription`
- **Purpose**: A comprehensive welcome email for new admins/companies.
- **Parameters**: Object containing `email`, `name`, `password`, `companyName`, `plan`, `dashboardUrl`, etc.
- **Content**: Includes login credentials, subscription details, and a link to the dashboard.
- **Used In**: 
  - Admin Registration (post-verification).
  - Razorpay Payment (post-success).
  - Master Admin User Creation.

### 5. `sendAdminCredentialsEmail`
- **Purpose**: Intended to send just credentials (email/password).
- **Status**: **Unused**. defined in the utility but not currently called by any controller.

## 5. Usage Map

| Controller File | Function Used | Context |
|-----------------|---------------|---------|
| `adminRegistrationController.js` | `sendOTPEmail` | Sent when a new admin registers to verify email. |
| `adminRegistrationController.js` | `sendAdminWelcomeEmailWithSubscription` | Sent after OTP is verified and account is fully created. |
| `razorpayPaymentController.js` | `sendAdminWelcomeEmailWithSubscription` | Sent when a subscription payment is successful and account is activated. |
| `adminController.js` | `sendPasswordResetOTPEmail` | Sent when user requests "Forgot Password". |
| `adminController.js` | `sendPasswordResetConfirmationEmail` | Sent after password reset is completed. |
| `masterAdminUserController.js` | `sendAdminWelcomeEmailWithSubscription` | Sent when a Master Admin manually creates a new Admin/Company. |

## 6. Code Snippets

**Dynamic Transporter Creation:**
```javascript
const getTransporter = () => {
  // ... check env vars ...
  const isGmail = smtpHost.toLowerCase().includes('gmail.com');
  if (isGmail) {
    return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  } else {
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
};
```

**Development Mode Fallback:**
```javascript
if (!transporter) {
  console.log('⚠️ SMTP not configured. Email would have been sent to:', to);
  console.log('Subject:', subject);
  return;
}
```
