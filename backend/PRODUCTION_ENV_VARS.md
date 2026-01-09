# Critical Environment Variables for Production

## Required for Mega Reward System

### Backend URL (IMPORTANT!)
BACKEND_URL=https://dealing-india.onrender.com

### Frontend URL (IMPORTANT!)
FRONTEND_URL=https://dealing-india.vercel.app

## Notes:
- BACKEND_URL is used to generate share links
- FRONTEND_URL is used for redirects after click tracking
- Without these, the system will try to auto-detect from request headers
- In production, it's better to set them explicitly to avoid issues
