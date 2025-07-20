# User Service

## Overview
Manages user accounts, authentication, and role-based access control. Handles both admin users and client records for project access tracking.

## Responsibilities
- **User account management**: Create, update, and manage user profiles
- **Authentication**: Magic link generation and validation
- **Role management**: Admin vs client access control
- **Session management**: JWT token issuance and validation
- **User preferences**: Settings and notification preferences

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens + magic links
- **Testing**: Jest with supertest for API testing

## API Endpoints

### Authentication
- `POST /auth/magic-link` - Generate and send magic link
- `GET /auth/validate/{token}` - Validate magic link and issue JWT
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Invalidate session

### User Management
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /admin/users` - List all users (admin only)
- `POST /admin/users` - Create new user (admin only)
- `DELETE /admin/users/{id}` - Delete user (admin only)

## Database Schema

### User Document
```typescript
{
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'client';
  projectAccess: string[]; // Array of project IDs
  preferences: {
    emailNotifications: boolean;
    language: string;
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Document
```typescript
{
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
```

## Event Publishing (Kafka)
- `user.created` - New user account created
- `user.updated` - User profile updated
- `user.login` - User successful login
- `user.logout` - User logout
- `magic-link.generated` - Magic link created
- `magic-link.used` - Magic link validated

## Event Consumption
- `project.access-granted` - Add project to user access list
- `project.access-revoked` - Remove project from user access list
- `invite.accepted` - Link invite to user account

## Implementation Phases

### Phase 1: Basic Authentication
- [ ] Set up Express.js service with TypeScript
- [ ] Implement MongoDB connection and user schema
- [ ] Create magic link generation and validation
- [ ] Build JWT token management
- [ ] Add basic user CRUD operations

### Phase 2: Role-Based Access
- [ ] Implement admin/client role system
- [ ] Add project access control
- [ ] Create middleware for route protection
- [ ] Build user preference management
- [ ] Add session tracking and analytics

### Phase 3: Integration & Events
- [ ] Set up Kafka event publishing
- [ ] Implement event consumers for project access
- [ ] Add comprehensive error handling
- [ ] Create health checks and monitoring
- [ ] Add rate limiting and security features

## Security Considerations
- **Magic link expiration**: 1-hour validity
- **JWT token rotation**: Regular refresh cycle
- **Rate limiting**: Prevent brute force attacks
- **Input validation**: Comprehensive request validation
- **Audit logging**: Track all authentication events

## Quality Standards
- **TypeScript strict mode**: No `any` types
- **Unit test coverage**: >90% for business logic
- **Integration tests**: API endpoint validation
- **Error handling**: Graceful failure modes
- **Logging**: Structured logs with correlation IDs