# Socket.io Implementation Analysis & Environment Variables Guide

## ✅ Socket.io Implementation Status

### Backend Implementation ✅
- **Location**: `backend/config/socket.io.js`
- **Status**: Properly implemented
- **Features**:
  - ✅ JWT Authentication middleware
  - ✅ CORS configuration
  - ✅ Role-based event handlers (admin/user/vendor)
  - ✅ Real-time messaging for tickets
  - ✅ Real-time messaging for live chat
  - ✅ Ticket status updates
  - ✅ Typing indicators support
  - ✅ Error handling

### Frontend Implementation ✅
- **Locations**: 
  - `frontend/src/modules/Admin/pages/support/Tickets.jsx`
  - `frontend/src/modules/Admin/pages/support/LiveChat.jsx`
- **Status**: Properly implemented
- **Features**:
  - ✅ Socket.io client connection
  - ✅ JWT token authentication
  - ✅ Real-time message receiving
  - ✅ Real-time ticket updates
  - ✅ REST API fallback if socket disconnected
  - ✅ Proper cleanup on component unmount

## 🔧 Environment Variables Required

### Backend (.env file)

**REQUIRED:**
```env
# Socket.io CORS Configuration
# Comma-separated list of allowed frontend origins
# IMPORTANT: Include your frontend URL here
SOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

**Why needed:**
- Socket.io requires CORS to allow frontend connections
- Without this, frontend cannot establish WebSocket connection
- Security: Prevents unauthorized origins from connecting

**Default behavior:**
- If `SOCKET_CORS_ORIGIN` is not set, defaults to: `['http://localhost:5173', 'http://localhost:3000']`
- But it's **recommended to set it explicitly** in `.env`

### Frontend (.env file)

**OPTIONAL (but recommended):**
```env
# API Base URL (if different from default)
VITE_API_BASE_URL=http://localhost:5000/api
```

**Why optional:**
- Default value is already set: `http://localhost:5000/api`
- Socket.io URL is automatically derived: `API_BASE_URL.replace('/api', '')` = `http://localhost:5000`
- Only needed if backend runs on different port/domain

**Current Setup:**
- Frontend runs on: `http://localhost:3000` (from vite.config.js)
- Backend runs on: `http://localhost:5000` (default PORT)
- Socket.io connects to: `http://localhost:5000` (derived from API_BASE_URL)

## 📋 Complete .env File Examples

### Backend .env
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/dealing-india

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Socket.io CORS Configuration
# Include all frontend URLs that need to connect
SOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Frontend .env (Optional)
```env
# API Configuration (only if backend URL is different)
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🔍 How Socket.io Connection Works

### Connection Flow:
1. **Frontend** connects to Socket.io server using:
   ```javascript
   const socket = io(API_BASE_URL.replace('/api', ''), {
     auth: { token },  // JWT token from localStorage
     transports: ['websocket', 'polling'],
   });
   ```

2. **Backend** receives connection and:
   - Extracts token from `socket.handshake.auth.token`
   - Verifies JWT token using `verifyToken()`
   - Checks user role (admin/user/vendor)
   - Validates CORS origin against `SOCKET_CORS_ORIGIN`
   - Attaches user info to socket

3. **Events**:
   - Frontend emits: `join_ticket_room`, `send_message`, `send_chat_message`, etc.
   - Backend emits: `message_received`, `ticket_updated`, `error`, etc.

## ⚠️ Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Cross-Origin Request Blocked`
**Solution**: Add frontend URL to `SOCKET_CORS_ORIGIN` in backend `.env`

### Issue 2: Authentication Failed
**Error**: `Authentication token required` or `Invalid or expired token`
**Solution**: 
- Check if `admin-token` exists in localStorage
- Verify JWT_SECRET matches in backend
- Check token expiration

### Issue 3: Socket Not Connecting
**Error**: Socket connection timeout
**Solution**:
- Verify backend is running on correct port
- Check `SOCKET_CORS_ORIGIN` includes frontend URL
- Verify firewall/network settings

## ✅ Verification Checklist

- [ ] Backend `.env` has `SOCKET_CORS_ORIGIN` set
- [ ] Frontend URL is included in `SOCKET_CORS_ORIGIN`
- [ ] Backend server is running
- [ ] Frontend can connect to REST API
- [ ] Admin is logged in (has `admin-token` in localStorage)
- [ ] Socket.io connection shows in browser console: "Socket connected"

## 🚀 Production Setup

For production, update both files:

### Backend .env (Production)
```env
SOCKET_CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Frontend .env (Production)
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## 📝 Summary

**Backend needs:**
- ✅ `SOCKET_CORS_ORIGIN` in `.env` (REQUIRED)

**Frontend needs:**
- ✅ Nothing additional (uses existing `VITE_API_BASE_URL` or default)
- ✅ Socket.io URL is auto-derived from API_BASE_URL

**Current Working Setup:**
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- Socket.io: Connects to `http://localhost:5000`
- CORS: Must include `http://localhost:3000` in backend `.env`

