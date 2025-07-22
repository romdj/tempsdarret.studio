import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "Temps D'arrêt Studio API",
  version: "0.1.0",
})
namespace TempsArret;

// Base models
model BaseEntity {
  id: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

// User domain
model User extends BaseEntity {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}

enum UserRole {
  PHOTOGRAPHER: "photographer",
  CLIENT: "client",
  ADMIN: "admin",
}

// Shoot domain
model Shoot extends BaseEntity {
  title: string;
  description?: string;
  clientId: string;
  photographerId: string;
  scheduledDate?: utcDateTime;
  status: ShootStatus;
  location?: string;
  totalPhotos?: int32;
  archiveSize?: int64; // bytes
}

enum ShootStatus {
  PLANNED: "planned",
  IN_PROGRESS: "in_progress", 
  COMPLETED: "completed",
  DELIVERED: "delivered",
  ARCHIVED: "archived",
}

// File domain
model FileMetadata extends BaseEntity {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: int64; // bytes
  shootId?: string;
  tags?: string[];
  isProcessed: boolean;
  storageUrl: string;
  thumbnailUrl?: string;
}

// Invitation domain
model Invitation extends BaseEntity {
  email: string;
  shootId: string;
  token: string;
  expiresAt: utcDateTime;
  usedAt?: utcDateTime;
  invitedBy: string;
}

// Portfolio domain
model PortfolioItem extends BaseEntity {
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  tags?: string[];
  isPublic: boolean;
  shootId?: string;
}