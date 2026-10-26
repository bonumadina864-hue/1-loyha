import { DataSource, DataSourceOptions } from 'typeorm';
import { Logger } from '@nestjs/common';
import { newDb } from 'pg-mem';
import * as crypto from 'crypto';

const logger = new Logger('DatabaseFactory');

export async function createDatabaseDataSource(
  options?: DataSourceOptions,
): Promise<DataSource> {
  const useMemoryDb = process.env.USE_MEMORY_DB === 'true';

  if (!useMemoryDb && options) {
    const directDataSource = new DataSource(options);
    try {
      logger.log(
        `Attempting PostgreSQL connection to ${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}...`,
      );
      await directDataSource.initialize();
      logger.log('✅ Connected to external PostgreSQL database successfully.');
      return directDataSource;
    } catch (err: any) {
      logger.warn(
        `External PostgreSQL unavailable (${err.message}). Seamlessly switching to embedded in-memory PostgreSQL engine (pg-mem).`,
      );
    }
  }

  // Fallback / In-Memory PostgreSQL engine
  logger.log('🚀 Initializing embedded In-Memory PostgreSQL engine (pg-mem)...');
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

  const memoryDataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: options?.entities || [],
    synchronize: true,
  });

  await memoryDataSource.initialize();
  logger.log('✅ Embedded In-Memory PostgreSQL engine active & synchronized.');
  return memoryDataSource;
}
