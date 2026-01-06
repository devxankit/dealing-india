---
name: Chat and Support Ticket System Implementation
overview: ""
todos: []
---

# Chat and Support Ticket System Implementation Plan

## Overview

This plan implements two major modules:

1. **User ↔ Vendor Chat + Call System** - Real-time chat between users and vendors with call functionality
2. **Support Ticket System** - Complete ticket management for Users, Vendors, and Admins with real-time updates

## Architecture Overview

```mermaid
graph TB
subgraph Frontend["Frontend Apps"]
UserApp[User App]
VendorApp[Vendor App]
AdminApp[Admin App]
end

subgraph Backend["Backend Services"]
ChatAPI[Chat API]
TicketAPI[Support Ticket API]
SocketIO[Socket.IO Server]
NotificationService[Notification Service]
end

subgraph Database["MongoDB Collections"]
Conversations[Conversations]
Messages[Messages]
SupportTickets[Support Tickets]
TicketMessages[Ticket Messages]
Notifications[Notifications]
end

UserApp -->|HTTP| ChatAPI
UserApp -->|HTTP| Ti



## Module 1: User ↔ Vendor Chat + Call System

### Phase 1: Database Models

**Files to create/modify:**

- `backend/models/Chat.model.js` (currently empty)

- `backend/models/Message.model.js` (currently empty)

**Chat Model Schema:**

- `participants`: Array of objects with `userId` and `role` (user/vendor)

- `lastMessage`: Reference to last message

- `lastMessageAt`: Timestamp

- `unreadCount`: Object with counts per participant

- `createdAt`, `updatedAt`

**Message Model Schema:**

- `conversationId`: Reference to Chat

- `senderId`: ObjectId (user or vendor)

- `senderRole`: Enum (user/vendor)
- `receiverId`: ObjectId
- `message`: String
- `readStatus`: Boolean
- `readAt`: Date

- `createdAt`, `updatedAt`

### Phase 2: Backend Implementation

**Files to create:**

- `backend/services/chat.service.js` - Chat business logic

- `backend/controllers/user-controllers/chat.controller.js` - User chat endpoints

- `backend/controllers/vendor-controllers/chat.controller.js` - Vendor chat endpoints
- `backend/routes/userChat.routes.js` - User chat routes

- `backend/routes/vendorChat.routes.js` - Vendor chat routes

**API Endpoints:User Chat APIs:**

- `POST /api/user/chat/conversations` - Create or get conversation with vendor

- `GET /api/user/chat/conversations` - Get user's conversations

- `GET /api/user/chat/conversations/:id/messages` - Get messages with pagination

- `POST /api/user/chat/messages` - Send message

- `PUT /api/user/chat/messages/:id/read` - Mark message as read

- `PUT /api/user/chat/conversations/:id/read-all` - Mark all messages as read

**Vendor Chat APIs:**

- `GET /api/vendor/chat/conversations` - Get vendor's conversations with users

- `GET /api/vendor/chat/conversations/:id/messages` - Get messages with pagination

- `POST /api/vendor/chat/messages` - Send message

- `PUT /api/vendor/chat/messages/:id/read` - Mark message as read

- `PUT /api/vendor/chat/conversations/:id/read-all` - Mark all messages as read

**Socket.IO Events (in `backend/config/socket.io.js`):**

- `join_chat_room` - Join conversation room
- `send_message` - Send message event

- `receive_message` - Receive message event

- `message_read` - Message read confirmation
- `typing_start` - Typing indicator start (optional)

- `typing_stop` - Typing indicator stop (optional)

### Phase 3: Frontend Implementation

**User Side:**

**Files to create/modify:**

- `frontend/src/modules/UserWeb/pages/VendorStore.jsx` - Add Chat and Call buttons below vendor details

- `frontend/src/modules/UserWeb/pages/Chat.jsx` - New chat page component

- `frontend/src/modules/UserWeb/components/Chat/ChatWindow.jsx` - Chat UI component

- `frontend/src/modules/UserWeb/components/Chat/MessageList.jsx` - Message list component

- `frontend/src/modules/UserWeb/components/Chat/MessageInput.jsx` - Message input component

- `frontend/src/shared/services/chatService.js` - Chat API service

**Vendor Side:**

**Files to create/modify:**

- `frontend/src/modules/Vendor/config/vendorMenu.json` - Add "User Chat" menu item
- `frontend/src/modules/Vendor/pages/Chat.jsx` - New chat page component

- `frontend/src/modules/Vendor/components/Chat/UserChatList.jsx` - User list component

- `frontend/src/modules/Vendor/components/Chat/ChatWindow.jsx` - Chat window component

- `frontend/src/modules/Vendor/components/Chat/MessageList.jsx` - Message list component

- `frontend/src/modules/Vendor/components/Chat/MessageInput.jsx` - Message input component

**Call Functionality:**

- Implement `tel:` link redirect on Call button click

- Extract vendor mobile number from vendor data

- No backend API needed for calling

### Phase 4: Real-time Integration

**Socket.IO Client Integration:**

- Use existing `frontend/src/shared/utils/socket.js` utility

- Connect to Socket.IO on chat page mount

- Join conversation room on conversation selection

- Listen for `receive_message` events
- Emit `send_message` events
- Handle `message_read` confirmations

## Module 2: Support Ticket System

### Phase 1: Database Models

**Files to modify:**

- `backend/models/SupportTicket.model.js` - Extend to support users (currently vendor-only)

**SupportTicket Model Extensions:**

- Add `createdByRole`: Enum (user/vendor) - replace vendorId requirement

- Add `userId`: Reference to User (optional, for user tickets)

- Keep `vendorId`: Reference to Vendor (optional, for vendor tickets)

- Add `messages`: Array of message objects (or create separate TicketMessage model)
- Update indexes for role-based queries

**New Model (Optional):**

- `backend/models/TicketMessage.model.js` - Separate messages collection
- `ticketId`: Reference to SupportTicket

- `senderId`: ObjectId

- `senderRole`: Enum (user/vendor/admin)
- `message`: String

- `createdAt`, `updatedAt`

### Phase 2: Backend Implementation

**Files to create/modify:**

- `backend/services/supportTicket.service.js` - Extend to handle users

- `backend/controllers/user-controllers/supportTicket.controller.js` - New user ticket controller
- `backend/routes/userSupportTicket.routes.js` - New user ticket routes

- `backend/controllers/admin-controllers/supportTicket.controller.js` - Extend to show user tickets

- `backend/controllers/vendor-controllers/supportTicket.controller.js` - Already exists, verify compatibility

**API Endpoints:User Support Ticket APIs:**

- `POST /api/user/support-tickets` - Create ticket

- `GET /api/user/support-tickets` - Get user's tickets

- `GET /api/user/support-tickets/:id` - Get ticket details

- `POST /api/user/support-tickets/:id/reply` - Reply to ticket

**Vendor Support Ticket APIs:**

- Already exist, verify they work correctly

**Admin Support Ticket APIs:**

- `GET /api/admin/support-tickets` - Extend to filter by role (user/vendor)

- `POST /api/admin/support-tickets/:id/reply` - Reply to ticket

- `PATCH /api/admin/support-tickets/:id/status` - Update ticket status

**Socket.IO Events (in `backend/config/socket.io.js`):**

- `join_ticket_room` - Join ticket room

- `ticket_message` - Send ticket message

- `ticket_updated` - Ticket status/message update

- `ticket_status_changed` - Status change notification

### Phase 3: Frontend Implementation

**User Side:**

**Files to create/modify:**

- `frontend/src/modules/UserWeb/pages/Profile.jsx` - Add Support Ticket tab/section

- `frontend/src/modules/UserWeb/pages/SupportTickets.jsx` - New support tickets page

- `frontend/src/modules/UserWeb/components/SupportTicket/TicketList.jsx` - Ticket list component

- `frontend/src/modules/UserWeb/components/SupportTicket/TicketDetail.jsx` - Ticket detail component

- `frontend/src/modules/UserWeb/components/SupportTicket/CreateTicket.jsx` - Create ticket form

- `frontend/src/shared/services/supportTicketService.js` - Support ticket API service

**Vendor Side:**

**Files to create/modify:**

- `frontend/src/modules/Vendor/config/vendorMenu.json` - Verify "Support Tickets" exists (already present)

- `frontend/src/modules/Vendor/pages/SupportTickets.jsx` - Create if doesn't exist

- `frontend/src/modules/Vendor/components/SupportTicket/TicketList.jsx` - Ticket list component

- `frontend/src/modules/Vendor/components/SupportTicket/TicketDetail.jsx` - Ticket detail component

- `frontend/src/modules/Vendor/components/SupportTicket/CreateTicket.jsx` - Create ticket form

**Admin Side:**

**Files to create/modify:**

- `frontend/src/modules/Admin/config/adminMenu.json` - Verify "Support" section exists

- `frontend/src/modules/Admin/pages/support/Tickets.jsx` - Extend to show user and vendor tickets

- `frontend/src/modules/Admin/components/SupportTicket/TicketFilters.jsx` - Add role filter

- `frontend/src/modules/Admin/components/SupportTicket/TicketDetail.jsx` - Extend for user tickets

### Phase 4: Notifications Integration

**Files to modify:**

- `backend/services/notification.service.js` - Add ticket notification methods

- `backend/services/supportTicket.service.js` - Integrate notification service

- `backend/config/socket.io.js` - Emit notifications on ticket updates

**Notification Types to Add:**

- `ticket_created` - When user/vendor creates ticket

- `ticket_replied` - When admin replies

- `ticket_status_changed` - When status changes
- `chat_message` - When new chat message received

**Frontend Notification Integration:**

- Update notification badge counts
- Show real-time notifications via Socket.IO

- Navigate to relevant page on notification click

## Implementation Details

### Security & Permissions

1. **Chat System:**

- Users can only chat with vendors they've interacted with (or all vendors based on business logic)
- Vendors can only see chats with users who initiated conversation
- Strict validation: User can only access their own conversations

- Vendor can only access conversations where they are participant

2. **Support Ticket System:**

- Users can only access their own tickets

- Vendors can only access their own tickets

- Admins can access all tickets

- Role-based filtering in admin panel

### Real-time Features

1. **Chat:**

- Messages saved to database immediately
- Socket.IO emits to conversation participants
- Read receipts updated in real-time
- Unread count badges update automatically

2. **Support Tickets:**

- New messages appear instantly

- Status changes reflect immediately

- Admin replies notify user/vendor instantly

- Notification badges update in real-time

### Error Handling

- Proper error responses for all APIs

- Loading states in UI

- Empty states for no conversations/tickets
- Error boundaries for chat components
- Retry logic for failed Socket.IO connections

### Testing Checklist

- [ ] User can initiate chat with vendor
- [ ] Vendor receives chat notification
- [ ] Messages persist in database

- [ ] Real-time message delivery works

- [ ] Read receipts update correctly

- [ ] Call button redirects to phone dialer

- [ ] User can create support ticket
- [ ] Vendor can create support ticket
- [ ] Admin can view all tickets

- [ ] Admin can reply to tickets
- [ ] Status changes reflect in real-time

- [ ] Notifications work correctly

- [ ] Pagination works for messages/tickets

- [ ] Permissions enforced correctly

## File Structure Summary

### Backend Files to Create/Modify

**Models:**

- `backend/models/Chat.model.js` (create)

- `backend/models/Message.model.js` (create)

- `backend/models/SupportTicket.model.js` (modify)

- `backend/models/TicketMessage.model.js` (optional, create)

**Services:**

- `backend/services/chat.service.js` (create)

- `backend/services/supportTicket.service.js` (modify)

**Controllers:**

- `backend/controllers/user-controllers/chat.controller.js` (create)
- `backend/controllers/vendor-controllers/chat.controller.js` (create)

- `backend/controllers/user-controllers/supportTicket.controller.js` (create)

- `backend/controllers/admin-controllers/supportTicket.controller.js` (modify)

- `backend/controllers/vendor-controllers/supportTicket.controller.js` (verify)

**Routes:**

- `backend/routes/userChat.routes.js` (create)

- `backend/routes/vendorChat.routes.js` (create)

- `backend/routes/userSupportTicket.routes.js` (create)
- `backend/routes/adminSupportTicket.routes.js` (modify)

- `backend/routes/vendorSupportTicket.routes.js` (verify)

**Socket.IO:**

- `backend/config/socket.io.js` (modify - add chat and ticket events)

### Frontend Files to Create/Modify

**User App:**

- `frontend/src/modules/UserWeb/pages/VendorStore.jsx` (modify - add buttons)

- `frontend/src/modules/UserWeb/pages/Chat.jsx` (create)
- `frontend/src/modules/UserWeb/pages/SupportTickets.jsx` (create)

- `frontend/src/modules/UserWeb/pages/Profile.jsx` (modify - add tickets section)

- `frontend/src/modules/UserWeb/components/Chat/*` (create components)

- `frontend/src/modules/UserWeb/components/SupportTicket/*` (create components)

**Vendor App:**

- `frontend/src/modules/Vendor/config/vendorMenu.json` (modify - add User Chat)

- `frontend/src/modules/Vendor/pages/Chat.jsx` (create)

- `frontend/src/modules/Vendor/pages/SupportTickets.jsx` (create if missing)

- `frontend/src/modules/Vendor/components/Chat/*` (create components)

- `frontend/src/modules/Vendor/components/SupportTicket/*` (create components)

**Admin App:**

- `frontend/src/modules/Admin/pages/support/Tickets.jsx` (modify - add user tickets)

- `frontend/src/modules/Admin/components/SupportTicket/*` (modify components)

**Shared:**

- `frontend/src/shared/services/chatService.js` (create)

- `frontend/src/shared/services/supportTicketService.js` (create)

- `frontend/src/shared/utils/socket.js` (verify - already exists)

## Route Registration

**Backend (`backend/server.js`):**

- Register user chat routes: `/api/user/chat`
- Register vendor chat routes: `/api/vendor/chat`

- Register user support ticket routes: `/api/user/support-tickets`

- Verify existing vendor/admin support ticket routes

**Frontend (`frontend/src/App.jsx`):**

- Add `/app/chat/:vendorId?` route for user chat


```