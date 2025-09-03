/**
 * Authentication helper for tests
 * Provides reusable authentication functions
 */

const { BASE_URL, adminCredentials } = require('../fixtures/test-data');

class AuthHelper {
  /**
   * Login via UI and return page with session
   */
  static async loginViaUI(page, credentials = adminCredentials) {
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', credentials.email);
    await page.fill('input[name="password"], input[type="password"]', credentials.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/\/(admin|dashboard|$)/);
    
    return page;
  }

  /**
   * Get session cookie for API requests
   */
  static async getSessionCookie(page, credentials = adminCredentials) {
    // Login first
    await this.loginViaUI(page, credentials);
    
    // Extract session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(cookie => 
      cookie.name.includes('session') || 
      cookie.name.includes('token') ||
      cookie.name.includes('auth')
    );
    
    return sessionCookie;
  }

  /**
   * Create authorization headers for API requests
   */
  static async getAuthHeaders(page, credentials = adminCredentials) {
    const sessionCookie = await this.getSessionCookie(page, credentials);
    
    if (!sessionCookie) {
      throw new Error('Could not obtain session cookie');
    }
    
    return {
      'Cookie': `${sessionCookie.name}=${sessionCookie.value}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Logout via UI
   */
  static async logoutViaUI(page) {
    // Look for logout button in various locations
    const logoutSelectors = [
      'text="Logout"',
      'text="Sign Out"', 
      '[data-testid="logout-button"]',
      'button:has-text("Logout")',
      'button:has-text("Sign Out")'
    ];
    
    for (const selector of logoutSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        break;
      }
    }
    
    // Wait for logout to complete
    await page.waitForTimeout(1000);
    
    // Verify logout by checking URL or trying to access protected route
    const currentUrl = page.url();
    if (!currentUrl.includes('signin') && !currentUrl.includes('auth')) {
      // Try to access admin to see if redirected
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForTimeout(1000);
    }
  }

  /**
   * Check if user is currently logged in
   */
  static async isLoggedIn(page) {
    try {
      // Try to access admin page
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      
      // If we're still on admin page or dashboard, we're logged in
      return currentUrl.includes('admin') || currentUrl.includes('dashboard');
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure user is logged in (login if not already)
   */
  static async ensureLoggedIn(page, credentials = adminCredentials) {
    const loggedIn = await this.isLoggedIn(page);
    
    if (!loggedIn) {
      await this.loginViaUI(page, credentials);
    }
    
    return page;
  }
}

module.exports = AuthHelper;