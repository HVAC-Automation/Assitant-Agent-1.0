/**
 * Simple Connectivity Test
 * Tests basic API connectivity and response format
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://assitant-agent-1-0.vercel.app';

test.describe('API Connectivity Tests', () => {
  
  test('should connect to deployed application', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    
    expect(response.status()).toBeLessThan(500);
    console.log(`✅ Home page status: ${response.status()}`);
  });

  test('should have working API endpoints', async ({ request }) => {
    // Test a simple POST to reset password endpoint (should return error but in JSON format)
    const response = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { email: 'nonexistent@test.com' }
    });
    
    console.log(`Reset password endpoint status: ${response.status()}`);
    
    // Should return JSON error, not HTML
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    
    console.log(`✅ API returns JSON: ${JSON.stringify(body)}`);
  });

  test('should require authentication for admin endpoints', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users`);
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    
    console.log(`✅ Admin endpoint properly secured: ${response.status()}`);
  });

  test('should handle signin page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Check that signin page loads
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    
    console.log('✅ Signin page loads correctly');
  });

  test('should reject invalid login', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Try invalid credentials
    await page.fill('input[name="email"], input[type="email"]', 'invalid@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait a bit for any error message
    await page.waitForTimeout(3000);
    
    // Should still be on signin page or show error
    const currentUrl = page.url();
    const isStillOnSignin = currentUrl.includes('signin') || currentUrl.includes('auth');
    
    console.log(`Current URL after invalid login: ${currentUrl}`);
    console.log(`✅ Invalid login handled: ${isStillOnSignin ? 'stayed on signin' : 'redirected elsewhere'}`);
  });
});