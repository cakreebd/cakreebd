import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.CAKREE_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.CAKREE_ADMIN_NAME?.trim();
  const password = process.env.CAKREE_ADMIN_PASSWORD;
  if (!email || !name || !password || password.length < 16) {
    throw new Error("Set CAKREE_ADMIN_EMAIL, CAKREE_ADMIN_NAME, and a CAKREE_ADMIN_PASSWORD of at least 16 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("CAKREE_ADMIN_EMAIL must be a valid email address.");
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing && existing.role !== "ADMIN") {
    throw new Error("The configured email already belongs to a non-admin account; refusing implicit privilege escalation.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: "ADMIN", isActive: true },
    update: { name, passwordHash, isActive: true },
    select: { email: true },
  });
  console.log(`Administrator account is ready for ${admin.email}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Administrator setup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
