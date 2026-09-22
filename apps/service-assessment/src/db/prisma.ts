import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env")});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    options: "-c search_path=assessment"
});

pool.on("connect", (client) => {
    client.query("SET search_path TO assessment");
});

const adapter = new PrismaPg(pool, { schema: "assessment" });
export const prisma = new PrismaClient({ adapter });