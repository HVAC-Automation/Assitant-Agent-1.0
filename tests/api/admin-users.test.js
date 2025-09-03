/**
 * Admin User Management API Tests
 * Tests all user management functionality including CRUD operations, bulk actions, and password reset
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test admin credentials
const adminCredentials = {
  email: 'admin@example.com',
  password: 'password123'
};

let adminSession;
let testUserId;

test.describe('Admin User Management API', () => {
  
  test.beforeAll(async ({ browser }) => {
    // Login as admin to get session
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', adminCredentials.email);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin|dashboard|$)/);
    
    // Extract session cookie
    const cookies = await page.context().cookies();
    adminSession = cookies.find(cookie => cookie.name.includes('session') || cookie.name.includes('token'));
    await page.close();
  });

  test('should require admin authentication for user management', async ({ request }) => {
    // Try to access user list without authentication
    const response = await request.get(`${BASE_URL}/api/admin/users`);
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should list users with pagination', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.total).toBeDefined();
    expect(body.page).toBe(1);
    expect(body.totalPages).toBeDefined();
  });

  test('should filter users by search query', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users?search=admin`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.users.length).toBeGreaterThan(0);
    
    // Check that results contain the search term
    const hasMatchingUser = body.users.some(user => 
      user.email.includes('admin') || 
      (user.firstName && user.firstName.toLowerCase().includes('admin'))
    );
    expect(hasMatchingUser).toBe(true);
  });

  test('should filter users by role', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users?role=admin`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    
    // All returned users should have admin role
    body.users.forEach(user => {
      expect(user.role).toBe('admin');
    });
  });

  test('should filter users by status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users?status=active`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    
    // All returned users should be active
    body.users.forEach(user => {
      expect(user.isActive).toBe(true);
    });
  });

  test('should create new user', async ({ request }) => {
    const newUser = {
      email: 'test-api-user@example.com',
      password: 'TestPassword123!',
      firstName: 'API',
      lastName: 'Test',
      role: 'user',
      emailVerified: true
    };

    const response = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: newUser
    });
    
    expect(response.status()).toBe(201);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(newUser.email);
    expect(body.user.firstName).toBe(newUser.firstName);
    expect(body.user.lastName).toBe(newUser.lastName);
    expect(body.user.role).toBe(newUser.role);
    expect(body.user.emailVerified).toBe(true);
    expect(body.user).not.toHaveProperty('password'); // Password should not be returned
    
    // Store user ID for further tests
    testUserId = body.user.id;
  });

  test('should validate user creation data', async ({ request }) => {
    // Test missing email
    const response1 = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { password: 'test123' }
    });
    expect(response1.status()).toBe(400);
    
    // Test invalid email format
    const response2 = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { email: 'invalid-email', password: 'TestPassword123!' }
    });
    expect(response2.status()).toBe(400);
    
    // Test weak password
    const response3 = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { email: 'test@example.com', password: '123' }
    });
    expect(response3.status()).toBe(400);
  });

  test('should get specific user by ID', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUserId);
    expect(body.user.email).toBe('test-api-user@example.com');
  });

  test('should update user information', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      role: 'admin'
    };

    const response = await request.patch(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: updateData
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.user.firstName).toBe('Updated');
    expect(body.user.lastName).toBe('Name');
    expect(body.user.role).toBe('admin');
  });

  test('should reset user password', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/reset-password`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.temporaryPassword).toBeDefined();
    expect(body.temporaryPassword.length).toBeGreaterThan(8);
    expect(body.userEmail).toBe('test-api-user@example.com');
  });

  test('should perform bulk user operations - activate', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    // First deactivate the user
    await request.patch(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { isActive: false }
    });

    // Now test bulk activation
    const response = await request.post(`${BASE_URL}/api/admin/users/bulk`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        action: 'activate',
        userIds: [testUserId]
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.results.success).toBe(1);
    expect(body.results.errors).toBe(0);
  });

  test('should perform bulk user operations - deactivate', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.post(`${BASE_URL}/api/admin/users/bulk`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        action: 'deactivate',
        userIds: [testUserId]
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.results.success).toBe(1);
    expect(body.results.errors).toBe(0);
  });

  test('should validate bulk operations', async ({ request }) => {
    // Test invalid action
    const response1 = await request.post(`${BASE_URL}/api/admin/users/bulk`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        action: 'invalid-action',
        userIds: ['some-id']
      }
    });
    expect(response1.status()).toBe(400);
    
    // Test empty userIds
    const response2 = await request.post(`${BASE_URL}/api/admin/users/bulk`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        action: 'activate',
        userIds: []
      }
    });
    expect(response2.status()).toBe(400);
  });

  test('should handle non-existent user', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users/non-existent-id`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('User not found');
  });

  test('should delete user', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.delete(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.message).toContain('deleted successfully');
    
    // Verify user is actually deleted
    const verifyResponse = await request.get(`${BASE_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    expect(verifyResponse.status()).toBe(404);
  });

  test('should maintain data consistency across operations', async ({ request }) => {
    // Create user
    const newUser = {
      email: 'consistency-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Consistency',
      lastName: 'Test',
      role: 'user'
    };

    const createResponse = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: newUser
    });
    
    const createBody = await createResponse.json();
    const userId = createBody.user.id;

    // Update user
    const updateResponse = await request.patch(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { firstName: 'Updated' }
    });
    
    expect(updateResponse.status()).toBe(200);

    // Verify update persisted
    const getResponse = await request.get(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    const getBody = await getResponse.json();
    expect(getBody.user.firstName).toBe('Updated');
    expect(getBody.user.email).toBe(newUser.email); // Should remain unchanged

    // Cleanup
    await request.delete(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
  });
});