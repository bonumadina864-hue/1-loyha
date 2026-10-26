/**
 * CI Guard Test: Asserts that DevLogin is physically excluded when NODE_ENV=production.
 * Fails CI build if dev-login route is registered or reachable under production configuration.
 */
process.env.NODE_ENV = 'production';
process.env.ENABLE_DEV_LOGIN = 'false';

import { DevLoginModule } from '../src/modules/dev-login/dev-login.module';

async function runCheck() {
  console.log('🔍 Running CI Dev-Login Production Exclusion Assertion...');

  const registered = DevLoginModule.register();

  if (registered.controllers && registered.controllers.length > 0) {
    console.error(
      '❌ SECURITY FAILURE: DevLoginController was registered under NODE_ENV=production!',
    );
    process.exit(1);
  }

  // Double check even if ENABLE_DEV_LOGIN was mistakenly set to true under production
  process.env.ENABLE_DEV_LOGIN = 'true';
  const registeredWithFlag = DevLoginModule.register();
  if (registeredWithFlag.controllers && registeredWithFlag.controllers.length > 0) {
    console.error(
      '❌ SECURITY FAILURE: DevLoginController registered when NODE_ENV=production regardless of flag!',
    );
    process.exit(1);
  }

  console.log('✅ PASS: Dev-Login route is physically excluded from production builds.');
  process.exit(0);
}

runCheck();
