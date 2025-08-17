import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "Shoot Service API",
  version: "1.0.0"
})
namespace ShootService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("Shoot status enumeration")
enum ShootStatus {
  planned: "planned",
  in_progress: "in_progress",
  completed: "completed", 
  delivered: "delivered",
  archived: "archived"
}

@doc("Shoot model")
model Shoot {
  @key
  @doc("Unique shoot identifier (format: shoot_<32chars>)")
  @pattern("^shoot_[a-f0-9]{32}$")
  id: string;
  
  @doc("Shoot title")
  @minLength(1)
  @maxLength(100)
  title: string;
  
  @doc("Client email address")
  @format("email")
  clientEmail: string;
  
  @doc("Photographer user ID")
  photographerId: string;
  
  @doc("Scheduled shoot date (ISO 8601)")
  scheduledDate?: utcDateTime;
  
  @doc("Shoot location")
  @maxLength(500)
  location?: string;
  
  @doc("Current shoot status")
  status: ShootStatus;
  
  ...Timestamps
}

@doc("Create shoot request")
model CreateShootRequest {
  @doc("Shoot title")
  @minLength(1)
  @maxLength(100)
  title: string;
  
  @doc("Client email address")
  @format("email")
  clientEmail: string;
  
  @doc("Photographer user ID")
  photographerId: string;
  
  @doc("Scheduled shoot date (ISO 8601)")
  scheduledDate?: utcDateTime;
  
  @doc("Shoot location")
  @maxLength(500)
  location?: string;
}

@doc("Update shoot request")
model UpdateShootRequest {
  @doc("Shoot title")
  @minLength(1)
  @maxLength(100)
  title?: string;
  
  @doc("Scheduled shoot date (ISO 8601)")
  scheduledDate?: utcDateTime;
  
  @doc("Shoot location")
  @maxLength(500)
  location?: string;
  
  @doc("Shoot status")
  status?: ShootStatus;
}

@doc("Shoot query parameters")
model ShootQuery {
  @doc("Filter by photographer ID")
  @query
  photographerId?: string;
  
  @doc("Filter by client email")
  @query
  clientEmail?: string;
  
  @doc("Filter by status")
  @query
  status?: ShootStatus;
  
  @doc("Filter by date range start (ISO 8601)")
  @query
  fromDate?: utcDateTime;
  
  @doc("Filter by date range end (ISO 8601)")
  @query
  toDate?: utcDateTime;
  
  ...PaginationQuery
}

@route("/shoots")
interface ShootOperations {
  @post
  @doc("Create a new shoot")
  createShoot(@body shoot: CreateShootRequest): SuccessResponse<Shoot> | ApiError;
  
  @get
  @doc("List shoots with optional filtering")
  listShoots(...ShootQuery): PaginatedResponse<Shoot> | ApiError;
  
  @get
  @doc("Get shoot by ID")
  getShoot(@path shootId: string): SuccessResponse<Shoot> | ApiError;
  
  @patch
  @doc("Update shoot")
  updateShoot(@path shootId: string, @body update: UpdateShootRequest): SuccessResponse<Shoot> | ApiError;
  
  @delete
  @doc("Archive shoot")
  archiveShoot(@path shootId: string): SuccessResponse<Shoot> | ApiError;
}