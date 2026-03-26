import 'dotenv/config';
import { createApp } from './app';
import { ensureAuthSchema } from './persistence/auth-store';
import { initSalesStore } from './persistence/sales-store';
import { getServerEnv } from './config/env';

async function main() {
  const env = getServerEnv();
  await ensureAuthSchema();
  const persistence = await initSalesStore();
  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`AKPOS server listening on 0.0.0.0:${env.port}`);
    console.log(`AKPOS environment: ${env.nodeEnv}`);
    console.log(`AKPOS persistence mode: ${persistence.mode}`);
    console.log(
      env.corsOrigins.length > 0
        ? `AKPOS allowed CORS origins: ${env.corsOrigins.join(', ')}`
        : 'AKPOS allowed CORS origins: *'
    );
  });
}

main().catch((error) => {
  console.error('Failed to start AKPOS server');
  console.error(error);
  process.exit(1);
});
