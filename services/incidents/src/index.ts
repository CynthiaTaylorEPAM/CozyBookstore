import { join } from 'node:path';
import { createHttpCatalogClient, createPool, loadBaseConfig, migrate, serviceUrl } from '@griffin/shared';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadBaseConfig(4003);
  const db = createPool(config.databaseUrl, 'incidents');
  await migrate(db, 'incidents', join(__dirname, '..', 'migrations'));
  const catalog = createHttpCatalogClient(serviceUrl('catalog', 4001));
  const app = buildApp({ db, jwtSecret: config.jwtSecret, catalog, logger: true });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
