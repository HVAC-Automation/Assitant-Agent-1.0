/**
 * Admin Agent Management API Tests
 * Tests all agent management functionality including CRUD, discovery, sync, and health monitoring
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test admin credentials
const adminCredentials = {
  email: 'admin@example.com',
  password: 'password123'
};

let adminSession;
let testAgentId;

test.describe('Admin Agent Management API', () => {
  
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

  test('should require admin authentication for agent management', async ({ request }) => {
    // Try to access agent list without authentication
    const response = await request.get(`${BASE_URL}/api/admin/agents`);
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should list agents with pagination', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/agents?page=1&limit=10`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.total).toBeDefined();
    expect(body.page).toBe(1);
    expect(body.totalPages).toBeDefined();
  });

  test('should filter agents by search query', async ({ request }) => {
    // This test assumes there are some agents in the system
    const response = await request.get(`${BASE_URL}/api/admin/agents?search=test`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    // Results should match search criteria if any exist
    if (body.agents.length > 0) {
      const hasMatchingAgent = body.agents.some(agent => 
        agent.name.toLowerCase().includes('test') || 
        (agent.description && agent.description.toLowerCase().includes('test'))
      );
      expect(hasMatchingAgent).toBe(true);
    }
  });

  test('should filter agents by active status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/agents?isActive=true`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    
    // All returned agents should be active
    body.agents.forEach(agent => {
      expect(agent.isActive).toBe(true);
    });
  });

  test('should create new agent', async ({ request }) => {
    const newAgent = {
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
    };

    const response = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: newAgent
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agent.elevenLabsAgentId).toBe(newAgent.elevenLabsAgentId);
    expect(body.agent.name).toBe(newAgent.name);
    expect(body.agent.description).toBe(newAgent.description);
    expect(body.agent.isActive).toBe(true);
    
    // Store agent ID for further tests
    testAgentId = body.agent.id;
  });

  test('should validate agent creation data', async ({ request }) => {
    // Test missing elevenLabsAgentId
    const response1 = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { 
        name: 'Test Agent',
        configuration: { name: 'Test' }
      }
    });
    expect(response1.status()).toBe(400);
    
    // Test missing name
    const response2 = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { 
        elevenLabsAgentId: 'test-123',
        configuration: { name: 'Test' }
      }
    });
    expect(response2.status()).toBe(400);
    
    // Test missing configuration
    const response3 = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { 
        elevenLabsAgentId: 'test-123',
        name: 'Test Agent'
      }
    });
    expect(response3.status()).toBe(400);
  });

  test('should prevent duplicate elevenLabsAgentId', async ({ request }) => {
    // Try to create agent with same ElevenLabs ID
    const duplicateAgent = {
      elevenLabsAgentId: 'test-agent-12345', // Same as previous test
      name: 'Duplicate Agent',
      configuration: { name: 'Duplicate' }
    };

    const response = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: duplicateAgent
    });
    
    expect(response.status()).toBe(500); // Should fail due to duplicate
    const body = await response.json();
    expect(body.error).toContain('Failed to create agent');
  });

  test('should get specific agent by ID', async ({ request }) => {
    if (!testAgentId) {
      test.skip('No test agent created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/agents/${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agent.id).toBe(testAgentId);
    expect(body.agent.name).toBe('Test API Agent');
  });

  test('should update agent information', async ({ request }) => {
    if (!testAgentId) {
      test.skip('No test agent created');
    }

    const updateData = {
      name: 'Updated Test Agent',
      description: 'Updated description',
      isActive: false,
      configuration: {
        name: 'Updated Test Agent',
        language: 'es',
        capabilities: ['voice']
      }
    };

    const response = await request.patch(`${BASE_URL}/api/admin/agents/${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: updateData
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agent.name).toBe('Updated Test Agent');
    expect(body.agent.description).toBe('Updated description');
    expect(body.agent.isActive).toBe(false);
    expect(body.agent.configuration.language).toBe('es');
  });

  test('should discover agents from ElevenLabs', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/agents/discover`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    // This test may fail if ElevenLabs API is not configured or accessible
    if (response.status() === 500) {
      const body = await response.json();
      if (body.error.includes('API key not configured') || body.error.includes('Failed to discover')) {
        test.skip('ElevenLabs API not configured or not accessible');
      }
    }
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.total).toBeDefined();
  });

  test('should sync agents from ElevenLabs', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/admin/agents/sync`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: {} // Sync all agents
    });
    
    // This test may fail if ElevenLabs API is not configured
    if (response.status() === 500) {
      const body = await response.json();
      if (body.error.includes('API key not configured') || body.error.includes('Failed to sync')) {
        test.skip('ElevenLabs API not configured or not accessible');
      }
    }
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.synced).toBeDefined();
    expect(typeof body.synced).toBe('number');
    expect(body.errors).toBeDefined();
    expect(Array.isArray(body.errors)).toBe(true);
  });

  test('should sync specific agents by ID', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/admin/agents/sync`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { 
        agentIds: ['test-agent-id-1', 'test-agent-id-2'] 
      }
    });
    
    // This will likely fail with non-existent agent IDs, which is expected
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.synced).toBeDefined();
      expect(body.errors).toBeDefined();
      // Should have errors for non-existent agents
      expect(body.errors.length).toBeGreaterThan(0);
    } else if (response.status() === 500) {
      // API configuration issue
      test.skip('ElevenLabs API not configured');
    }
  });

  test('should check agent health', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/agents/health`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.summary).toBeDefined();
    expect(body.summary.total).toBeDefined();
    expect(body.summary.healthy).toBeDefined();
    expect(body.summary.unhealthy).toBeDefined();
    expect(body.agents).toBeDefined();
    expect(Array.isArray(body.agents)).toBe(true);
    
    // Each agent should have health information
    body.agents.forEach(agent => {
      expect(agent.health).toBeDefined();
      expect(agent.health.isHealthy).toBeDefined();
      expect(typeof agent.health.isHealthy).toBe('boolean');
      expect(agent.health.lastChecked).toBeDefined();
    });
  });

  test('should check specific agent health', async ({ request }) => {
    if (!testAgentId) {
      test.skip('No test agent created');
    }

    const response = await request.get(`${BASE_URL}/api/admin/agents/health?agentId=${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.agentId).toBe(testAgentId);
    expect(body.health).toBeDefined();
    expect(body.health.isHealthy).toBeDefined();
    expect(typeof body.health.isHealthy).toBe('boolean');
  });

  test('should handle non-existent agent', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/agents/non-existent-id`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Agent not found');
  });

  test('should delete agent', async ({ request }) => {
    if (!testAgentId) {
      test.skip('No test agent created');
    }

    const response = await request.delete(`${BASE_URL}/api/admin/agents/${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.message).toContain('deleted successfully');
    
    // Verify agent is actually deleted
    const verifyResponse = await request.get(`${BASE_URL}/api/admin/agents/${testAgentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    expect(verifyResponse.status()).toBe(404);
  });

  test('should maintain data consistency across operations', async ({ request }) => {
    // Create agent
    const newAgent = {
      elevenLabsAgentId: 'consistency-test-agent',
      name: 'Consistency Test Agent',
      description: 'Testing data consistency',
      configuration: {
        name: 'Consistency Test Agent',
        language: 'en'
      }
    };

    const createResponse = await request.post(`${BASE_URL}/api/admin/agents`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: newAgent
    });
    
    const createBody = await createResponse.json();
    const agentId = createBody.agent.id;

    // Update agent
    const updateResponse = await request.patch(`${BASE_URL}/api/admin/agents/${agentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : '',
        'Content-Type': 'application/json'
      },
      data: { name: 'Updated Consistency Test' }
    });
    
    expect(updateResponse.status()).toBe(200);

    // Verify update persisted
    const getResponse = await request.get(`${BASE_URL}/api/admin/agents/${agentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
    
    const getBody = await getResponse.json();
    expect(getBody.agent.name).toBe('Updated Consistency Test');
    expect(getBody.agent.elevenLabsAgentId).toBe(newAgent.elevenLabsAgentId); // Should remain unchanged

    // Cleanup
    await request.delete(`${BASE_URL}/api/admin/agents/${agentId}`, {
      headers: {
        'Cookie': adminSession ? `${adminSession.name}=${adminSession.value}` : ''
      }
    });
  });
});