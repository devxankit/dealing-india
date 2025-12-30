# Cloudinary Setup Instructions

## Environment Variables

Add the following variables to your `.env` file:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## How to Get Cloudinary Credentials

1. **Sign up/Login**: Go to https://cloudinary.com and create an account or login
2. **Access Dashboard**: After logging in, you'll be redirected to your dashboard
3. **Get Credentials**: 
   - Your **Cloud Name** is displayed at the top of the dashboard
   - Click on the **gear icon** (Settings) or go to Settings
   - Navigate to the **"API Keys"** or **"Account Details"** section
   - You'll find:
     - **Cloud Name**: Displayed prominently (e.g., `dxyz123abc`)
     - **API Key**: A long alphanumeric string
     - **API Secret**: Click "Reveal" to show your API secret (keep this secure!)

## Security Notes

- **Never commit** your `.env` file to version control
- Keep your API Secret secure and never expose it in client-side code
- The `.env` file is already in `.gitignore` for security
- These credentials are loaded automatically via `dotenv` in `config/database.js`

## Verification

After adding the credentials, restart your server. The Cloudinary configuration will be initialized automatically when the app starts.

