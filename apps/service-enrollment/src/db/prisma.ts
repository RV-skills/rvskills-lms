import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "path";
import * as  dotenv from "dotenv";
import { resolveDatabaseUrl } from "@rv-lms/shared-utils";

dotenv.config({ path: path.resolve(__dirname, "../../.env")});

// No custom search_path/schema -- see service-courses's db/prisma.ts
// for why: the real migrations created every table in Postgres's
// default "public" schema, with no multi-schema configuration ever set
// up in schema.prisma.
const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: { rejectUnauthorized: false},
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
