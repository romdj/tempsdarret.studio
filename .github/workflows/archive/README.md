# Archived Workflows

These workflows have been consolidated into the unified `ci.yml` pipeline.

## Migration

- `build.yaml` → Merged into `ci.yml` (quality-checks + build-matrix jobs)
- `notification-service-tests.yml` → Merged into `ci.yml` (test-services + coverage jobs)

## Why Consolidated?

The unified pipeline provides:
- Single-page view of all builds and tests
- Better parallelization with matrix strategy
- Consistent environment setup
- Easier maintenance
- Clear job dependencies and flow

See `..ci.yml` for the current CI/CD pipeline.
