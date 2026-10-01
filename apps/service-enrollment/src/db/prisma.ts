import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "path";
import * as  dotenv from "dotenv";
import { resolveDatabaseUrl } from "@rv-lms/shared-utils";

dotenv.config({ path: path.resolve(__dirname, "../../.env")});

const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: { rejectUnauthorized: false},
    options: "-c search_path=enrollment"
});

pool.on("connect", (client) => {
    client.query("SET search_path TO enrollment");
});

const adapter = new PrismaPg(pool, { schema: "enrollment" });
export const prisma = new PrismaClient({ adapter });
