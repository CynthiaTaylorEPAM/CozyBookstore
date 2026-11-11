import { join } from 'node:path';
import { createPool, loadBaseConfig, migrate } from '@griffin/shared';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadBaseConfig(4001);
  const db = createPool(config.databaseUrl, 'catalog');
  await migrate(db, 'catalog', join(__dirname, '..', 'migrations'));
  const app = buildApp({ db, jwtSecret: config.jwtSecret, logger: true });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
