# Event-Driven Microservices Architecture with Kafka

---

## Core Microservices & Their Responsibilities

### 1. User Service  
- Manage user profiles, roles, and authentication data  
- Receive invite requests and handle user creation/update  
- Publish events: `UserCreated`, `UserUpdated`, `UserInvited`  
- Subscribe to events: `InviteAccepted`

### 2. Invite Service  
- Handle invite flows: generate invite codes, magic links, and send emails  
- Store invite metadata and status  
- Publish events: `InviteCreated`, `InviteSent`, `InviteAccepted`  
- Subscribe to: `UserRegistered` or `UserCreated` to link invite with user  

### 3. Auth Service  
- Handle authentication flows (magic link validation, token issuance)  
- Manage session/token lifecycle  
- Publish events: `UserLoggedIn`, `UserLoggedOut`  
- Subscribe to: `InviteAccepted` to activate user login access  

### 4. Portfolio Service  
- Manage portfolio content: photos, categories, descriptions  
- Publish events: `PortfolioItemCreated`, `PortfolioItemUpdated`  
- Subscribe to: none or optional (e.g., listen for `UserDeleted` to cleanup)

### 5. Event & Gallery Service  
- Manage client-specific events and galleries  
- Track client invitations and gallery access  
- Publish events: `EventCreated`, `GalleryUpdated`, `FilesUploaded`  
- Subscribe to: `UserInvited`, `UserCreated` to assign events to clients  

### 6. File Service  
- Handle file uploads, storage, and secure downloads  
- Generate signed URLs or tokens for secure access  
- Publish events: `FileUploaded`, `FileDeleted`  
- Subscribe to: `UserDeleted` or `EventDeleted` for cleanup  

### 7. Notification Service  
- Send emails, SMS, or push notifications (e.g., invite emails, login confirmations)  
- Subscribe to: `InviteCreated`, `InviteSent`, `UserLoggedIn`  

### 8. API Gateway / BFF (Backend For Frontend)  
- Expose unified API to frontend clients  
- Aggregate data from microservices  
- Manage authentication tokens/session  
- Forward commands/events to Kafka topics as needed  

---

## Example Event Flow for Invite Flow

1. Frontend calls API Gateway → sends `CreateInvite` command  
2. API Gateway calls Invite Service → creates invite code, stores metadata  
3. Invite Service publishes `InviteCreated` event to Kafka  
4. Notification Service subscribes to `InviteCreated` → sends magic link email to client  
5. Client clicks magic link → frontend calls API Gateway → API Gateway calls Auth Service  
6. Auth Service validates token, publishes `InviteAccepted` event  
7. User Service subscribes to `InviteAccepted` → creates or activates user account  
8. Event & Gallery Service subscribes to `UserInvited` or `UserCreated` → links galleries/events to the user  

---

## Kafka Topics Examples

| Topic Name         | Description                          | Producers                 | Consumers                        |
|--------------------|------------------------------------|---------------------------|---------------------------------|
| `user.created`       | User account created               | User Service              | Invite, Event Service            |
| `user.invited`       | User invitation sent               | Invite Service            | Event & Gallery, Notification   |
| `invite.created`     | New invite generated               | Invite Service            | Notification Service            |
| `invite.accepted`    | Invite accepted (user completed)  | Auth Service              | User Service, Event & Gallery   |
| `file.uploaded`      | New file uploaded                  | File Service              | Event & Gallery                 |
| `notification.sent`  | Notification dispatched            | Notification Service      | Monitoring/Logging              |

---

## Additional Considerations

- Use **Kafka consumer groups** for scaling and fault tolerance  
- Ensure **idempotency** in event processing to avoid duplicate effects  
- Consider **event schema validation** using Apache Avro or JSON Schema  
- Implement **dead-letter queues** for failed events  
- Use **Kafka Connectors** to integrate with databases or storage if needed  
- Design for **event sourcing** if you want audit/history capabilities

---

Would you like me to help with:  
- Defining Kafka topic schemas (Avro/JSON) for these events?  
- Sample microservice code structure with event producers and consumers?  
- An architectural diagram?  
