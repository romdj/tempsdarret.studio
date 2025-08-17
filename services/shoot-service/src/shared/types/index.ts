// Event types based on AsyncAPI schema
export interface ShootCreatedEvent {
  eventId: string;
  timestamp: string;
  eventType: 'shoot.created';
  shootId: string;
  clientEmail: string;
  photographerId: string;
  title: string;
  scheduledDate?: string;
}

// API types
export interface CreateShootRequest {
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
}

export interface ShootResponse {
  id: string;
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
  status: 'planned';
  createdAt: string;
}