# Manual Testing Checklist

This document provides a comprehensive checklist for manual testing of features that require human verification or cannot be easily automated.

## Pre-Testing Setup

- [ ] Application is running locally (`npm run dev`) or deployed to Vercel
- [ ] Supabase database is accessible and properly configured
- [ ] ElevenLabs API key is configured (if testing agent features)
- [ ] Admin user exists with credentials: admin@example.com / password123

## Authentication Flow

### Registration
- [ ] New user can register with valid email and strong password
- [ ] Registration fails with weak password
- [ ] Registration fails with invalid email format
- [ ] Registration fails with duplicate email
- [ ] Success message is displayed after successful registration
- [ ] User is redirected to appropriate page after registration

### Login/Logout
- [ ] Valid credentials allow successful login
- [ ] Invalid credentials show appropriate error message
- [ ] User is redirected to intended page after login
- [ ] Session persists after page refresh
- [ ] Logout successfully clears session
- [ ] Accessing protected routes redirects to login when not authenticated

### Password Reset
- [ ] Password reset request generates token (check API response)
- [ ] Password reset with valid token updates password
- [ ] Password reset with invalid token shows error
- [ ] User can login with new password after reset

## Admin Dashboard

### Navigation & Layout
- [ ] Admin can access admin dashboard after login
- [ ] Navigation menu is visible and functional
- [ ] Page layouts are responsive on different screen sizes
- [ ] All navigation links work correctly
- [ ] Breadcrumbs show current location (if implemented)

### User Management
- [ ] Users list displays with proper pagination
- [ ] Search functionality filters users correctly
- [ ] Role filter shows only users with selected role
- [ ] Status filter shows only active/inactive users
- [ ] User details are displayed correctly in table/cards
- [ ] "Create User" button opens user creation form
- [ ] New user creation form validates all required fields
- [ ] Created user appears in users list
- [ ] Edit user functionality updates user information
- [ ] Bulk operations work (select multiple users)
- [ ] Bulk activate/deactivate operations work correctly
- [ ] User deletion removes user from list (with confirmation)
- [ ] Password reset generates new temporary password

### Agent Management
- [ ] Agents list displays available agents
- [ ] "Discover Agents" button fetches agents from ElevenLabs
- [ ] Discovery shows loading state and results/errors appropriately
- [ ] "Sync Agents" updates local database with ElevenLabs data
- [ ] Create new agent form validates required fields
- [ ] Agent creation adds agent to list
- [ ] Agent editing updates agent information
- [ ] Agent deletion removes agent from list
- [ ] Agent health status is displayed (if implemented)
- [ ] Pagination works for large numbers of agents

### User-Agent Provisioning
- [ ] User detail page shows assigned agents
- [ ] "Assign Agent" interface displays available agents
- [ ] Agent assignment adds agent to user's list
- [ ] Default agent designation works correctly
- [ ] Agent removal from user works with confirmation
- [ ] Bulk agent assignment to multiple users works
- [ ] Agent detail page shows assigned users (reverse view)
- [ ] Search/filter works in agent assignment interface

## Voice Agent Features

### Basic Functionality
- [ ] Voice agent initializes correctly
- [ ] Microphone permission is requested and handled
- [ ] Voice input is captured and processed
- [ ] Agent responses are played through speakers
- [ ] Visual indicators show when agent is listening/speaking
- [ ] Conversation history is displayed correctly

### Advanced Features
- [ ] Voice interruption detection works (user can interrupt agent)
- [ ] Multiple conversation turns work correctly  
- [ ] Agent maintains context throughout conversation
- [ ] Error states are handled gracefully (network issues, API failures)
- [ ] User can start/stop conversations manually
- [ ] Audio quality is acceptable for both input and output

## Error Handling

### API Errors
- [ ] Network errors show user-friendly messages
- [ ] Server errors (5xx) are handled gracefully
- [ ] Authentication errors redirect to login
- [ ] Validation errors show specific field messages
- [ ] Rate limiting is handled appropriately

### UI Errors
- [ ] Loading states are shown during API calls
- [ ] Form validation errors are displayed clearly
- [ ] Required field indicators are visible
- [ ] Error boundaries catch and display React errors
- [ ] 404 pages are shown for invalid routes

## Performance & UX

### Loading & Responsiveness
- [ ] Initial page load time is reasonable (<3 seconds)
- [ ] Navigation between pages feels responsive
- [ ] Large data sets (users, agents) load with pagination
- [ ] Loading spinners/skeletons are shown during data fetching
- [ ] Images and assets load properly

### Mobile Responsiveness
- [ ] Application works on mobile devices (phone/tablet)
- [ ] Navigation menu adapts to mobile screen size
- [ ] Tables/data grids are scrollable or adapted for mobile
- [ ] Touch interactions work correctly
- [ ] Text is readable on small screens

## Security

### Authentication Security
- [ ] Passwords are not visible in browser developer tools
- [ ] Session tokens are not exposed in console or network tab
- [ ] Protected routes cannot be accessed without authentication
- [ ] User roles are enforced (admin vs regular user permissions)
- [ ] Logout clears all session data

### Data Protection
- [ ] Sensitive data is not logged to console
- [ ] API responses don't include sensitive information unnecessarily
- [ ] User data modifications require appropriate permissions
- [ ] Bulk operations have confirmation dialogs

## Browser Compatibility

Test the application in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Edge (if available)

## Deployment Testing

### Production Environment
- [ ] Application loads correctly on deployed URL
- [ ] All environment variables are properly configured
- [ ] Database connections work in production
- [ ] External API integrations work (ElevenLabs)
- [ ] HTTPS is properly configured
- [ ] Static assets load correctly

### Build Process
- [ ] `npm run build` completes without errors
- [ ] Built application runs with `npm start`
- [ ] No console errors in production build
- [ ] Source maps are not exposed in production (if applicable)

## Accessibility

### Basic Accessibility
- [ ] Application works with keyboard navigation
- [ ] Focus indicators are visible
- [ ] Color contrast meets accessibility standards
- [ ] Alt text is provided for images
- [ ] Form labels are properly associated with inputs
- [ ] Screen reader compatibility (test with built-in screen reader)

## Test Data Cleanup

After completing manual tests:
- [ ] Remove any test users created during testing
- [ ] Remove any test agents created during testing
- [ ] Verify database is in clean state
- [ ] Document any issues found during testing

## Issues Found

Use this section to document any issues discovered during manual testing:

| Issue | Severity | Component | Description | Status |
|-------|----------|-----------|-------------|--------|
| | | | | |
| | | | | |
| | | | | |

## Notes

- Test with realistic data volumes (not just 1-2 users/agents)
- Try edge cases (very long names, special characters, etc.)
- Test concurrent operations (multiple admin users, etc.)
- Verify data consistency across different views
- Check that all user feedback messages are helpful and accurate