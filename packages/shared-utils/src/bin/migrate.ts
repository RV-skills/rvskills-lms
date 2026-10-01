/**
 * Runs `prisma migrate deploy` for one service, with DATABASE_URL
 * resolved the same way the service's own app code resolves it at
 * startup (see resolveDatabaseUrl). The plain `prisma migrate deploy`
 * CLI has no knowledge of that logic on its own.
 *
 * Writes a real .env file at apps/<service>/.env before running the
 * migration, since prisma.config.ts loads its own local .env via
 * dotenv.config(). schema.prisma itself has no url in its datasource
 * block at all -- prisma.config.ts's own datasource.url (via Prisma's
 * env() helper) is the sole source of the connection string, by this
 * project's design.
 *
 * Critically, this runs with CWD set to the service's own directory,
 * not the monorepo root: Prisma's config-file discovery (finding
 * prisma.config.ts at all) is based on the current working directory,
 * not the --schema flag's path. Running from /app (this container's
 * default WORKDIR) meant prisma.config.ts was never found or loaded in
 * the first several attempts at this fix, regardless of how correctly
 * DATABASE_URL itself was set beforehand -- confirmed by prisma
 * generate succeeding during the Docker build, which runs via
 * `pnpm --filter <service> exec`, which does set CWD to the service's
 * own directory.
 *
 * Usage: node packages/shared-utils/dist/bin/migrate.js <service-name>
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolveDatabaseUrl } from "../resolve-database-url";

const service = process.argv[2];

if (!service) {
  console.error("Usage: node migrate.js <service-name>");
  process.exit(1);
}

const serviceDir = `/app/apps/${service}`;
const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

writeFileSync(`${serviceDir}/.env`, `DATABASE_URL=${databaseUrl}\n`);

execSync(`node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma`, {
  stdio: "inherit",
  env: process.env,
  cwd: serviceDir,
});
