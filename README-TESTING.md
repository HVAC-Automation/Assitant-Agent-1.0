# Testing Guide

This document explains how to run and interpret the comprehensive test suite for the AI Assistant Web App.

## Test Suite Overview

Our testing strategy includes:
- **API Tests**: Direct testing of backend endpoints and business logic
- **E2E Tests**: Full user interface testing with browser automation
- **Manual Testing**: Human verification checklist for complex interactions

## Quick Start

1. **Install Test Dependencies**
   ```bash
   npm run test:install
   ```

2. **Run All Tests**
   ```bash
   npm test
   ```

3. **Run Specific Test Suites**
   ```bash
   npm run test:api    # API tests only
   npm run test:e2e    # E2E UI tests only
   ```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:api` | Run API tests only |
| `npm run test:e2e` | Run E2E UI tests only |
| `npm run test:headed` | Run tests with browser UI visible |
| `npm run test:debug` | Run tests in debug mode |
| `npm run test:ui` | Open Playwright test UI |
| `npm run test:report` | View HTML test report |

## Test Files Structure

```
tests/
├── api/                           # API endpoint tests
│   ├── auth.test.js              # Authentication API
│   ├── admin-users.test.js       # User management API
│   ├── admin-agents.test.js      # Agent management API
│   └── user-agent-provisioning.test.js # User-agent assignments
├── e2e/                          # End-to-end UI tests
│   └── admin-dashboard.test.js   # Complete admin interface
├── fixtures/                     # Test data and configuration
│   └── test-data.js             # Shared test data
├── helpers/                      # Test utilities
│   ├── auth-helper.js           # Authentication utilities
│   └── db-helper.js             # Database operations
├── global-setup.js              # Test environment setup
├── global-teardown.js           # Test cleanup
└── manual-testing-checklist.md  # Human verification checklist
```

## API Tests

### Authentication (`auth.test.js`)
- User registration with validation
- Login/logout functionality
- Password reset flow
- Session management

### User Management (`admin-users.test.js`)
- CRUD operations for users
- Search and filtering
- Pagination
- Bulk operations (activate/deactivate)
- Password reset by admin
- Data validation

### Agent Management (`admin-agents.test.js`)
- Agent CRUD operations
- ElevenLabs integration (discovery/sync)
- Agent health monitoring
- Configuration management
- Data consistency

### User-Agent Provisioning (`user-agent-provisioning.test.js`)
- Assign/unassign agents to users
- Default agent management
- Bulk assignment operations
- Bidirectional relationship management
- Concurrent operation handling

## E2E Tests

### Admin Dashboard (`admin-dashboard.test.js`)
- Complete UI workflow testing
- Navigation and routing
- Form interactions
- Search and filtering
- Bulk operations
- Error handling
- Authentication flow

## Test Configuration

The test suite uses Playwright with the following configuration:

- **Browsers**: Chrome, Firefox, Mobile Chrome
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Reports**: HTML, JSON, JUnit formats
- **Screenshots**: On failure
- **Video**: On failure

## Environment Setup

### Required Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
ELEVENLABS_API_KEY=your_elevenlabs_key (optional for some tests)
```

### Test Database Setup

For full test coverage, ensure:
1. Supabase project is configured
2. Database tables exist (run migrations)
3. Admin user exists with credentials: `admin@example.com` / `password123`

## Running Tests

### Development Environment

```bash
# Start the development server
npm run dev

# In another terminal, run tests
npm test
```

### CI/CD Environment

Tests are configured to:
- Start the Next.js server automatically
- Run in headless mode
- Generate test reports
- Clean up test data

### Debug Mode

For troubleshooting test failures:

```bash
# Run with browser UI visible
npm run test:headed

# Run in debug mode (pauses on failures)
npm run test:debug

# Open interactive test UI
npm run test:ui
```

## Test Data Management

### Fixtures
- **testUsers**: Various user types for testing
- **testAgents**: Sample agents for testing
- **adminCredentials**: Admin login credentials

### Helpers
- **AuthHelper**: Login/logout utilities
- **DatabaseHelper**: Test data cleanup
- **Test selectors**: Reusable UI element selectors

### Cleanup
Tests automatically clean up:
- Test users (emails containing 'test-')
- Test agents (IDs containing 'test-agent-')
- User-agent assignments (via cascading deletes)

## Interpreting Test Results

### Success Indicators
- ✅ All tests pass
- No authentication errors
- Clean test data cleanup
- Performance within acceptable limits

### Common Failure Scenarios

1. **Database Connection Issues**
   - Check Supabase configuration
   - Verify environment variables
   - Ensure database is accessible

2. **Authentication Failures**
   - Verify admin user exists
   - Check password hash compatibility
   - Confirm NextAuth configuration

3. **ElevenLabs Integration Issues**
   - API key configuration
   - Network connectivity
   - Rate limiting

4. **UI Element Not Found**
   - Component structure changes
   - Timing issues (add waits)
   - Selector updates needed

## Manual Testing

For features requiring human verification, use:
```
tests/manual-testing-checklist.md
```

This covers:
- Voice interaction quality
- Visual design verification
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility features

## Continuous Integration

### GitHub Actions (if configured)
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:install
    npm test
```

### Test Reports
- HTML report: `playwright-report/index.html`
- JSON results: `test-results.json`
- JUnit XML: `test-results.xml`

## Troubleshooting

### Common Issues

1. **Port 3000 in use**
   ```bash
   # Kill existing process
   lsof -ti:3000 | xargs kill -9
   ```

2. **Playwright browser not installed**
   ```bash
   npm run test:install
   ```

3. **Database connection timeout**
   - Check network connectivity
   - Verify Supabase project status
   - Confirm environment variables

4. **Test data conflicts**
   ```bash
   # Clean up manually if needed
   # (Database helper will attempt automatic cleanup)
   ```

### Debug Techniques

1. **Screenshots on failure** are automatically saved
2. **Video recordings** capture failed test runs
3. **Console logs** show detailed error information
4. **Trace files** provide step-by-step execution details

## Best Practices

### Writing Tests
- Use descriptive test names
- Test both success and failure cases
- Clean up test data after each test
- Use proper waits instead of fixed delays
- Make tests independent and repeatable

### Test Maintenance
- Update selectors when UI changes
- Keep test data fixtures up to date
- Review and update manual checklist regularly
- Monitor test execution times
- Fix flaky tests immediately

## Contributing

When adding new features:
1. Write API tests for new endpoints
2. Add E2E tests for new UI components
3. Update manual testing checklist
4. Verify tests pass in CI environment
5. Document any new test setup requirements

## Support

For testing issues:
1. Check this documentation
2. Review test logs and reports
3. Verify environment setup
4. Check for known issues in project repository
5. Contact development team for complex issues