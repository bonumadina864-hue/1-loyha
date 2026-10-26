import { newDb } from 'pg-mem';
import * as crypto from 'crypto';
import * as entities from '../src/database/entities';

async function test() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16.0 on x86_64-pc-linux-gnu',
  });
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'pairly',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: () => crypto.randomUUID(),
  });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => crypto.randomUUID(),
  });
  
  const ds = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: Object.values(entities),
    synchronize: true,
  });

  await ds.initialize();
  console.log('✅ pg-mem TypeORM connected and synchronized successfully!');
  await ds.destroy();
}

test().catch((e) => console.error('pg-mem error:', e));
