import "@typespec/http";
import "@typespec/rest";

// Import common models and service-specific models
import "./common.tsp";
import "./shoot-service.tsp";
import "./user-service.tsp";
import "./file-service.tsp";
import "./invite-service.tsp";
import "./notification-service.tsp";
import "./portfolio-service.tsp";

@service(#{
  title: "TempsDarret Photography Platform API",
  version: "1.0.0",
  description: "Comprehensive API for photography shoot management, client galleries, and portfolio showcase"
})
namespace TempsDarretAPI;

using TypeSpec.Http;
using TypeSpec.Rest;
