import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

// Common models used across all services
@doc("Standard error response")
@error
model ApiError {
  @doc("HTTP status code")
  code: int32;
  
  @doc("Error message")
  message: string;
  
  @doc("Optional error details")
  details?: string;
}

@doc("Pagination parameters")
model PaginationQuery {
  @doc("Page number (1-based)")
  @query
  page?: int32 = 1;
  
  @doc("Number of items per page (max 100)")
  @query
  limit?: int32 = 20;
}

@doc("Pagination metadata")
model PaginationMeta {
  @doc("Current page number")
  page: int32;
  
  @doc("Number of items per page")
  limit: int32;
  
  @doc("Total number of items")
  total: int32;
  
  @doc("Total number of pages")
  totalPages: int32;
}

@doc("Standard paginated response")
model PaginatedResponse<T> {
  @doc("Array of items")
  data: T[];
  
  @doc("Pagination metadata")
  meta: PaginationMeta;
}

@doc("Standard success response")
model SuccessResponse<T> {
  @doc("Response data")
  data: T;
  
  @doc("Success message")
  message?: string;
}

@doc("User role enumeration")
enum UserRole {
  photographer: "photographer",
  client: "client", 
  guest: "guest"
}

@doc("Common timestamp fields")
model Timestamps {
  @doc("Creation timestamp (ISO 8601)")
  createdAt: utcDateTime;
  
  @doc("Last update timestamp (ISO 8601)")
  updatedAt: utcDateTime;
}