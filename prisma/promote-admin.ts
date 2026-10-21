import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Provide the exact email address of an existing account.");
  }

  if (process.env.CONFIRM_PRODUCTION_ADMIN_PROMOTION !== "YES") {
    throw new Error("Set CONFIRM_PRODUCTION_ADMIN_PROMOTION=YES only after confirming DATABASE_URL targets the deployed production database.");
  }

  const account = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!account) {
    throw new Error(`No existing Cakree account found for ${email}. Register or sign in with that address first.`);
  }
  if (!account.isActive) {
    throw new Error("This account is inactive. Restore it before granting administrator access.");
  }
  if (account.role === "ADMIN") {
    console.log(`Administrator access is already enabled for ${account.email}.`);
    return;
  }

  const promoted = await prisma.user.update({
    where: { id: account.id },
    data: { role: "ADMIN" },
    select: { email: true, role: true },
  });
  console.log(`Administrator access enabled for ${promoted.email}. The existing password was not changed.`);
}

main()
  .catch((error: unknown) => {
    console.error("Administrator promotion failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
