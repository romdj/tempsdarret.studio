# ADR-003: Magic Link Authentication (Passwordless)

## Status
Accepted

Date: 2025-01-09

## Context
The photography platform serves two main user types: photographers (who manage the platform) and clients (who view and access their photos). Clients are typically non-technical users who may struggle with password management, while photographers need secure but convenient access to manage their business. The platform handles sensitive client photos and personal information, requiring strong security. However, user experience is critical for client adoption - complex authentication flows could prevent clients from accessing their photos.

## Decision
Implement passwordless authentication using magic links sent via email:

- **Magic Link Flow**: Users enter email → receive secure link → click to authenticate → JWT token issued
- **Token Expiry**: JWT tokens expire after 15 minutes to limit exposure
- **Link Expiry**: Magic links expire after 15 minutes and are single-use only
- **No Password Storage**: No passwords stored anywhere in the system
- **Role-Based Access**: JWT contains user role (photographer/client) and shoot permissions

Technical implementation:
- Generate cryptographically secure 64-character hex tokens
- Store tokens with email, expiry, and associated shoot/user context
- Send tokens via email with deep links to appropriate client interfaces
- Validate tokens server-side and issue short-lived JWTs
- Invalidate used tokens immediately

## Alternatives Considered

- **Traditional Password Authentication**: Email/password with secure password requirements
  - Rejected: Password management burden on non-technical photography clients, support overhead for forgotten passwords
- **OAuth Providers (Google/Apple/Facebook)**: Third-party authentication
  - Rejected: Not all photography clients have these accounts, dependency on external services, privacy concerns
- **SMS-Based Magic Links**: Send authentication codes via SMS
  - Rejected: SMS delivery issues, international client support complexity, carrier dependencies
- **Multi-Factor Authentication**: Password + additional factor
  - Rejected: Too complex for photography clients who just want to view their photos
- **Session-Based Authentication**: Server-side sessions with cookies
  - Rejected: Doesn't work well with mobile apps, harder to scale across microservices

## Consequences

### Positive
- Excellent user experience for photography clients (no passwords to remember)
- Strong security (no password breaches, short-lived tokens, unique links)
- Reduced support burden (no password reset requests)
- Mobile-friendly (deep links work well in photography apps)
- Stateless authentication scales across microservices
- Email provides audit trail of access attempts

### Negative
- Dependency on email delivery (spam folders, email provider issues)
- Users without email access cannot authenticate
- Token security depends on email account security
- No offline authentication capability
- Potential for email link forwarding (though mitigated by single-use tokens)

### Neutral
- Requires robust email infrastructure and delivery monitoring
- Need clear UX for expired or invalid links
- Email templates must be professional and trustworthy for photography business

## Implementation Notes
- Tokens stored in dedicated authentication service with automatic cleanup of expired tokens
- Email delivery via reliable service (SendGrid/AWS SES) with delivery tracking
- Deep links route to appropriate client interface based on user role and context
- Rate limiting on magic link requests to prevent abuse
- Clear error handling for expired/invalid/used tokens
- Graceful fallback for email delivery failures

Security considerations:
- Tokens are cryptographically random, not sequential or predictable
- Links include domain validation to prevent redirect attacks  
- HTTPS required for all magic link endpoints
- Tokens are hashed in database storage
- IP address logging for suspicious authentication patterns

## Related Decisions
- [ADR-010: JWT Security Pattern](./adr-010-jwt-security.md)
- [ADR-020: Role-Based Access Control](./adr-020-rbac-permissions.md)

## References
- [Auth0 Magic Links Guide](https://auth0.com/docs/authenticate/passwordless/authentication-methods/email-magic-link)
- [OWASP Authentication Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)