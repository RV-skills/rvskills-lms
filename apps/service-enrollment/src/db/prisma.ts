import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "path";
import * as  dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env")});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false},
    options: "-c search_path=enrollment"
});

pool.on("connect", (client) => {
    client.query("SET search_path TO enrollment");
});

const adapter = new PrismaPg(pool, { schema: "enrollment" });
export const prisma = new PrismaClient({ adapter });