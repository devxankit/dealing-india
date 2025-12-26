# Vendor Support Chat & Tickets - Environment Variables

## Backend Environment Variables

The backend environment variables are already documented in `SUPPORT_DESK_ENV.md`. The following variable is required:

```env
# Socket.io CORS Configuration
SOCKET_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Frontend Environment Variables

Create or update `frontend/.env` (or `frontend/.env.local`) with the following:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api

# Socket.io Server URL (without /api prefix)
VITE_SOCKET_URL=http://localhost:5000
```

### Explanation

- **VITE_API_BASE_URL**: Base URL for REST API calls. Used by the `api` utility in `frontend/src/shared/utils/api.js`
- **VITE_SOCKET_URL**: Socket.io server URL. Used by the socket utility in `frontend/src/shared/utils/socket.js` to establish WebSocket connections

### Production Setup

For production, update both variables:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
```

Note: The Socket.io server runs on the same server as the REST API, so both URLs should point to the same backend server (with `/api` prefix for REST, without prefix for Socket.io).

## Dependencies

### Frontend

Ensure `socket.io-client` is installed:

```bash
cd frontend
npm install socket.io-client
```

If it's not already installed, add it to `package.json` dependencies.

### Backend

Socket.io is already configured in the backend. No additional dependencies needed.

