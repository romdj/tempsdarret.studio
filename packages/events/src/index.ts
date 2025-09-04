/**
 * @tempsdarret/events - Shared Event Contracts Library
 * 
 * This library provides TypeScript definitions for all events in the Temps D'arrêt Studio platform.
 * Generated from service-specific TypeScript contracts, ensuring type safety across services.
 * 
 * Usage:
 * ```typescript
 * import { ShootCreatedEvent, UserCreatedEvent } from '@tempsdarret/events';
 * ```
 */

// Re-export all event types from service contracts
export * from './contracts/shoots.events.js';
export * from './contracts/users.events.js';
export * from './contracts/invites.events.js';

// Common types and utilities
export * from './types/common.js';
export * from './utils/event-validation.js';