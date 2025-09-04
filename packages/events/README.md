# @tempsdarret/events

Shared event contracts for Temps D'arrêt Studio microservices architecture. This package provides TypeScript definitions for all platform events, ensuring type safety and consistency across services.

## Features

- **TypeScript-First**: TypeScript contracts are the source of truth
- **AsyncAPI Integration**: Automatically generates AsyncAPI 3.0 specifications
- **Build-time Validation**: Ensures contracts stay in sync across services
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Cross-Service Compatibility**: Shared library for event consumption

## Architecture

This package implements **Option 3** from our AsyncAPI integration options: TypeScript as the authoritative source with automatic AsyncAPI generation. The workflow is:

1. TypeScript contracts define event structures
2. AsyncAPI spec is generated from TypeScript interfaces  
3. Build-time validation ensures consistency
4. Services consume shared TypeScript contracts

## Installation

```bash
npm install @tempsdarret/events
```

## Usage

### Import Event Types

```typescript
import { 
  ShootCreatedEvent, 
  UserCreatedEvent, 
  InvitationCreatedEvent,
  SHOOT_EVENT_TYPES,
  USER_EVENT_TYPES 
} from '@tempsdarret/events';
```

### Event Validation

```typescript
import { validateEventStructure, isShootEvent } from '@tempsdarret/events';

const event = { /* some event payload */ };

if (validateEventStructure(event)) {
  if (isShootEvent(event)) {
    // Handle shoot event with type safety
    console.log(`Shoot ${event.data.shootId} was ${event.eventType}`);
  }
}
```

### Type Guards

```typescript
import { isUserEvent, isInviteEvent } from '@tempsdarret/events';

function handleEvent(event: PlatformEvent) {
  if (isUserEvent(event)) {
    // event is now typed as UserEvent
    console.log(`User event: ${event.eventType}`);
  } else if (isInviteEvent(event)) {
    // event is now typed as InviteEvent  
    console.log(`Invite event: ${event.eventType}`);
  }
}
```

## Available Events

### Shoot Events
- `shoot.created` - New photo shoot created
- `shoot.updated` - Shoot details updated
- `shoot.completed` - Photography session completed
- `shoot.delivered` - Photos delivered to client

### User Events
- `user.created` - New user account created
- `user.updated` - User profile updated
- `user.deactivated` - User account deactivated
- `user.verified` - User email verified

### Invitation Events
- `invitation.created` - Client invitation created
- `invitation.sent` - Invitation sent to client
- `magic.link.generated` - Magic login link generated
- `magic.link.used` - Magic link used for authentication

## Development Scripts

### Generation and Validation
```bash
# Generate AsyncAPI from TypeScript contracts
npm run generate:from-typescript

# Validate contracts are in sync
npm run validate:contracts

# Build the library
npm run build

# Publish to consuming services
npm run publish:contracts
```

### AsyncAPI Operations
```bash
# Validate AsyncAPI spec
npm run validate

# Generate documentation
npm run docs:generate

# Start AsyncAPI Studio
npm run docs:serve

# Bundle AsyncAPI spec
npm run bundle
```

## Build Process

The build process ensures TypeScript contracts remain the authoritative source:

1. **Generate**: Create AsyncAPI spec from TypeScript contracts
2. **Validate**: Check contracts are in sync with AsyncAPI spec
3. **Compile**: Build TypeScript library with type definitions
4. **Bundle**: Create bundled AsyncAPI spec for distribution

## Event Structure

All events follow a consistent structure based on ADR-023:

```typescript
interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
}
```

Shoot events include a `data` payload, while user and invitation events have flat structures.

## Service Integration

Services can consume this library by:

1. Adding dependency: `"@tempsdarret/events": "workspace:*"`
2. Importing required types and utilities
3. Removing duplicate event type definitions
4. Using type guards for event handling

## Validation Features

- **Structure Validation**: Ensures events have required fields
- **Type Guards**: Runtime type checking for event categories
- **Required Fields**: Validates event-specific required properties
- **Event Source**: Identifies which service should produce each event

## Files

- `src/contracts/` - TypeScript event contract definitions
- `src/types/` - Common types and utilities
- `src/utils/` - Validation and helper functions
- `scripts/` - Build and publishing automation
- `asyncapi.yaml` - Generated AsyncAPI 3.0 specification
- `dist/` - Compiled JavaScript and type definitions

## Contributing

When adding new events:

1. Add TypeScript interface to appropriate contract file
2. Run `npm run build` to regenerate AsyncAPI spec
3. Update consuming services with `npm run publish:contracts`
4. Verify validation passes with `npm run validate:contracts`

This ensures TypeScript remains the source of truth while maintaining AsyncAPI compatibility.