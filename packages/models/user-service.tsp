import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "User Service API",
  version: "1.0.0"
})
namespace UserService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("User model")
model User {
  @key
  @doc("Unique user identifier")
  id: string;
  
  @doc("User email address")
  @format("email")
  email: string;
  
  @doc("User display name")
  @minLength(1)
  @maxLength(100)
  name: string;
  
  @doc("User role")
  role: UserRole;
  
  @doc("User profile picture URL")
  profilePictureUrl?: string;
  
  @doc("User is active")
  isActive: boolean = true;
  
  ...Timestamps
}

@doc("User registration request")
model CreateUserRequest {
  @doc("User email address")
  @format("email")
  email: string;
  
  @doc("User display name")
  @minLength(1)
  @maxLength(100)
  name: string;
  
  @doc("User role")
  role: UserRole;
  
  @doc("User profile picture URL")
  profilePictureUrl?: string;
}

@doc("Update user request")
model UpdateUserRequest {
  @doc("User display name")
  @minLength(1)
  @maxLength(100)
  name?: string;
  
  @doc("User profile picture URL")
  profilePictureUrl?: string;
  
  @doc("User is active")
  isActive?: boolean;
}

@doc("User query parameters")
model UserQuery {
  @doc("Filter by role")
  @query
  role?: UserRole;
  
  @doc("Filter by active status")
  @query
  isActive?: boolean;
  
  @doc("Search by name or email")
  @query
  search?: string;
  
  ...PaginationQuery
}

@route("/users")
interface UserOperations {
  @post
  @doc("Create a new user")
  createUser(@body user: CreateUserRequest): SuccessResponse<User> | ApiError;
  
  @get
  @doc("List users with optional filtering")
  listUsers(...UserQuery): PaginatedResponse<User> | ApiError;
  
  @get
  @doc("Get user by ID")
  getUser(@path userId: string): SuccessResponse<User> | ApiError;
  
  @patch
  @doc("Update user")
  updateUser(@path userId: string, @body update: UpdateUserRequest): SuccessResponse<User> | ApiError;
  
  @delete
  @doc("Deactivate user")
  deactivateUser(@path userId: string): SuccessResponse<User> | ApiError;
}