import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  console.log('\n🔄 Resetting test database...');

  const scriptPath = path.resolve(__dirname, '../../scripts/reset-test-db.sh');

  try {
    execSync(`bash "${scriptPath}" --force`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_NAME: process.env.DB_NAME || 'expense_mgmt',
        DB_USER: process.env.DB_USER || 'expense_user',
        DB_PASSWORD: process.env.DB_PASSWORD || 'expense_pass',
      },
    });
    console.log('✅ Database reset complete!\n');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    // Don't fail the tests if reset fails - the tests might still work
    console.log('⚠️  Continuing with tests anyway...\n');
  }
}
