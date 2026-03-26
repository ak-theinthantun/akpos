import 'dotenv/config';
import { ensureAuthSchema } from '../persistence/auth-store';
import { ensureSalesSchema, getPersistenceMode } from '../persistence/sales-store';
import { getServerEnv } from '../config/env';

async function main() {
  const env = getServerEnv({ requireJwtSecret: false });
  await ensureAuthSchema();
  const result = await ensureSalesSchema();

  console.log(`AKPOS environment: ${env.nodeEnv}`);
  console.log(`AKPOS persistence mode: ${getPersistenceMode()}`);

  if (result.mode === 'memory') {
    console.log('AKPOS database init skipped because DATABASE_URL is not configured.');
    return;
  }

  console.log('AKPOS database schema is ready.');
}

main().catch((error) => {
  console.error('Failed to initialize AKPOS database schema.');
  console.error(error);
  process.exit(1);
});
