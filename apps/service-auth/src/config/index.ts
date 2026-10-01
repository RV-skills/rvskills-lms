import dotenv from 'dotenv';
import { validateEnv } from '@rv-lms/shared-config';
import { resolveDatabaseUrl } from '@rv-lms/shared-utils';

function loadEnv(){
    dotenv.config();
    console.log(`Environment variables loaded`);
}

loadEnv();

// shared-config's validateEnv() requires DATABASE_URL to already be set as
// a single connection string -- it has no knowledge of the individual
// DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME pieces ECS injects instead.
// Resolving it here, before validateEnv() runs, means that Zod check
// always sees a real value either way: unchanged if DATABASE_URL is
// already set (every local/existing environment), or built from the
// individual pieces otherwise.
process.env.DATABASE_URL = resolveDatabaseUrl();

export const serverConfig = validateEnv();
