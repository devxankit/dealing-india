# Production Environment Variables Setup Guide

## 🚨 Important: Production vs Development

**Local Development (.env):**
- `NODE_ENV=development`
- `SOCKET_CORS_ORIGIN=http://localhost:3000`

**Production (Render Backend):**
- `NODE_ENV=production` ⚠️ **IMPORTANT: Change this!**
- `SOCKET_CORS_ORIGIN=https://dealing-india.vercel.app`

---

## 📋 Backend Environment Variables (Render)

### Required Variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia

# JWT Authentication
JWT_SECRET=hdjwddjdjkdqwdqwdwjdqdqjkdjqwdjkdwdwndjdwdjnwdwjdnwdjkwndqwndkqwdqwdjwdjnwdqwdqwjn
JWT_EXPIRES_IN=24h

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=dsa9rqotf
CLOUDINARY_API_KEY=451297271993184
CLOUDINARY_API_SECRET=hBbE72Zohumz08DKGAGVlpz1qEs

# Email Service (CRITICAL for registration)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=vishalpatel581012@gmail.com
EMAIL_PASS=vafkdfymgkgyubf
EMAIL_FROM=vishalpatel581012@gmail.com

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_RATE_LIMIT_REQUESTS=10
OTP_RATE_LIMIT_WINDOW=15

# Socket.io CORS (IMPORTANT for production)
SOCKET_CORS_ORIGIN=https://dealing-india.vercel.app
```

### ⚠️ Critical Issues to Fix:

1. **EMAIL_PASS**: Current value has spaces: `vafk dfym gkgr yubf`
   - **Fix**: Remove spaces: `vafkdfymgkgyubf`
   - Gmail App Password me spaces nahi hone chahiye

2. **NODE_ENV**: Currently `development`
   - **Fix**: Change to `production` in Render

3. **SOCKET_CORS_ORIGIN**: Currently only localhost
   - **Fix**: Add `https://dealing-india.vercel.app`

4. **OTP_RATE_LIMIT_REQUESTS**: Currently `3`
   - **Fix**: Change to `10` (already updated in code)

---

## 📋 Frontend Environment Variables (Vercel)

### Required Variable:

```env
VITE_API_BASE_URL=https://dealing-india.onrender.com/api
```

### ⚠️ CRITICAL: This must be set in Vercel!

**Without this, frontend will try to call `localhost:5000` which will fail in production.**

---

## 🔧 How to Set Environment Variables

### Render (Backend):

1. Go to Render Dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add/Update each variable:
   - Click **Add Environment Variable**
   - Enter **Key** and **Value**
   - Click **Save Changes**
5. **Restart** the service after adding variables

### Vercel (Frontend):

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://dealing-india.onrender.com/api`
   - **Environment**: Production (and Preview if needed)
5. **Redeploy** the frontend

---

## ✅ Verification Checklist

### Backend (Render):
- [ ] `NODE_ENV=production` ✅
- [ ] `MONGODB_URI` is set ✅
- [ ] `JWT_SECRET` is set ✅
- [ ] `EMAIL_USER` is set ✅
- [ ] `EMAIL_PASS` has NO SPACES ✅
- [ ] `SOCKET_CORS_ORIGIN=https://dealing-india.vercel.app` ✅
- [ ] `OTP_RATE_LIMIT_REQUESTS=10` ✅

### Frontend (Vercel):
- [ ] `VITE_API_BASE_URL=https://dealing-india.onrender.com/api` ✅

---

## 🧪 Testing After Setup

1. **Test Backend Health:**
   ```
   GET https://dealing-india.onrender.com/api/health
   ```
   Should return: `{ status: 'OK', database: 'Connected' }`

2. **Test Registration:**
   ```
   POST https://dealing-india.onrender.com/api/auth/user/register
   ```
   Should work without 500 error

3. **Check Render Logs:**
   - Go to Render Dashboard → Logs
   - Look for: `✅ Email transporter configured successfully`
   - Look for: `✅ MongoDB Connected Successfully!`

---

## 🐛 Common Issues

### Issue 1: 500 Error on Registration
**Cause**: Missing or incorrect environment variables
**Solution**: 
- Check all variables are set in Render
- Verify `EMAIL_PASS` has no spaces
- Check `NODE_ENV=production`

### Issue 2: CORS Error
**Cause**: Frontend URL not in CORS origins
**Solution**: 
- Add `SOCKET_CORS_ORIGIN=https://dealing-india.vercel.app` in Render
- Restart backend service

### Issue 3: Frontend calling localhost
**Cause**: `VITE_API_BASE_URL` not set in Vercel
**Solution**: 
- Add `VITE_API_BASE_URL=https://dealing-india.onrender.com/api` in Vercel
- Redeploy frontend

### Issue 4: Email not sending
**Cause**: `EMAIL_PASS` has spaces or incorrect
**Solution**: 
- Remove all spaces from Gmail App Password
- Verify password in Gmail → App Passwords

---

## 📝 Notes

- **Never commit `.env` files to Git**
- **Use different JWT_SECRET in production**
- **Gmail App Passwords**: Generate from Google Account → Security → 2-Step Verification → App Passwords
- **Restart services** after changing environment variables

