import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { resolveDatabaseConnectionConfig } from "@rv-lms/shared-utils";

const pool = new Pool(resolveDatabaseConnectionConfig());
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: make-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: user.user_id, role_id: "role-admin" } },
    update: {},
    create: { user_id: user.user_id, role_id: "role-admin" },
  });

  console.log(`Granted Admin role to ${email} (${user.user_id})`);
}

main()
  .catch((e) => {
    console.error("make-admin failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
