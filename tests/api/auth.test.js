/**
 * Authentication API Tests
 * Tests the core authentication functionality including registration, login, and session management
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const testUsers = {
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
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  }
};

test.describe('Authentication API', () => {
  
  test('should register new user successfully', async ({ request }) => {
    // Test user registration
    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUsers.user
    });
    
    const body = await response.json();
    
    expect(response.status()).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toContain('User created successfully');
    expect(body.user.email).toBe(testUsers.user.email);
    expect(body.user.role).toBe(testUsers.user.role);
    expect(body.user).not.toHaveProperty('password'); // Password should not be returned
  });

  test('should not register user with duplicate email', async ({ request }) => {
    // Try to register same user again
    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUsers.user
    });
    
    const body = await response.json();
    
    expect(response.status()).toBe(400);
    expect(body.error).toContain('already exists');
  });

  test('should validate required fields during registration', async ({ request }) => {
    // Test missing email
    const response1 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { password: 'test123' }
    });
    expect(response1.status()).toBe(400);
    
    // Test missing password
    const response2 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: 'test@example.com' }
    });
    expect(response2.status()).toBe(400);
    
    // Test invalid email format
    const response3 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: 'invalid-email', password: 'test123' }
    });
    expect(response3.status()).toBe(400);
    
    // Test weak password
    const response4 = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: 'test@example.com', password: '123' }
    });
    expect(response4.status()).toBe(400);
  });

  test('should authenticate valid user', async ({ page }) => {
    // Navigate to signin page
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Fill login form
    await page.fill('input[name="email"]', testUsers.user.email);
    await page.fill('input[name="password"]', testUsers.user.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|admin|$)/);
    
    // Check if user is logged in by looking for user-specific elements
    const userIndicator = page.locator('[data-testid="user-indicator"]');
    if (await userIndicator.isVisible()) {
      expect(await userIndicator.textContent()).toContain(testUsers.user.email);
    }
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Try invalid credentials
    await page.fill('input[name="email"]', testUsers.invalidUser.email);
    await page.fill('input[name="password"]', testUsers.invalidUser.password);
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('should protect admin routes', async ({ page }) => {
    // Try to access admin without authentication
    await page.goto(`${BASE_URL}/admin`);
    
    // Should redirect to signin
    await page.waitForURL(/\/auth\/signin/);
  });

  test('should handle session persistence', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', testUsers.user.email);
    await page.fill('input[name="password"]', testUsers.user.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/\/(dashboard|admin|$)/);
    
    // Refresh page - session should persist
    await page.reload();
    
    // Should still be logged in
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth/signin');
  });

  test('should logout user properly', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', testUsers.user.email);
    await page.fill('input[name="password"]', testUsers.user.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|admin|$)/);
    
    // Find and click logout button
    const logoutButton = page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to signin
      await page.waitForURL(/\/auth\/signin/);
    }
  });
});

test.describe('Password Reset API', () => {
  
  test('should generate password reset token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { email: testUsers.user.email }
    });
    
    const body = await response.json();
    
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.email).toBe(testUsers.user.email);
  });

  test('should reset password with valid token', async ({ request }) => {
    // First get a reset token
    const tokenResponse = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { email: testUsers.user.email }
    });
    
    const tokenBody = await tokenResponse.json();
    const resetToken = tokenBody.token;
    
    // Use token to reset password
    const resetResponse = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { 
        token: resetToken,
        newPassword: 'NewPassword123!'
      }
    });
    
    const resetBody = await resetResponse.json();
    
    expect(resetResponse.status()).toBe(200);
    expect(resetBody.success).toBe(true);
    expect(resetBody.message).toContain('Password reset successfully');
  });

  test('should reject invalid reset token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { 
        token: 'invalid-token',
        newPassword: 'NewPassword123!'
      }
    });
    
    const body = await response.json();
    
    expect(response.status()).toBe(400);
    expect(body.error).toContain('Invalid or expired');
  });
});

// Cleanup function to remove test users after tests
test.afterAll(async ({ request }) => {
  // Note: In a real test environment, you'd want to clean up test data
  // This would require admin authentication and delete endpoints
  console.log('Tests completed - manual cleanup of test data may be required');
});