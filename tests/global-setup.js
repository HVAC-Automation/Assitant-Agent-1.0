/**
 * Global setup for Playwright tests
 * Sets up test environment, database, and authentication
 */

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Ensure environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some tests may fail. Make sure to set these in your .env.local file.');
  }
  
  // Set default test URL if not provided
  process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log(`📍 Test URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
  console.log('✅ Global setup completed');
}

module.exports = globalSetup;