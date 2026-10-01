import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg';
import path from "path";
import * as dotenv from "dotenv";
import { resolveDatabaseUrl } from "@rv-lms/shared-utils";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// No custom search_path/schema: the real migrations that actually ran
// created every table in Postgres's default "public" schema -- no
// multi-schema configuration (a schemas array plus @@schema on each
// model) was ever set up in schema.prisma, so forcing a non-existent
// "courses" schema here just meant this client could never find its
// own tables. Matches where the data genuinely lives.
const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter });
