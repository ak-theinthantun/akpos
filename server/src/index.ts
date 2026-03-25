import 'dotenv/config';
import { createApp } from './app';
import { initSalesStore } from './persistence/sales-store';

const port = Number(process.env.PORT ?? 4000);

async function main() {
  const persistence = await initSalesStore();
  const app = createApp();

  app.listen(port, () => {
    console.log(`AKPOS server listening on http://localhost:${port}`);
    console.log(`AKPOS persistence mode: ${persistence.mode}`);
  });
}

main().catch((error) => {
  console.error('Failed to start AKPOS server');
  console.error(error);
  process.exit(1);
});
