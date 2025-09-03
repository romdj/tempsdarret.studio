# ADR-020: Role-Based Access Control with Shoot-Level Permissions

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires granular access control for different user types (photographers, clients, assistants) with permissions that operate at both system-wide and individual shoot levels. Client data privacy and professional photographer workflow security are critical requirements.

### Access Control Requirements
- **Photographers** can manage their own shoots and client data
- **Clients** can only access their specific shoot galleries
- **Studio assistants** can help with specific assigned shoots
- **Admin users** have platform-wide management capabilities
- **Shoot-level permissions** override role-based defaults

## Decision

We will implement **Role-Based Access Control (RBAC)** with **shoot-level permission overrides**, allowing flexible access management that scales from individual photographer workflows to multi-photographer studio operations.

## Rationale

### Photography Domain Roles

```typescript
enum UserRole {
  PHOTOGRAPHER = 'photographer',
  CLIENT = 'client', 
  ASSISTANT = 'assistant',
  STUDIO_ADMIN = 'studio_admin',
  PLATFORM_ADMIN = 'platform_admin'
}

enum Permission {
  // Shoot management
  CREATE_SHOOT = 'shoots:create',
  READ_SHOOT = 'shoots:read',
  UPDATE_SHOOT = 'shoots:update',
  DELETE_SHOOT = 'shoots:delete',
  
  // Client management
  INVITE_CLIENT = 'clients:invite',
  VIEW_CLIENT_DATA = 'clients:read',
  
  // Gallery access
  VIEW_GALLERY = 'gallery:view',
  DOWNLOAD_PHOTOS = 'gallery:download',
  SELECT_FAVORITES = 'gallery:select',
  
  // File management
  UPLOAD_FILES = 'files:upload',
  PROCESS_FILES = 'files:process',
  DELETE_FILES = 'files:delete'
}
```

### Shoot-Level Permission System

```typescript
interface ShootPermission {
  shootId: string;
  userId: string;
  permissions: Permission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

class ShootAccessControl {
  async checkPermission(
    userId: string, 
    shootId: string, 
    permission: Permission
  ): Promise<boolean> {
    // 1. Check shoot-level permissions first
    const shootPermission = await this.getShootPermission(userId, shootId);
    if (shootPermission && shootPermission.permissions.includes(permission)) {
      return true;
    }
    
    // 2. Fall back to role-based permissions
    const userRole = await this.getUserRole(userId);
    const rolePermissions = this.getRolePermissions(userRole);
    
    // 3. Apply shoot ownership rules
    const shoot = await this.getShoot(shootId);
    if (shoot.photographerId === userId) {
      return rolePermissions.photographer.includes(permission);
    }
    
    if (shoot.clientEmail === await this.getUserEmail(userId)) {
      return rolePermissions.client.includes(permission);
    }
    
    return false;
  }
}
```

### Implementation Examples

**Photographer Access:**
```typescript
// Photographers can manage their own shoots
const photographerPermissions = {
  ownShoots: [
    Permission.READ_SHOOT,
    Permission.UPDATE_SHOOT,
    Permission.DELETE_SHOOT,
    Permission.INVITE_CLIENT,
    Permission.UPLOAD_FILES,
    Permission.PROCESS_FILES
  ],
  otherShoots: [] // No access by default
};
```

**Client Access:**
```typescript
// Clients can only access their specific shoots
const clientPermissions = {
  assignedShoots: [
    Permission.VIEW_GALLERY,
    Permission.DOWNLOAD_PHOTOS,
    Permission.SELECT_FAVORITES
  ],
  otherShoots: [] // No access
};
```

**Studio Assistant Access:**
```typescript
// Assistants need explicit shoot-level permissions
const assistantPermissions = {
  assignedShoots: [
    Permission.READ_SHOOT,
    Permission.UPLOAD_FILES,
    Permission.VIEW_GALLERY
  ],
  requiresExplicitGrant: true
};
```

## Implementation Architecture

### Permission Management Service

```typescript
class PermissionService {
  async grantShootPermission(
    shootId: string,
    userId: string,
    permissions: Permission[],
    grantedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    // Validate that grantor has permission to grant
    const canGrant = await this.checkPermission(
      grantedBy, 
      shootId, 
      Permission.MANAGE_PERMISSIONS
    );
    
    if (!canGrant) {
      throw new ForbiddenError('Insufficient permissions to grant access');
    }
    
    const shootPermission: ShootPermission = {
      shootId,
      userId,
      permissions,
      grantedBy,
      grantedAt: new Date(),
      expiresAt
    };
    
    await this.shootPermissionRepo.save(shootPermission);
    await this.publishPermissionGranted(shootPermission);
  }
}
```

## Trade-offs

### Benefits Gained
- **Granular access control** at both role and shoot levels
- **Client privacy protection** with strict data isolation
- **Flexible collaboration** through shoot-level permissions
- **Professional workflow support** for photography studios

### Accepted Trade-offs
- **Implementation complexity** with dual permission layers
- **Performance overhead** from permission checking
- **Administrative burden** for permission management

## Consequences

RBAC with shoot-level permissions provides the security and flexibility needed for professional photography workflows while maintaining strict client data privacy and supporting various studio collaboration models.