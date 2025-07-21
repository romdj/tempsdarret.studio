# Quality Gates & Code Standards - Temps D'arrêt Studio

## Overview
This document outlines the quality gates and code standards for the photographer portfolio and client portal platform, ensuring high code quality, maintainability, and reliability across the monorepo.

## 🛡️ Git Hooks (Husky)

### Pre-commit Hooks
Automatically run before each commit to catch issues early:

```bash
# Setup included in npm install
npm install  # Installs husky and sets up hooks automatically
```

### Pre-commit Validation
- **Linting**: ESLint on all TypeScript files
- **Type Checking**: TypeScript compilation across workspaces
- **Unit Tests**: Run tests for implemented workspaces
- **Security Audit**: High severity vulnerability detection

### Pre-push Validation (Future)
- **Full Build**: Ensure all workspaces compile
- **Integration Tests**: End-to-end workflow validation
- **Docker Tests**: Container health checks
- **Security Scan**: Comprehensive dependency audit

## 📊 Testing Standards

### Coverage Requirements

#### Shared Package
- **Global**: 90% lines, branches, functions, statements
- **Utilities**: 95% coverage (critical shared code)
- **Types**: 100% compilation validation

#### Services (When Implemented)
- **Business Logic**: 85% lines, branches, functions, statements
- **API Endpoints**: 90% lines, branches, functions, statements
- **File Operations**: 95% lines, branches, functions, statements
- **Authentication**: 95% lines, branches, functions, statements

#### Frontend (SvelteKit)
- **Components**: 80% lines, branches, functions, statements
- **Stores**: 90% lines, branches, functions, statements
- **Utils**: 95% lines, branches, functions, statements
- **API Client**: 85% lines, branches, functions, statements

### Photography-Specific Testing

#### File Handling Tests
- **Large File Uploads**: Test with 25MB+ files
- **Multi-Resolution**: Validate all 4 resolution generations
- **Storage Paths**: Verify directory structure creation
- **Permission Validation**: Test access control

#### Client Workflow Tests
- **Magic Link Flow**: End-to-end authentication
- **Gallery Access**: Client-specific project viewing
- **Download Security**: Permission-based file access
- **Mobile Experience**: Touch navigation and performance

#### Admin Workflow Tests
- **Bulk Operations**: Multiple file uploads
- **Project Management**: CRUD operations
- **Client Assignment**: Project-client linking
- **Portfolio Curation**: Public vs private separation

## 🚀 GitHub Actions Workflows

### Build & Test Pipeline
Runs on every push and pull request:
- ✅ **Dependency Installation**: npm install across workspaces
- ✅ **Code Compilation**: TypeScript build verification
- ✅ **Test Execution**: Unit tests with coverage
- ✅ **Linting**: ESLint validation
- ✅ **Type Checking**: Strict TypeScript validation
- ✅ **Security Audit**: High severity vulnerability scan

### Photography Platform Specific Checks
- 📸 **File Size Validation**: Test realistic photo sizes
- 📱 **Mobile Compatibility**: Cross-browser testing
- 🔒 **Client Privacy**: Access control verification
- ⚡ **Performance**: Image loading and gallery benchmarks

## 🎯 Quality Standards

### TypeScript Standards
```typescript
// ✅ Good: Strict typing with readonly
interface ProjectImage {
  readonly id: string;
  readonly paths: {
    readonly original: string;
    readonly high: string;
    readonly medium: string;
    readonly thumb: string;
  };
}

// ❌ Bad: Any types and mutable data
interface ProjectImage {
  id: any;
  paths: {
    original: string;
    high: string;
  };
}
```

### Error Handling Standards
```typescript
// ✅ Good: Typed errors with context
class FileUploadError extends Error {
  constructor(
    message: string,
    public readonly fileSize: number,
    public readonly maxSize: number
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

// ❌ Bad: Generic error throwing
throw new Error('Upload failed');
```

### Photography Domain Standards
```typescript
// ✅ Good: Photography-specific validation
function validateImageFile(file: File): ValidationResult {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/x-canon-cr3'];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file format' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large' };
  }
  
  return { valid: true };
}
```

### Security Standards
- **No Secrets**: Never commit API keys, passwords, or tokens
- **File Access**: Validate permissions before serving files
- **Client Isolation**: Ensure clients only access their projects
- **Magic Link Security**: Proper expiration and token validation
- **Input Validation**: Sanitize all user inputs

## 📋 Pull Request Quality Gates

### Required Checks
- [ ] **All CI checks pass**: Build, test, lint, security
- [ ] **Code review approval**: At least one maintainer approval
- [ ] **Conventional commits**: Proper commit message format
- [ ] **Documentation updated**: If API or workflow changes
- [ ] **Tests included**: For new features and bug fixes

### Photography-Specific PR Requirements
- [ ] **Mobile testing**: Verify mobile experience for client-facing changes
- [ ] **File handling**: Test with realistic photo sizes
- [ ] **Client workflow**: Validate end-to-end user experience
- [ ] **Admin efficiency**: Ensure bulk operations remain performant
- [ ] **Security review**: For authentication or file access changes

## 🛠️ Development Tools

### Testing Frameworks
- **Shared Package**: Jest with ts-jest
- **Services**: Jest with supertest for API testing
- **Frontend**: Vitest with Testing Library
- **E2E**: Playwright for full workflow testing

### Code Quality Tools
- **ESLint**: TypeScript-specific rules with strict configuration
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode with no implicit any
- **Husky**: Git hooks for quality enforcement

### Photography-Specific Tools
- **Sharp**: Image processing validation in tests
- **File System**: Mock file operations for testing
- **Large File Simulation**: Generate test files of realistic sizes

## 📈 Monitoring & Metrics

### Code Quality Metrics
- **TypeScript Strict**: 100% (no any types allowed)
- **Test Coverage**: Meet workspace-specific thresholds
- **ESLint**: Zero errors, minimal warnings
- **Security**: No high severity vulnerabilities

### Photography Platform Metrics
- **File Upload Success**: >99.5% in testing
- **Gallery Load Time**: <3 seconds with 50+ images
- **Mobile Performance**: 60fps scrolling on gallery
- **Download Completion**: >98% success rate

### Performance Benchmarks
- **Image Processing**: <30 seconds for 25MB file
- **Gallery Rendering**: <2 seconds for 100 thumbnails
- **Authentication**: <500ms magic link validation
- **API Response**: <200ms for metadata queries

## 🚨 Quality Gate Failures

### Automatic Failures
- **High severity security vulnerabilities**
- **Test coverage below thresholds**
- **TypeScript compilation errors**
- **ESLint errors** (warnings allowed)
- **Failed unit tests**

### Photography-Specific Failures
- **File upload timeout** (>60 seconds for 25MB)
- **Mobile gallery performance** (>5 seconds load)
- **Client access breach** (unauthorized file access)
- **Magic link security issue** (invalid token acceptance)

### Failure Resolution
```bash
# Fix linting issues
npm run lint -- --fix

# Run tests locally
npm test

# Check TypeScript errors
npm run check

# Security audit
npm audit --audit-level=high
```

## 🔧 Configuration Files

### Quality Gate Configuration
- `.husky/pre-commit` - Git pre-commit hook validation
- `shared/jest.config.js` - Test configuration with coverage
- `shared/eslint.config.js` - Linting rules
- `.prettierrc.json` - Code formatting rules
- `tsconfig.json` - TypeScript compiler options

### GitHub Actions
- `.github/workflows/ci.yml` - Continuous integration pipeline
- `.github/workflows/security.yml` - Security scanning
- `.github/workflows/coverage.yml` - Coverage reporting

## 🎓 Best Practices

### Writing Tests for Photography Platform
```typescript
// ✅ Good: Realistic file simulation
describe('File Upload', () => {
  it('should handle large RAW files', async () => {
    const largeFile = createMockFile('test.cr3', 25 * 1024 * 1024);
    const result = await uploadFile(largeFile);
    expect(result.success).toBe(true);
  });
});

// ✅ Good: Client workflow testing
describe('Client Gallery Access', () => {
  it('should only allow access to assigned projects', async () => {
    const client = await createTestClient();
    const unauthorizedProject = await createProject();
    
    const access = await validateProjectAccess(client.id, unauthorizedProject.id);
    expect(access.allowed).toBe(false);
  });
});
```

### Code Organization
- **Domain-driven structure**: Organize by photography concepts
- **Service isolation**: Clear boundaries between microservices
- **Shared utilities**: Common photography-specific functions
- **Type safety**: Comprehensive TypeScript coverage

### Git Workflow
- **Conventional commits**: feat/fix/docs with photography context
- **Branch naming**: `feat/client-gallery-improvements`
- **Small PRs**: Focus on single photography workflow improvement
- **Clear descriptions**: Include business context and client impact

---

## Quality Gate Philosophy

Our quality gates ensure that:
1. **Client experience** is never degraded
2. **File handling** is reliable and secure
3. **Mobile performance** meets professional standards
4. **Security** protects client privacy and data
5. **Code quality** enables long-term maintainability

Every change must pass these gates to protect the integrity of the photography business platform.