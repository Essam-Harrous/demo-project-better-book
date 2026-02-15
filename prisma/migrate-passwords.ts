import { PrismaClient } from "./generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/demo_project";

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("🔒 Migrating plaintext passwords to Argon2id...\n");

  const users = await prisma.user.findMany();

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Argon2id hashes start with "$argon2id$" — skip already-hashed passwords
    if (user.password.startsWith("$argon2")) {
      console.log(`⏭️  ${user.email} — already hashed, skipping`);
      skipped++;
      continue;
    }

    const hashedPassword = await argon2.hash(user.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ ${user.email} — password hashed`);
    migrated++;
  }

  console.log(`\n🎉 Done! Migrated: ${migrated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
