import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "Notification Service API",
  version: "1.0.0" 
})
namespace NotificationService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("Notification type enumeration")
enum NotificationType {
  email: "email",
  sms: "sms",
  push: "push",
  webhook: "webhook"
}

@doc("Notification status enumeration") 
enum NotificationStatus {
  pending: "pending",
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  bounced: "bounced"
}

@doc("Email template enumeration")
enum EmailTemplate {
  shoot_invitation: "shoot_invitation",
  shoot_reminder: "shoot_reminder",
  gallery_ready: "gallery_ready",
  files_delivered: "files_delivered",
  magic_link: "magic_link"
}

@doc("Notification model")
model Notification {
  @key
  @doc("Unique notification identifier")
  id: string;
  
  @doc("Notification type")
  type: NotificationType;
  
  @doc("Recipient address (email, phone, device token, etc.)")
  recipient: string;
  
  @doc("Notification subject/title")
  @maxLength(500)
  subject: string;
  
  @doc("Notification content/body")
  content: string;
  
  @doc("Notification status")
  status: NotificationStatus;
  
  @doc("Associated shoot ID (optional)")
  shootId?: string;
  
  @doc("Associated user ID (optional)")
  userId?: string;
  
  @doc("Email template used (for email notifications)")
  emailTemplate?: EmailTemplate;
  
  @doc("Template variables used")
  templateVars?: Record<string>;
  
  @doc("Number of retry attempts")
  retryCount: int32 = 0;
  
  @doc("Maximum retry attempts")
  maxRetries: int32 = 3;
  
  @doc("Next retry timestamp")
  nextRetryAt?: utcDateTime;
  
  @doc("Scheduled send time")
  scheduledAt?: utcDateTime;
  
  @doc("Actual sent timestamp")
  sentAt?: utcDateTime;
  
  @doc("Delivery confirmation timestamp")
  deliveredAt?: utcDateTime;
  
  @doc("Error message (if failed)")
  errorMessage?: string;
  
  @doc("External provider message ID")
  providerMessageId?: string;
  
  ...Timestamps
}

@doc("Send notification request")
model SendNotificationRequest {
  @doc("Notification type")
  type: NotificationType;
  
  @doc("Recipient address")
  recipient: string;
  
  @doc("Notification subject/title")
  @maxLength(500)
  subject: string;
  
  @doc("Notification content/body")
  content: string;
  
  @doc("Associated shoot ID (optional)")
  shootId?: string;
  
  @doc("Associated user ID (optional)")
  userId?: string;
  
  @doc("Schedule notification for future delivery")
  scheduledAt?: utcDateTime;
}

@doc("Send email from template request")
model SendTemplateEmailRequest {
  @doc("Recipient email address")
  @format("email")
  recipient: string;
  
  @doc("Email template to use")
  template: EmailTemplate;
  
  @doc("Template variables")
  templateVars: Record<string>;
  
  @doc("Associated shoot ID (optional)")
  shootId?: string;
  
  @doc("Associated user ID (optional)")
  userId?: string;
  
  @doc("Schedule email for future delivery")
  scheduledAt?: utcDateTime;
}

@doc("Notification query parameters")
model NotificationQuery {
  @doc("Filter by type")
  @query
  type?: NotificationType;
  
  @doc("Filter by status")
  @query
  status?: NotificationStatus;
  
  @doc("Filter by recipient")
  @query
  recipient?: string;
  
  @doc("Filter by shoot ID")
  @query
  shootId?: string;
  
  @doc("Filter by user ID")
  @query
  userId?: string;
  
  @doc("Filter by date range start")
  @query
  fromDate?: utcDateTime;
  
  @doc("Filter by date range end")
  @query
  toDate?: utcDateTime;
  
  ...PaginationQuery
}

@route("/notifications")
interface NotificationOperations {
  @post
  @doc("Send a notification")
  sendNotification(@body notification: SendNotificationRequest): SuccessResponse<Notification> | ApiError;
  
  @post
  @route("/email/template")
  @doc("Send email from template")
  sendTemplateEmail(@body request: SendTemplateEmailRequest): SuccessResponse<Notification> | ApiError;
  
  @get
  @doc("List notifications with optional filtering")
  listNotifications(...NotificationQuery): PaginatedResponse<Notification> | ApiError;
  
  @get
  @doc("Get notification by ID")
  getNotification(@path notificationId: string): SuccessResponse<Notification> | ApiError;
  
  @post
  @route("/{notificationId}/retry")
  @doc("Retry failed notification")
  retryNotification(@path notificationId: string): SuccessResponse<Notification> | ApiError;
  
  @delete
  @route("/{notificationId}")
  @doc("Cancel scheduled notification")
  cancelNotification(@path notificationId: string): SuccessResponse<{cancelled: boolean}> | ApiError;
}