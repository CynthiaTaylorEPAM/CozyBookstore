import { join, resolve } from 'node:path';
import { createPool, loadBaseConfig, migrate, serviceUrl } from '@griffin/shared';
import { buildApp } from './app';
import { demoStaff, seedStaff } from './staff';

async function main(): Promise<void> {
  const config = loadBaseConfig(8080);
  const db = createPool(config.databaseUrl, 'auth');
  await migrate(db, 'auth', join(__dirname, '..', 'migrations'));
  await seedStaff(db, demoStaff());

  const app = buildApp({
    db,
    jwtSecret: config.jwtSecret,
    services: {
      catalog: serviceUrl('catalog', 4001),
      patrons: serviceUrl('patrons', 4002),
      incidents: serviceUrl('incidents', 4003),
    },
    portalDir: resolve(process.env.PORTAL_DIR ?? join(__dirname, '..', '..', '..', 'apps', 'portal', 'dist')),
    logger: true,
  });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
