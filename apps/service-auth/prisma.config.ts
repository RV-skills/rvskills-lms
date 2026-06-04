import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import path from "path"

dotenv.config({ path: path.resolve(__dirname, ".env")});

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL
    },
    migrations:{
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts"
    },
});