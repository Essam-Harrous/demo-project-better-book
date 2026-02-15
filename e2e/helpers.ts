import { type Page, expect } from "@playwright/test";
import { PrismaClient } from "../prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/demo_project";

const TEST_PASSWORD = "testpass123";

/**
 * Creates a new test account and logs in. Returns the email for cleanup.
 */
export async function loginWithNewAccount(
  page: Page,
  prefix: string,
  name: string,
): Promise<string> {
  const email = `test-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@e2e.test`;
  await page.goto("/create-account");
  await page.waitForLoadState("networkidle");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/current-workout", { timeout: 15000 });
  return email;
}

/**
 * Deletes a test account and all associated data by email.
 */
export async function deleteTestAccount(email: string): Promise<void> {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) return;

    // Delete in order to respect foreign key constraints
    await prisma.set.deleteMany({
      where: { workout: { userId: user.id } },
    });
    await prisma.workout.deleteMany({
      where: { userId: user.id },
    });
    await prisma.weightTracking.deleteMany({
      where: { userId: user.id },
    });
    await prisma.user.delete({
      where: { id: user.id },
    });
  } finally {
    await prisma.$disconnect();
  }
}
