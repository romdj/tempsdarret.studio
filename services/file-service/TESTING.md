# File Service Testing Strategy

This document outlines the comprehensive testing approach for the File Service, ensuring full coverage of ADR-026 and ADR-027 compliance, sidecar file handling, and photographer-only access controls.

## Test Structure

### Unit Tests
Located in `tests/services/` and `tests/handlers/`

#### FileService.test.ts
- **File Upload Operations**: Tests all supported file formats including major camera RAW formats
- **Sidecar/Config File Support**: Validates XMP, PSD, PSB, COS, COL, AFPHOTO, XCF file handling
- **Photographer-Only Access**: Ensures proper access control for editing data
- **File Type Detection**: Tests MIME type and filename-based file classification
- **Download Stream Creation**: Validates chunked vs direct streaming based on file size

#### StorageService.test.ts
- **ADR-027 Compliance**: Tests hybrid storage strategy (filesystem + MongoDB metadata)
- **Chunking Logic**: Validates 25MB threshold and 255KB chunk size
- **TTL Management**: Tests 24-hour chunk expiration
- **Storage Path Generation**: Validates year/month directory structure
- **File Statistics**: Tests file existence and size reporting

#### FileHandlers.test.ts
- **ADR-026 Compliance**: Validates mandatory Content-Length headers for progress bars
- **Range Request Support**: Tests resumable download functionality
- **Error Handling**: Validates proper HTTP status codes and error responses
- **Archive Downloads**: Tests archive-specific header requirements

### Integration Tests
Located in `tests/integration/integration.test.ts`

#### Complete Workflow Testing
- **End-to-End File Operations**: Upload → Process → Download → Delete workflows
- **Multi-Format Upload**: Tests simultaneous upload of JPEG, RAW, sidecar, and config files
- **Access Control Validation**: Tests photographer-only filtering and access restrictions
- **Large File Handling**: Tests chunking behavior with files >25MB
- **Archive Creation**: Tests complete and type-specific archive generation

#### Error Scenarios
- **File Size Validation**: Tests 100MB upload limit enforcement
- **Unsupported Formats**: Tests graceful handling of invalid file types
- **Missing Data**: Tests validation of required upload parameters
- **Non-Existent Resources**: Tests 404 handling for all endpoints

#### ADR Compliance Verification
- **ADR-026**: Validates all download endpoints include proper headers for progress indication
- **ADR-027**: Tests hybrid storage with automatic chunking for large files

## Supported File Formats

### Camera RAW Formats
- **Canon**: .CR2, .CR3
- **Nikon**: .NEF, .NRW
- **Sony**: .ARW
- **Olympus**: .ORF
- **Leica/Adobe**: .DNG, .RWL
- **Hasselblad**: .3FR, .FFF
- **Phase One**: .IIQ

### Sidecar/Config Formats (Photographer-Only)
- **Adobe Lightroom/Photoshop**: .XMP (sidecar)
- **Adobe Photoshop**: .PSD, .PSB (config)
- **Capture One**: .COS, .COL (config)
- **Affinity Photo**: .AFPHOTO (config)
- **GIMP**: .XCF (config)

## Running Tests

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Configuration

- **Jest**: TypeScript support with ESM modules
- **MongoDB Memory Server**: In-memory database for isolated testing
- **Supertest**: HTTP endpoint testing
- **Test Timeout**: 30 seconds for integration tests
- **Coverage**: Excludes test files and main entry points

## ADR Compliance Verification

### ADR-026: Download Progress Indicators
All download endpoints MUST include:
- `Content-Length` header (mandatory for progress bars)
- `Content-Type` with proper MIME type
- `Content-Disposition` for filename preservation
- `Accept-Ranges: bytes` for resume support
- `Cache-Control: private, max-age=0` for large files

### ADR-027: Hybrid File Storage
- Files <25MB: Direct filesystem storage
- Files ≥25MB: Filesystem + on-demand MongoDB chunking
- Chunk size: 255KB (GridFS compatible)
- Chunk TTL: 24 hours with automatic cleanup
- Storage path: `/data/files/YYYY/MM/fileId.ext`

## Continuous Integration

Tests are designed to run in CI environments with:
- Isolated MongoDB instances per test run
- Temporary filesystem storage cleanup
- Parallel test execution safety
- Coverage reporting integration

## Test Data Management

- **Setup**: Automated test database and storage directory creation
- **Isolation**: Each test uses clean database state
- **Cleanup**: Automatic removal of test files and database records
- **No External Dependencies**: All tests use in-memory/local resources