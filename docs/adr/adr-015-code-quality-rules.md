# ADR-015: Strict ESLint Configuration with Code Quality Rules

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform requires consistent code quality across multiple TypeScript services, frontend components, and shared libraries. Manual code reviews alone cannot catch all quality issues, and inconsistent coding styles across team members reduce maintainability and onboarding efficiency.

### Quality Requirements
- **Consistent formatting** across all TypeScript/JavaScript code
- **Early bug detection** through static analysis
- **Security vulnerability prevention** in photography file handling
- **Performance optimization** hints for image-heavy operations
- **Accessibility compliance** for client-facing interfaces
- **TypeScript best practices** alignment with ADR-012

### Current Challenges
- Inconsistent code formatting across team members
- Manual detection of common bugs and anti-patterns
- Security vulnerabilities in file upload/processing code
- Accessibility issues in client gallery interfaces
- Performance issues in image loading and processing

## Decision

We will implement **strict ESLint configuration** with comprehensive code quality rules tailored to our photography platform's TypeScript stack, including security, performance, and accessibility rules.

## Rationale

### TypeScript-First Quality Rules

ESLint with TypeScript integration provides comprehensive static analysis:

```typescript
// .eslintrc.js - Photography platform ESLint config
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'plugin:@typescript-eslint/strict'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'security',
    'unicorn',
    'import',
    'sonarjs'
  ]
};
```

### Photography-Specific Security Rules

File handling and user uploads require strict security validation:

```typescript
// Security rules for photography file operations
rules: {
  // Prevent path traversal in file operations
  'security/detect-non-literal-fs-filename': 'error',
  
  // Require input validation for file uploads
  'security/detect-unsafe-regex': 'error',
  
  // Prevent SQL injection in metadata queries  
  'security/detect-sql-injection': 'error',
  
  // Custom rule for file type validation
  'custom/validate-file-extensions': 'error',
  
  // Prevent buffer overflows in image processing
  'security/detect-buffer-noassert': 'error'
}
```

### Performance Rules for Image Operations

Photography platforms require optimized code for large file operations:

```typescript
// Performance-focused rules
rules: {
  // Prevent memory leaks in image processing
  'unicorn/no-array-for-each': 'error',
  
  // Optimize async operations for file handling
  '@typescript-eslint/await-thenable': 'error',
  
  // Prevent blocking operations in image processing
  'sonarjs/cognitive-complexity': ['error', 15],
  
  // Require proper error handling in file operations
  '@typescript-eslint/no-floating-promises': 'error',
  
  // Optimize imports for bundle size
  'import/no-duplicates': 'error'
}
```

### Type Safety Rules

Strict TypeScript enforcement prevents runtime errors in business logic:

```typescript
// Type safety rules
rules: {
  // Require explicit return types for public APIs
  '@typescript-eslint/explicit-function-return-type': 'error',
  
  // Prevent 'any' usage in production code
  '@typescript-eslint/no-explicit-any': 'error',
  
  // Require proper null checking for optional fields
  '@typescript-eslint/strict-boolean-expressions': 'error',
  
  // Prevent unused variables in photography metadata
  '@typescript-eslint/no-unused-vars': 'error',
  
  // Require proper error handling
  '@typescript-eslint/prefer-promise-reject-errors': 'error'
}
```

## Implementation Configuration

### Base Configuration Structure
```
.eslintrc.js                    # Root configuration
packages/
├── frontend/
│   └── .eslintrc.js           # SvelteKit-specific rules
├── services/
│   ├── shoot-service/
│   │   └── .eslintrc.js       # Microservice-specific rules
│   └── shared/
│       └── .eslintrc.js       # Shared library rules
└── eslint-config-tempsdarret/ # Custom shareable config
```

### Root ESLint Configuration

```javascript
// .eslintrc.js - Root configuration
module.exports = {
  root: true,
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'plugin:sonarjs/recommended',
    'plugin:unicorn/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: true
  },
  plugins: [
    '@typescript-eslint',
    'security',
    'sonarjs',
    'unicorn',
    'import'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['packages/*/tsconfig.json']
      }
    }
  },
  rules: {
    // TypeScript Strict Rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/prefer-promise-reject-errors': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    
    // Security Rules
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-sql-injection': 'error',
    'security/detect-buffer-noassert': 'error',
    
    // Performance Rules
    'sonarjs/cognitive-complexity': ['error', 15],
    'unicorn/no-array-for-each': 'error',
    'unicorn/prefer-module': 'error',
    'unicorn/prefer-node-protocol': 'error',
    
    // Import Organization
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external', 
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'error'
  },
  overrides: [
    // Test files - relaxed rules
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'sonarjs/no-duplicate-string': 'off'
      }
    },
    // Configuration files - allow require()
    {
      files: ['**/*.config.js', '.eslintrc.js'],
      env: { node: true },
      rules: {
        'unicorn/prefer-module': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};
```

### Frontend-Specific Configuration

```javascript
// packages/frontend/.eslintrc.js - SvelteKit rules
module.exports = {
  extends: ['../../../.eslintrc.js'],
  plugins: ['svelte3'],
  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3',
      rules: {
        // Allow Svelte-specific patterns
        '@typescript-eslint/no-unused-vars': 'off',
        'import/first': 'off'
      }
    }
  ],
  rules: {
    // Accessibility rules for client interfaces
    'a11y/alt-text': 'error',
    'a11y/anchor-has-content': 'error',
    'a11y/click-events-have-key-events': 'error',
    
    // Performance for image galleries
    'unicorn/no-array-reduce': 'error',
    'unicorn/prefer-spread': 'error'
  }
};
```

### Microservice-Specific Configuration

```javascript
// services/shoot-service/.eslintrc.js - Backend service rules
module.exports = {
  extends: ['../../../.eslintrc.js'],
  env: { node: true },
  rules: {
    // Require explicit error handling in services
    '@typescript-eslint/no-floating-promises': 'error',
    
    // Performance for file operations
    'unicorn/no-array-for-each': 'error',
    
    // Security for API endpoints
    'security/detect-object-injection': 'error',
    
    // Custom rules for photography domain
    'custom/validate-shoot-id-format': 'error',
    'custom/require-zod-validation': 'error'
  }
};
```

## Custom Rules for Photography Domain

### File Extension Validation

```typescript
// eslint-rules/validate-file-extensions.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce proper file extension validation for uploads'
    }
  },
  create: function(context) {
    return {
      CallExpression(node) {
        if (node.callee.property && node.callee.property.name === 'upload') {
          // Check for proper file extension validation
          const hasValidation = checkFileExtensionValidation(node);
          if (!hasValidation) {
            context.report({
              node,
              message: 'File upload must include extension validation'
            });
          }
        }
      }
    };
  }
};
```

### Photography ID Format Validation

```typescript
// Custom rule for shoot ID format validation
const SHOOT_ID_PATTERN = /^shoot_[a-f0-9]{32}$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce proper shoot ID format validation'
    }
  },
  create: function(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.name.includes('shootId')) {
          // Check for proper format validation
          const hasValidation = checkShootIdValidation(node);
          if (!hasValidation) {
            context.report({
              node,
              message: 'Shoot ID must be validated against format: shoot_[32 hex chars]'
            });
          }
        }
      }
    };
  }
};
```

## Integration with Development Workflow

### Pre-commit Hook Integration

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run ESLint on staged files only
npx lint-staged

# lint-staged configuration in package.json
{
  "lint-staged": {
    "*.{ts,js,svelte}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

### VSCode Integration

```json
// .vscode/settings.json
{
  "eslint.workingDirectories": [
    "packages/frontend",
    "services/shoot-service",
    "services/invite-service",
    "packages/shared"
  ],
  "eslint.validate": [
    "javascript",
    "typescript",
    "svelte"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### CI/CD Integration

```yaml
# .github/workflows/code-quality.yml
name: Code Quality
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run ESLint
        run: npm run lint:check
        
      - name: Run TypeScript Check
        run: npm run type-check
        
      - name: Check for Security Issues
        run: npm run lint:security
        
      - name: Upload ESLint Results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: eslint-results
          path: eslint-report.json
```

### Build Scripts

```json
// package.json scripts
{
  "scripts": {
    "lint": "eslint . --ext .ts,.js,.svelte --fix",
    "lint:check": "eslint . --ext .ts,.js,.svelte",
    "lint:security": "eslint . --ext .ts,.js --config .eslintrc.security.js",
    "type-check": "tsc --noEmit --project tsconfig.json",
    "format": "prettier --write \"**/*.{ts,js,svelte,json,md}\"",
    "quality": "npm run lint:check && npm run type-check && npm run format"
  }
}
```

## Rule Categories and Justification

### Security Rules (High Priority)
- File upload validation prevents malicious uploads
- Path traversal prevention protects file system
- SQL injection prevention for metadata queries
- Buffer overflow prevention in image processing

### Performance Rules (High Priority)  
- Array method optimization for large image collections
- Async/await enforcement for non-blocking file operations
- Import optimization for bundle size management
- Cognitive complexity limits for maintainability

### Type Safety Rules (High Priority)
- Explicit typing prevents runtime errors in business logic
- Null checking prevents crashes in optional photo metadata
- Promise handling ensures proper error propagation
- Unused variable detection keeps code clean

### Code Organization Rules (Medium Priority)
- Import ordering improves code readability
- Duplicate detection prevents maintenance issues
- Module organization supports microservice architecture

## Enforcement Strategy

### Gradual Adoption
1. **Week 1**: Enable basic TypeScript and security rules
2. **Week 2**: Add performance and import organization rules  
3. **Week 3**: Implement custom photography domain rules
4. **Week 4**: Enable strict mode across all services

### Rule Violation Handling
- **Error level**: Blocks commits and builds (security, critical bugs)
- **Warning level**: Reported but doesn't block (style, minor issues)
- **Off**: Rules that conflict with framework patterns

### Team Training
- ESLint documentation with photography-specific examples
- Code review guidelines highlighting common rule violations
- Weekly team discussions about new quality issues discovered

## Trade-offs

### Accepted Trade-offs
- **Initial setup complexity** with multiple configuration files
- **Development friction** from strict rules requiring fixes
- **Build time increase** from comprehensive static analysis

### Benefits Gained
- **Early bug detection** preventing production issues
- **Consistent code quality** across all team members  
- **Security vulnerability prevention** in file handling
- **Improved maintainability** through enforced patterns

## Consequences

### Positive
- Consistent code quality across all photography platform components
- Early detection of security vulnerabilities in file operations
- Improved type safety reducing runtime errors
- Better onboarding experience with enforced coding standards

### Negative
- Initial development velocity reduction during rule adoption
- Potential for over-engineering with too many rules
- Tool maintenance overhead for custom rules

### Neutral
- Code review focus shifts from style to business logic
- Need for team training on ESLint configuration
- Dependency on ESLint ecosystem stability

## Compliance

This decision will be enforced through:
- **Pre-commit hooks** preventing commits with rule violations
- **CI/CD pipeline** blocking builds that fail linting
- **Code review requirements** ensuring quality rule adherence
- **IDE configuration** providing real-time feedback to developers