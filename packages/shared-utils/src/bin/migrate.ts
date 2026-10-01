import { execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { resolveDatabaseUrl } from "../resolve-database-url";

const service = process.argv[2];

if (!service) {
  console.error("Usage: node migrate.js <service-name>");
  process.exit(1);
}

const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

const envPath = `apps/${service}/.env`;
writeFileSync(envPath, `DATABASE_URL=${databaseUrl}\n`);

console.log("--- MIGRATE DIAGNOSTICS ---");
console.log("DATABASE_URL set in this process:", process.env.DATABASE_URL ? "yes, length " + process.env.DATABASE_URL.length : "NO, EMPTY");
console.log("Wrote env file at:", envPath);
console.log("File content on disk:", readFileSync(envPath, "utf-8"));
console.log("--- END DIAGNOSTICS ---");

execSync(
  `apps/${service}/node_modules/.bin/prisma migrate deploy --schema apps/${service}/prisma/schema.prisma`,
  { stdio: "inherit", env: process.env, cwd: "/app" }
);
