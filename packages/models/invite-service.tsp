import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "Invite Service API", 
  version: "1.0.0"
})
namespace InviteService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("Invitation status enumeration")
enum InvitationStatus {
  pending: "pending",
  sent: "sent",
  viewed: "viewed",
  accepted: "accepted",
  expired: "expired",
  revoked: "revoked"
}

@doc("Magic link model")
model MagicLink {
  @key
  @doc("Magic link token (64 character hex string)")
  @pattern("^[a-f0-9]{64}$")
  token: string;
  
  @doc("Associated shoot ID")
  shootId: string;
  
  @doc("Client email address")
  @format("email")
  clientEmail: string;
  
  @doc("Link expiration date")
  expiresAt: utcDateTime;
  
  @doc("Number of times link has been accessed")
  accessCount: int32 = 0;
  
  @doc("Last access timestamp")
  lastAccessedAt?: utcDateTime;
  
  @doc("Link is active")
  isActive: boolean = true;
  
  ...Timestamps
}

@doc("Invitation model")
model Invitation {
  @key
  @doc("Unique invitation identifier")
  id: string;
  
  @doc("Associated shoot ID")
  shootId: string;
  
  @doc("Client email address")
  @format("email")
  clientEmail: string;
  
  @doc("Invitation status")
  status: InvitationStatus;
  
  @doc("Magic link token")
  magicLinkToken: string;
  
  @doc("Invitation sent timestamp")
  sentAt?: utcDateTime;
  
  @doc("Invitation viewed timestamp")
  viewedAt?: utcDateTime;
  
  @doc("Invitation accepted timestamp")
  acceptedAt?: utcDateTime;
  
  @doc("Custom message for the client")
  @maxLength(1000)
  message?: string;
  
  ...Timestamps
}

@doc("Create invitation request")
model CreateInvitationRequest {
  @doc("Associated shoot ID")
  shootId: string;
  
  @doc("Client email address")
  @format("email")
  clientEmail: string;
  
  @doc("Custom message for the client")
  @maxLength(1000)
  message?: string;
}

@doc("Send invitation request")
model SendInvitationRequest {
  @doc("Custom email subject")
  @maxLength(200)
  subject?: string;
  
  @doc("Custom email template variables")
  templateVars?: Record<string>;
}

@doc("Invitation query parameters")
model InvitationQuery {
  @doc("Filter by shoot ID")
  @query
  shootId?: string;
  
  @doc("Filter by client email")
  @query
  clientEmail?: string;
  
  @doc("Filter by status")
  @query
  status?: InvitationStatus;
  
  @doc("Filter by date range start")
  @query
  fromDate?: utcDateTime;
  
  @doc("Filter by date range end")
  @query
  toDate?: utcDateTime;
  
  ...PaginationQuery
}

@route("/invitations")
interface InvitationOperations {
  @post
  @doc("Create a new invitation")
  createInvitation(@body invitation: CreateInvitationRequest): SuccessResponse<Invitation> | ApiError;
  
  @get
  @doc("List invitations with optional filtering")
  listInvitations(...InvitationQuery): PaginatedResponse<Invitation> | ApiError;
  
  @get
  @doc("Get invitation by ID")
  getInvitation(@path invitationId: string): SuccessResponse<Invitation> | ApiError;
  
  @post
  @route("/{invitationId}/send")
  @doc("Send invitation email")
  sendInvitation(@path invitationId: string, @body request: SendInvitationRequest): SuccessResponse<{sent: boolean}> | ApiError;
  
  @post
  @route("/{invitationId}/resend")
  @doc("Resend invitation email")
  resendInvitation(@path invitationId: string): SuccessResponse<{sent: boolean}> | ApiError;
  
  @delete
  @route("/{invitationId}")
  @doc("Revoke invitation")
  revokeInvitation(@path invitationId: string): SuccessResponse<Invitation> | ApiError;
}

@route("/magic-links")
interface MagicLinkOperations {
  @get
  @route("/{token}")
  @doc("Validate magic link token")
  validateMagicLink(@path token: string): SuccessResponse<MagicLink> | ApiError;
  
  @post
  @route("/{token}/access")
  @doc("Record magic link access")
  recordAccess(@path token: string): SuccessResponse<{accessCount: int32}> | ApiError;
}