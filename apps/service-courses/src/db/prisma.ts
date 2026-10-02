import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg';
import path from "path";
import * as dotenv from "dotenv";
import { resolveDatabaseConnectionConfig } from "@rv-lms/shared-utils";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Discrete fields, not a connection-string URL -- see
// service-auth's repositories for why: a real, AWS-generated RDS
// password can contain characters that remain awkward even once
// correctly percent-encoded into a URL.
const pool = new Pool(resolveDatabaseConnectionConfig());

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter });
