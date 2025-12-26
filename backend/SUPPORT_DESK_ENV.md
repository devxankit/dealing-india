# Support Desk Environment Variables

## Socket.io Configuration

Add the following environment variable to your `.env` file:

```env
# Socket.io CORS Configuration
# Comma-separated list of allowed frontend origins for Socket.io connections
# Include all frontend URLs (development, staging, production) that need to connect
SOCKET_CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

### Why is this needed?

- **CORS (Cross-Origin Resource Sharing)**: Socket.io requires CORS configuration to allow frontend applications from different origins to establish WebSocket connections.
- **Security**: This restricts which frontend applications can connect to your Socket.io server, preventing unauthorized access.
- **Authentication**: Socket.io connections authenticate using JWT tokens passed in the `auth.token` field during handshake.

### How Socket.io uses CORS & Auth

1. **Connection**: Frontend connects to Socket.io server with JWT token in `auth.token`
2. **Authentication**: Server verifies JWT token using the same `JWT_SECRET` as REST API
3. **Authorization**: Based on token role (admin/user/vendor), different socket event handlers are enabled
4. **CORS Check**: Server checks if the origin is in the allowed `SOCKET_CORS_ORIGIN` list

### Example .env file

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/dealing-india

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Socket.io
SOCKET_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Production Setup

For production, update `SOCKET_CORS_ORIGIN` to include your production frontend URL:

```env
SOCKET_CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

