module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Photography platform specific types
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New features
        'fix',       // Bug fixes
        'docs',      // Documentation changes
        'style',     // Code style changes (formatting, etc.)
        'refactor',  // Code refactoring
        'perf',      // Performance improvements
        'test',      // Adding or updating tests
        'build',     // Build system changes
        'ci',        // CI/CD changes
        'chore',     // Maintenance tasks
        'revert',    // Reverting changes
        'wip',       // Work in progress (for development branches)
      ],
    ],
    // Photography business context scopes
    'scope-enum': [
      2,
      'always',
      [
        // Core services
        'auth',
        'user-service',
        'invite-service',
        'event-service',
        'file-service',
        'portfolio-service',
        'notification-service',
        'api-gateway',
        
        // Frontend components
        'frontend',
        'client-portal',
        'admin-dashboard',
        'portfolio',
        'gallery',
        'upload',
        
        // Photography business features
        'magic-links',
        'file-processing',
        'multi-resolution',
        'project-management',
        'client-access',
        'mobile',
        'download',
        
        // Infrastructure
        'docker',
        'k8s',
        'kafka',
        'mongodb',
        'storage',
        'security',
        'performance',
        
        // Data and messaging
        'api',
        'graphql',
        'rest',
        'websockets',
        'pubsub',
        'queues',
        'models',
        'events',
        'messages',
        'messaging',
        'data-structures',

        // Development
        'shared',
        'dev-tools',
        'ci',
        'docs',
        'tests',
        'config',
        'deps',
        
        // Photography categories
        'weddings',
        'portraits',
        'corporate',
        'landscapes',
        'events',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
  // Photography platform specific commit message examples
  helpUrl: `
Commit message examples for photography platform:

✅ Good examples:
  feat(client-portal): add photo favorite marking system
  fix(magic-links): resolve token expiration edge case
  feat(file-service): implement multi-resolution processing
  fix(mobile): correct gallery scrolling on iOS devices
  docs(api): update authentication flow documentation
  perf(gallery): optimize image loading for 50+ photos
  feat(portfolio): add landscape photography category
  fix(upload): handle large file timeout issues
  
❌ Bad examples:
  Add new feature
  Fixed bug
  Update code
  WIP
  
Photography business scopes include:
  - client-portal, gallery, upload, download
  - magic-links, file-processing, multi-resolution
  - weddings, portraits, corporate, landscapes
  - mobile, performance, security
  
For more details see: CONTRIBUTING.md
`,
};