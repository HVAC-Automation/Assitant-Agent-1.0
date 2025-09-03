/**
 * Database helper for tests
 * Provides functions to set up and clean up test data
 */

const { createClient } = require('@supabase/supabase-js');

class DatabaseHelper {
  constructor() {
    this.supabase = null;
    this.initializeClient();
  }

  initializeClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found. Database operations will be limited.');
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } catch (error) {
      console.warn('⚠️  Failed to initialize Supabase client:', error.message);
    }
  }

  /**
   * Clean up test users created during tests
   */
  async cleanupTestUsers(emailPattern = 'test-') {
    if (!this.supabase) {
      console.log('📝 Skipping user cleanup - no database connection');
      return { cleaned: 0, errors: [] };
    }

    try {
      // Delete users with test email patterns
      const { data, error } = await this.supabase
        .from('User')
        .delete()
        .like('email', `%${emailPattern}%`)
        .select();

      if (error) {
        console.error('❌ Error cleaning up test users:', error);
        return { cleaned: 0, errors: [error.message] };
      }

      const cleanedCount = data ? data.length : 0;
      console.log(`🧹 Cleaned up ${cleanedCount} test users`);
      
      return { cleaned: cleanedCount, errors: [] };
    } catch (error) {
      console.error('❌ Exception during user cleanup:', error);
      return { cleaned: 0, errors: [error.message] };
    }
  }

  /**
   * Clean up test agents created during tests
   */
  async cleanupTestAgents(agentIdPattern = 'test-agent-') {
    if (!this.supabase) {
      console.log('📝 Skipping agent cleanup - no database connection');
      return { cleaned: 0, errors: [] };
    }

    try {
      // Delete agents with test ID patterns
      const { data, error } = await this.supabase
        .from('Agent')
        .delete()
        .like('elevenLabsAgentId', `%${agentIdPattern}%`)
        .select();

      if (error) {
        console.error('❌ Error cleaning up test agents:', error);
        return { cleaned: 0, errors: [error.message] };
      }

      const cleanedCount = data ? data.length : 0;
      console.log(`🧹 Cleaned up ${cleanedCount} test agents`);
      
      return { cleaned: cleanedCount, errors: [] };
    } catch (error) {
      console.error('❌ Exception during agent cleanup:', error);
      return { cleaned: 0, errors: [error.message] };
    }
  }

  /**
   * Clean up test user-agent assignments
   */
  async cleanupTestAssignments() {
    if (!this.supabase) {
      console.log('📝 Skipping assignment cleanup - no database connection');
      return { cleaned: 0, errors: [] };
    }

    try {
      // This is more complex as we need to find assignments involving test users or agents
      // For now, we'll rely on cascading deletes when users/agents are deleted
      console.log('🧹 Test assignments cleaned via cascading deletes');
      
      return { cleaned: 0, errors: [] };
    } catch (error) {
      console.error('❌ Exception during assignment cleanup:', error);
      return { cleaned: 0, errors: [error.message] };
    }
  }

  /**
   * Create a test admin user if it doesn't exist
   */
  async ensureTestAdminExists(adminData) {
    if (!this.supabase) {
      console.log('📝 Skipping admin user creation - no database connection');
      return null;
    }

    try {
      // Check if admin already exists
      const { data: existing, error: checkError } = await this.supabase
        .from('User')
        .select('*')
        .eq('email', adminData.email)
        .single();

      if (existing && !checkError) {
        console.log('✅ Test admin user already exists');
        return existing;
      }

      // Create admin user
      const { data: created, error: createError } = await this.supabase
        .from('User')
        .insert([{
          email: adminData.email,
          password: adminData.hashedPassword, // Should be pre-hashed
          firstName: adminData.firstName || 'Test',
          lastName: adminData.lastName || 'Admin',
          role: 'admin',
          emailVerified: true,
          isActive: true
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test admin:', createError);
        return null;
      }

      console.log('✅ Created test admin user');
      return created;
    } catch (error) {
      console.error('❌ Exception creating test admin:', error);
      return null;
    }
  }

  /**
   * Get database statistics for testing
   */
  async getDatabaseStats() {
    if (!this.supabase) {
      return { users: 0, agents: 0, assignments: 0, available: false };
    }

    try {
      const [usersResult, agentsResult, assignmentsResult] = await Promise.all([
        this.supabase.from('User').select('id', { count: 'exact', head: true }),
        this.supabase.from('Agent').select('id', { count: 'exact', head: true }),
        this.supabase.from('UserAgent').select('id', { count: 'exact', head: true })
      ]);

      return {
        users: usersResult.count || 0,
        agents: agentsResult.count || 0,
        assignments: assignmentsResult.count || 0,
        available: true
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return { users: 0, agents: 0, assignments: 0, available: false };
    }
  }

  /**
   * Full cleanup of all test data
   */
  async fullCleanup() {
    console.log('🧹 Starting full test data cleanup...');
    
    const results = await Promise.all([
      this.cleanupTestAssignments(),
      this.cleanupTestAgents(),
      this.cleanupTestUsers()
    ]);

    const totalCleaned = results.reduce((sum, result) => sum + result.cleaned, 0);
    const allErrors = results.flatMap(result => result.errors);

    if (allErrors.length > 0) {
      console.warn('⚠️  Some cleanup operations had errors:', allErrors);
    }

    console.log(`✅ Full cleanup completed. Removed ${totalCleaned} items.`);
    return { totalCleaned, errors: allErrors };
  }
}

// Export singleton instance
module.exports = new DatabaseHelper();