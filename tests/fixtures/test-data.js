/**
 * Test data fixtures
 * Provides consistent test data across all test files
 */

// Base URL for tests
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://assitant-agent-1-0.vercel.app';

// Admin credentials for testing
export const adminCredentials = {
  email: 'admin@example.com',
  password: 'password123'
};

// Test users for various scenarios
export const testUsers = {
  admin: {
    email: 'test-admin@example.com',
    password: 'TestAdmin123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin'
  },
  user: {
    email: 'test-user@example.com',
    password: 'TestUser123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  },
  bulkTestUser: {
    email: 'bulk-test-user@example.com',
    password: 'TestPassword123!',
    firstName: 'Bulk',
    lastName: 'Test',
    role: 'user'
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  },
  userToDelete: {
    email: 'delete-me@example.com',
    password: 'TestPassword123!',
    firstName: 'Delete',
    lastName: 'Me',
    role: 'user'
  }
};

// Test agent data
export const testAgents = {
  primary: {
    elevenLabsAgentId: 'test-agent-12345',
    name: 'Test API Agent',
    description: 'Agent created during API testing',
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.5,
      voice_id: 'test-voice-id'
    },
    configuration: {
      name: 'Test API Agent',
      language: 'en',
      capabilities: ['voice', 'text']
    }
  },
  secondary: {
    elevenLabsAgentId: 'test-agent-67890',
    name: 'Secondary Test Agent',
    description: 'Second agent for testing',
    configuration: {
      name: 'Secondary Test Agent',
      language: 'es',
      capabilities: ['voice']
    }
  },
  provisioning: {
    elevenLabsAgentId: 'provisioning-test-agent',
    name: 'Provisioning Test Agent',
    configuration: {
      name: 'Provisioning Test Agent',
      language: 'en'
    }
  }
};

// Common validation patterns
export const validation = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

// API endpoint helpers
export const endpoints = {
  auth: {
    register: '/api/auth/register',
    signin: '/auth/signin',
    resetPassword: '/api/auth/reset-password'
  },
  admin: {
    users: '/api/admin/users',
    agents: '/api/admin/agents',
    userAgents: (userId) => `/api/admin/users/${userId}/agents`,
    agentUsers: (agentId) => `/api/admin/agents/${agentId}/users`,
    usersBulk: '/api/admin/users/bulk',
    agentsDiscover: '/api/admin/agents/discover',
    agentsSync: '/api/admin/agents/sync',
    agentsHealth: '/api/admin/agents/health'
  }
};

// Test timeout values
export const timeouts = {
  short: 1000,
  medium: 3000,
  long: 10000,
  veryLong: 30000
};

// Expected response statuses
export const httpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Common test selectors for UI elements
export const selectors = {
  auth: {
    emailInput: 'input[name="email"], input[type="email"]',
    passwordInput: 'input[name="password"], input[type="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '[data-testid="error-message"], .error, .alert-error'
  },
  admin: {
    userTable: 'table, [data-testid="users-table"]',
    agentTable: 'table, [data-testid="agents-table"]',
    searchInput: 'input[placeholder*="search"], [data-testid="search-input"]',
    createButton: 'text="Add", text="Create", text="New", [data-testid="create-button"]',
    editButton: 'text="Edit", [data-testid="edit-button"]',
    deleteButton: 'text="Delete", [data-testid="delete-button"]',
    saveButton: 'button:has-text("Save"), [data-testid="save-button"]'
  },
  navigation: {
    adminNav: 'text="Admin", [data-testid="admin-nav"]',
    usersNav: 'text="Users", [data-testid="users-nav"]',
    agentsNav: 'text="Agents", [data-testid="agents-nav"]',
    logoutButton: 'text="Logout", text="Sign Out", [data-testid="logout-button"]'
  }
};

// Helper functions
export const helpers = {
  generateRandomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  generateRandomAgentId: () => `test-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  waitForResponse: (page, url, timeout = 5000) => {
    return page.waitForResponse(response => response.url().includes(url), { timeout });
  },
  
  waitForAnyOf: async (page, selectors, timeout = 5000) => {
    const promises = selectors.map(selector => 
      page.waitForSelector(selector, { timeout }).catch(() => null)
    );
    return Promise.race(promises);
  }
};

module.exports = {
  BASE_URL,
  adminCredentials,
  testUsers,
  testAgents,
  validation,
  endpoints,
  timeouts,
  httpStatus,
  selectors,
  helpers
};