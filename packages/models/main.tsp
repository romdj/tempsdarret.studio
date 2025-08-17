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
import "@typespec/openapi";

@service(#{ title: "TempsDarret Photography Platform API" })

@OpenAPI.info(#{ version: "1.0.0"})
namespace TempsDarretAPI;

using TypeSpec.OpenAPI;
using TypeSpec.Http;
using TypeSpec.Rest;
