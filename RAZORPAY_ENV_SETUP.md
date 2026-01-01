# Razorpay Environment Variables Setup

This document describes the environment variables needed for Razorpay integration.

## Backend Environment Variables

Add the following variables to your `backend/.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### How to Get Razorpay Keys:

1. **Sign up/Login** to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate **Test Keys** for development or **Live Keys** for production
4. Copy the **Key ID** and **Key Secret**
5. For webhooks (optional), go to **Settings** → **Webhooks** and create a webhook endpoint

### Notes:
- Use **Test Keys** during development
- Use **Live Keys** only in production
- Never commit keys to version control
- Keep `RAZORPAY_KEY_SECRET` secure and never expose it to frontend

## Frontend Environment Variables

Add the following variable to your `frontend/.env` or `frontend/.env.local` file:

```env
# Razorpay Public Key (Key ID only - safe to expose)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

### Notes:
- Only the **Key ID** is needed in frontend (it's safe to expose)
- **Never** put `RAZORPAY_KEY_SECRET` in frontend environment variables
- The Key ID is used to initialize Razorpay checkout on the client side

## Environment File Locations

### Backend
- File: `backend/.env`
- Example:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Frontend
- File: `frontend/.env` or `frontend/.env.local`
- Example:
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

## Testing

### Test Card Details (for development):
- **Card Number**: 4111 1111 1111 1111
- **CVV**: Any 3 digits (e.g., 123)
- **Expiry**: Any future date (e.g., 12/25)
- **Name**: Any name

### Test UPI ID:
- Use any UPI ID format: `test@razorpay` or `success@razorpay`

## Security Best Practices

1. ✅ Use environment variables for all sensitive keys
2. ✅ Never commit `.env` files to git
3. ✅ Use test keys during development
4. ✅ Rotate keys periodically in production
5. ✅ Always verify payment signatures on backend
6. ✅ Use HTTPS in production
7. ✅ Implement rate limiting for order creation
8. ✅ Log payment events for audit trail

## Troubleshooting

### Common Issues:

1. **"Razorpay SDK not loaded"**
   - Check if Razorpay script is included in `frontend/index.html`
   - Verify script loads before payment initialization

2. **"Razorpay keys not found"**
   - Verify environment variables are set correctly
   - Restart backend server after adding env variables
   - Check `.env` file is in correct location

3. **"Payment signature verification failed"**
   - Ensure you're using correct key secret
   - Verify payment data is not modified before verification
   - Check order ID and payment ID match

4. **"Failed to initialize payment gateway"**
   - Check Razorpay service initialization
   - Verify network connectivity
   - Check Razorpay dashboard for account status

## Support

For Razorpay-specific issues, refer to:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)

