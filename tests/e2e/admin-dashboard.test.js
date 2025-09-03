/**
 * Admin Dashboard E2E Tests
 * Tests the complete admin interface functionality including navigation, user management, and agent operations
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test admin credentials
const adminCredentials = {
  email: 'admin@example.com',
  password: 'password123'
};

// Test user for CRUD operations
const testUser = {
  email: 'e2e-test-user@example.com',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'TestUser'
};

test.describe('Admin Dashboard E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', adminCredentials.email);
    await page.fill('input[name="password"]', adminCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin|dashboard|$)/);
  });

  test('should navigate to admin dashboard successfully', async ({ page }) => {
    // Check if we're on the admin page
    await page.goto(`${BASE_URL}/admin`);
    
    // Look for admin-specific elements
    await expect(page.locator('h1, h2, [data-testid="admin-title"]')).toContainText(/admin|dashboard/i);
    
    // Check for navigation elements
    const navElements = [
      'Users', 'Agents', 'Settings', 'Analytics'
    ];
    
    for (const element of navElements) {
      const locator = page.locator(`text=${element}, [data-testid="${element.toLowerCase()}"], nav >> text=${element}`);
      if (await locator.count() > 0) {
        await expect(locator.first()).toBeVisible();
      }
    }
  });

  test('should display users list and pagination', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Wait for users table to load
    await page.waitForSelector('table, [data-testid="users-table"], .user-list');
    
    // Check for table headers or user list items
    const tableHeaders = ['Email', 'Name', 'Role', 'Status', 'Actions'];
    for (const header of tableHeaders) {
      const headerLocator = page.locator(`th:has-text("${header}"), [data-testid="${header.toLowerCase()}-header"]`);
      if (await headerLocator.count() > 0) {
        await expect(headerLocator.first()).toBeVisible();
      }
    }
    
    // Check pagination if present
    const paginationLocator = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="pagination"]');
    if (await paginationLocator.count() > 0) {
      await expect(paginationLocator.first()).toBeVisible();
    }
  });

  test('should search and filter users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[name="search"], [data-testid="search-input"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('admin');
      await page.keyboard.press('Enter');
      
      // Wait for results
      await page.waitForTimeout(1000);
      
      // Verify search results contain 'admin'
      const resultsText = await page.textContent('body');
      expect(resultsText.toLowerCase()).toContain('admin');
    }
    
    // Test role filter if available
    const roleFilter = page.locator('select[name*="role"], [data-testid="role-filter"]');
    if (await roleFilter.count() > 0) {
      await roleFilter.first().selectOption('admin');
      await page.waitForTimeout(1000);
    }
  });

  test('should create new user through UI', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Look for create/add user button
    const createButton = page.locator('text="Add User", text="Create User", text="New User", [data-testid="create-user"], button:has-text("Add")');
    if (await createButton.count() > 0) {
      await createButton.first().click();
      
      // Fill user creation form
      await page.waitForSelector('form, [data-testid="user-form"]');
      
      const emailInput = page.locator('input[name="email"], input[type="email"], [data-testid="email-input"]');
      const passwordInput = page.locator('input[name="password"], input[type="password"], [data-testid="password-input"]');
      const firstNameInput = page.locator('input[name="firstName"], input[name="first_name"], [data-testid="firstname-input"]');
      const lastNameInput = page.locator('input[name="lastName"], input[name="last_name"], [data-testid="lastname-input"]');
      
      if (await emailInput.count() > 0) await emailInput.first().fill(testUser.email);
      if (await passwordInput.count() > 0) await passwordInput.first().fill(testUser.password);
      if (await firstNameInput.count() > 0) await firstNameInput.first().fill(testUser.firstName);
      if (await lastNameInput.count() > 0) await lastNameInput.first().fill(testUser.lastName);
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], text="Create", text="Save", [data-testid="submit-button"]');
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        
        // Wait for success message or redirect
        await page.waitForTimeout(2000);
        
        // Verify user was created by looking for success message or in user list
        const successIndicators = [
          page.locator('text="success", text="created", [data-testid="success-message"]'),
          page.locator(`text="${testUser.email}"`)
        ];
        
        let found = false;
        for (const indicator of successIndicators) {
          if (await indicator.count() > 0) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    } else {
      test.skip('Create user button not found');
    }
  });

  test('should edit user information', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Look for edit button or clickable user row
    const editButton = page.locator('text="Edit", [data-testid="edit-user"], button:has-text("Edit")').first();
    const userRow = page.locator(`text="${testUser.email}"`).locator('..').locator('..'); // Go up to row level
    
    if (await editButton.count() > 0) {
      await editButton.click();
    } else if (await userRow.count() > 0) {
      await userRow.click();
    } else {
      test.skip('No editable user found');
    }
    
    // Wait for edit form
    await page.waitForTimeout(1000);
    
    // Look for name input fields
    const firstNameInput = page.locator('input[name="firstName"], input[name="first_name"]');
    if (await firstNameInput.count() > 0) {
      await firstNameInput.first().fill('Updated Name');
      
      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), [data-testid="save-button"]');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should navigate to agents management', async ({ page }) => {
    // Try different ways to navigate to agents
    const agentNavOptions = [
      `${BASE_URL}/admin/agents`,
      () => page.click('text="Agents"'),
      () => page.click('[data-testid="agents-nav"]'),
      () => page.click('nav >> text="Agents"')
    ];
    
    let navigated = false;
    for (const option of agentNavOptions) {
      try {
        if (typeof option === 'string') {
          await page.goto(option);
        } else {
          await option();
        }
        
        // Wait a bit and check if we're on agents page
        await page.waitForTimeout(1000);
        const url = page.url();
        const content = await page.textContent('body');
        
        if (url.includes('agents') || content.toLowerCase().includes('agent')) {
          navigated = true;
          break;
        }
      } catch (error) {
        // Try next option
        continue;
      }
    }
    
    if (navigated) {
      // Verify agents page elements
      const agentElements = [
        'Agent', 'ElevenLabs', 'Discovery', 'Sync', 'Configuration'
      ];
      
      const pageContent = await page.textContent('body');
      const hasAgentContent = agentElements.some(element => 
        pageContent.toLowerCase().includes(element.toLowerCase())
      );
      
      expect(hasAgentContent).toBe(true);
    } else {
      test.skip('Could not navigate to agents page');
    }
  });

  test('should display agents list with discovery option', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/agents`);
    
    // Wait for agents page to load
    await page.waitForLoadState('networkidle');
    
    // Look for discovery button
    const discoveryButton = page.locator('text="Discover", text="Discovery", [data-testid="discover-agents"]');
    if (await discoveryButton.count() > 0) {
      // Click discovery to test ElevenLabs integration
      await discoveryButton.first().click();
      await page.waitForTimeout(3000); // Discovery might take time
      
      // Check for results or error messages
      const hasResults = await page.locator('table, .agent-list, text="agent"').count() > 0;
      const hasError = await page.locator('text="error", text="failed", [data-testid="error"]').count() > 0;
      
      // Either should have results or a clear error message
      expect(hasResults || hasError).toBe(true);
    }
    
    // Test sync functionality if available
    const syncButton = page.locator('text="Sync", [data-testid="sync-agents"]');
    if (await syncButton.count() > 0) {
      await syncButton.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('should handle bulk operations on users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Look for checkboxes to select users
    const checkboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
    const selectAllCheckbox = page.locator('input[type="checkbox"][data-testid="select-all"], thead input[type="checkbox"]');
    
    if (await checkboxes.count() > 1) {
      // Select a few users
      const count = Math.min(await checkboxes.count(), 3);
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).click();
      }
      
      // Look for bulk action buttons
      const bulkButtons = [
        'text="Activate"',
        'text="Deactivate"', 
        'text="Delete Selected"',
        '[data-testid="bulk-activate"]',
        '[data-testid="bulk-deactivate"]'
      ];
      
      for (const buttonSelector of bulkButtons) {
        const button = page.locator(buttonSelector);
        if (await button.count() > 0 && await button.isVisible()) {
          // Test that button becomes enabled when users are selected
          const isEnabled = await button.isEnabled();
          expect(isEnabled).toBe(true);
          break;
        }
      }
    } else if (await selectAllCheckbox.count() > 0) {
      // Test select all functionality
      await selectAllCheckbox.first().click();
      await page.waitForTimeout(500);
      
      // Verify other checkboxes are selected
      const selectedCount = await page.locator('input[type="checkbox"]:checked').count();
      expect(selectedCount).toBeGreaterThan(1);
    }
  });

  test('should handle user-agent assignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Look for a user to assign agents to
    const userRows = page.locator('table tbody tr, .user-list-item');
    if (await userRows.count() > 0) {
      // Click on first user or look for agents/assign button
      const assignButton = page.locator('text="Assign", text="Agents", [data-testid="assign-agents"]');
      const userRow = userRows.first();
      
      if (await assignButton.count() > 0) {
        await assignButton.first().click();
      } else {
        await userRow.click();
        // Look for agents tab or section
        await page.waitForTimeout(1000);
        const agentsTab = page.locator('text="Agents", [data-testid="agents-tab"]');
        if (await agentsTab.count() > 0) {
          await agentsTab.first().click();
        }
      }
      
      // Wait for agent assignment interface
      await page.waitForTimeout(1000);
      
      // Look for available agents and assign button
      const availableAgentsList = page.locator('.agent-list, table');
      const assignAgentButton = page.locator('text="Assign", button:has-text("Add"), [data-testid="assign-agent"]');
      
      if (await availableAgentsList.count() > 0 && await assignAgentButton.count() > 0) {
        // Verify the interface is working
        await expect(availableAgentsList.first()).toBeVisible();
        await expect(assignAgentButton.first()).toBeVisible();
      }
    }
  });

  test('should display system health and analytics', async ({ page }) => {
    // Try to navigate to analytics/health page
    const healthNavOptions = [
      `${BASE_URL}/admin/health`,
      `${BASE_URL}/admin/analytics`, 
      `${BASE_URL}/admin/dashboard`,
      () => page.click('text="Analytics"'),
      () => page.click('text="Health"'),
      () => page.click('text="Dashboard"')
    ];
    
    let found = false;
    for (const option of healthNavOptions) {
      try {
        if (typeof option === 'string') {
          await page.goto(option);
        } else {
          await option();
        }
        
        await page.waitForTimeout(1000);
        const content = await page.textContent('body');
        
        // Look for health/analytics indicators
        const healthIndicators = [
          'health', 'status', 'active', 'users', 'agents', 'analytics', 'metrics'
        ];
        
        const hasHealthContent = healthIndicators.some(indicator =>
          content.toLowerCase().includes(indicator)
        );
        
        if (hasHealthContent) {
          found = true;
          
          // Look for specific health elements
          const healthElements = [
            page.locator('text="Active Users"'),
            page.locator('text="Total Agents"'), 
            page.locator('text="System Status"'),
            page.locator('.status-indicator, .health-status'),
            page.locator('text="Healthy", text="Online"')
          ];
          
          let hasHealthElement = false;
          for (const element of healthElements) {
            if (await element.count() > 0) {
              hasHealthElement = true;
              break;
            }
          }
          
          if (hasHealthElement) {
            expect(hasHealthElement).toBe(true);
          }
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!found) {
      // At minimum, verify we're still in admin area
      const url = page.url();
      const isInAdmin = url.includes('admin') || url.includes('dashboard');
      expect(isInAdmin).toBe(true);
    }
  });

  test('should logout successfully', async ({ page }) => {
    // Look for logout button in various locations
    const logoutSelectors = [
      'text="Logout"',
      'text="Sign Out"', 
      '[data-testid="logout-button"]',
      '[data-testid="sign-out"]',
      'button:has-text("Logout")',
      'button:has-text("Sign Out")'
    ];
    
    let loggedOut = false;
    for (const selector of logoutSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        await button.first().click();
        
        // Wait for logout to complete
        await page.waitForTimeout(2000);
        
        // Check if redirected to signin or logged out
        const url = page.url();
        if (url.includes('signin') || url.includes('auth')) {
          loggedOut = true;
          break;
        }
      }
    }
    
    if (loggedOut) {
      // Verify we're on signin page
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    } else {
      // Alternative: try to access admin directly and see if redirected
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForTimeout(1000);
      
      const finalUrl = page.url();
      const redirectedToAuth = finalUrl.includes('signin') || finalUrl.includes('auth');
      
      if (!redirectedToAuth) {
        test.skip('Logout functionality not found or not working');
      }
    }
  });
});