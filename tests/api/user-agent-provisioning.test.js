/**
 * User-Agent Provisioning API Tests
 * Tests the assignment and management of agents to users
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
let testAgentId;

test.describe('User-Agent Provisioning API', () => {
  
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

    // Create test user and agent for provisioning tests
    const userResponse = await page.request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        email: 'provisioning-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Provisioning',
        lastName: 'Test'
      }
    });
    
    if (userResponse.ok()) {
      const userBody = await userResponse.json();
      testUserId = userBody.user.id;
    }

    const agentResponse = await page.request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        elevenLabsAgentId: 'provisioning-test-agent',
        name: 'Provisioning Test Agent',
        configuration: { name: 'Provisioning Test Agent', language: 'en' }
      }
    });

    if (agentResponse.ok()) {
      const agentBody = await agentResponse.json();
      testAgentId = agentBody.agent.id;
    }
  });

  test('should require admin authentication for user-agent operations', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/users/test-id/agents`);
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should get user agents (initially empty)', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUserId);
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents.length).toBe(0); // Initially no agents assigned
  });

  test('should assign agent to user', async ({ request }) => {
    if (!testUserId || !testAgentId) {
      test.skip('No test user or agent created');
    }

    const response = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        agentId: testAgentId,
        isDefault: false
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.message).toContain('assigned to user successfully');
    expect(body.assignment.userId).toBe(testUserId);
    expect(body.assignment.agentId).toBe(testAgentId);
    expect(body.assignment.isDefault).toBe(false);
  });

  test('should verify agent assignment', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agents.length).toBe(1);
    expect(body.agents[0].id).toBe(testAgentId);
    expect(body.agents[0].isDefault).toBe(false);
  });

  test('should assign agent as default', async ({ request }) => {
    if (!testUserId || !testAgentId) {
      test.skip('No test user or agent created');
    }

    // First remove the existing assignment
    await request.delete(`${BASE_URL}/api/admin/users/${testUserId}/agents?agentId=${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });

    // Assign as default
    const response = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        agentId: testAgentId,
        isDefault: true
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.assignment.isDefault).toBe(true);
  });

  test('should verify default agent assignment', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agents.length).toBe(1);
    expect(body.agents[0].isDefault).toBe(true);
  });

  test('should prevent duplicate agent assignments', async ({ request }) => {
    if (!testUserId || !testAgentId) {
      test.skip('No test user or agent created');
    }

    // Try to assign the same agent again
    const response = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        agentId: testAgentId,
        isDefault: false
      }
    });
    
    // Should fail or handle gracefully
    expect([200, 400, 409, 500]).toContain(response.status());
    
    // If it succeeds, verify we don't have duplicates
    if (response.status() === 200) {
      const getUserResponse = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
        headers: {
          'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
        }
      });
      
      const getUserBody = await getUserResponse.json();
      const agentAssignments = getUserBody.agents.filter(agent => agent.id === testAgentId);
      expect(agentAssignments.length).toBeLessThanOrEqual(1);
    }
  });

  test('should remove agent from user', async ({ request }) => {
    if (!testUserId || !testAgentId) {
      test.skip('No test user or agent created');
    }

    const response = await request.delete(`${BASE_URL}/api/admin/users/${testUserId}/agents?agentId=${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.message).toContain('removed from user successfully');
  });

  test('should verify agent removal', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agents.length).toBe(0); // Should be empty after removal
  });

  test('should get agent users (reverse view)', async ({ request }) => {
    if (!testAgentId) {
      test.skip('No test agent created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/agents/${testAgentId}/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agent.id).toBe(testAgentId);
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
  });

  test('should bulk assign agent to multiple users', async ({ request }) => {
    if (!testAgentId || !testUserId) {
      test.skip('No test agent or user created');
    }

    // Create additional test user
    const userResponse = await request.post(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        email: 'bulk-test-user@example.com',
        password: 'TestPassword123!',
        firstName: 'Bulk',
        lastName: 'Test'
      }
    });

    let bulkTestUserId;
    if (userResponse.ok()) {
      const userBody = await userResponse.json();
      bulkTestUserId = userBody.user.id;
    }

    if (!bulkTestUserId) {
      test.skip('Could not create additional test user');
    }

    // Bulk assign agent to both users
    const response = await request.post(`${BASE_URL}/api/admin/agents/${testAgentId}/users`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {
        userIds: [testUserId, bulkTestUserId],
        isDefault: false
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.results.total).toBe(2);
    expect(body.results.success).toBe(2);
    expect(body.results.errors).toBe(0);

    // Cleanup the bulk test user
    await request.delete(`${BASE_URL}/api/admin/users/${bulkTestUserId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
  });

  test('should validate user and agent existence', async ({ request }) => {
    // Test non-existent user
    const response1 = await request.post(`${BASE_URL}/api/admin/users/non-existent-user/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { agentId: testAgentId }
    });
    expect(response1.status()).toBe(404);

    // Test non-existent agent
    if (testUserId) {
      const response2 = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
        headers: {
          'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
          'Content-Type': 'application/json'
        },
        data: { agentId: 'non-existent-agent' }
      });
      expect(response2.status()).toBe(404);
    }
  });

  test('should validate required fields', async ({ request }) => {
    if (!testUserId) {
      test.skip('No test user created');
    }

    // Test missing agentId
    const response1 = await request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {}
    });
    expect(response1.status()).toBe(400);

    // Test missing agentId in delete
    const response2 = await request.delete(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    expect(response2.status()).toBe(400);
  });

  test('should handle concurrent assignments', async ({ request }) => {
    if (!testUserId || !testAgentId) {
      test.skip('No test user or agent created');
    }

    // Make multiple concurrent assignment requests
    const promises = [
      request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
        headers: {
          'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
          'Content-Type': 'application/json'
        },
        data: { agentId: testAgentId, isDefault: false }
      }),
      request.post(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
        headers: {
          'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
          'Content-Type': 'application/json'
        },
        data: { agentId: testAgentId, isDefault: true }
      })
    ];

    const responses = await Promise.all(promises);
    
    // At least one should succeed, others may fail gracefully
    const successfulResponses = responses.filter(r => r.ok());
    expect(successfulResponses.length).toBeGreaterThan(0);

    // Verify final state is consistent
    const verifyResponse = await request.get(`${BASE_URL}/api/admin/users/${testUserId}/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    const verifyBody = await verifyResponse.json();
    
    // Should have at most one assignment for this agent
    const agentAssignments = verifyBody.agents.filter(agent => agent.id === testAgentId);
    expect(agentAssignments.length).toBeLessThanOrEqual(1);

    // Cleanup
    if (agentAssignments.length > 0) {
      await request.delete(`${BASE_URL}/api/admin/users/${testUserId}/agents?agentId=${testAgentId}`, {
        headers: {
          'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
        }
      });
    }
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data
    if (testUserId && adminSession) {
      await request.delete(`${BASE_URL}/api/admin/users/${testUserId}`, {
        headers: {
          'Cookie': `${adminSession.name}=${adminSession.value}`
        }
      });
    }

    if (testAgentId && adminSession) {
      await request.delete(`${BASE_URL}/api/admin/agents/${testAgentId}`, {
        headers: {
          'Cookie': `${adminSession.name}=${adminSession.value}`
        }
      });
    }
  });
});