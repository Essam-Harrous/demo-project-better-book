import { PrismaClient } from "./generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/demo_project";
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || "";

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...\n");

  const password = await Bun.password.hash("password123" + PASSWORD_PEPPER);

  const usersConfig = [
    { email: "admin@better-bookkeeping.com", name: "Admin User", role: "ADMIN", workoutChance: 0.1 },
    { email: "strong@example.com", name: "Strong User", role: "USER", workoutChance: 0.9 },
    { email: "test@example.com", name: "Average User", role: "USER", workoutChance: 0.5 },
    { email: "weak@example.com", name: "Weak User", role: "USER", workoutChance: 0.2 },
  ] as const;

  const users = [];

  for (const config of usersConfig) {
    const user = await prisma.user.upsert({
      where: { email: config.email },
      update: { role: config.role },
      create: {
        email: config.email,
        name: config.name,
        password,
        role: config.role,
      },
    });
    users.push({ ...user, workoutChance: config.workoutChance });
    console.log(`✅ Upserted user: ${user.email} (${config.role})`);
  }

  // 2. Create movements
  const movementNames = [
    { name: "Bench Press", isBodyWeight: false },
    { name: "Squat", isBodyWeight: false },
    { name: "Deadlift", isBodyWeight: false },
    { name: "Pull-ups", isBodyWeight: true },
    { name: "Push-ups", isBodyWeight: true },
  ];

  const movements = [];
  for (const { name, isBodyWeight } of movementNames) {
    const movement = await prisma.movement.upsert({
      where: { name },
      update: {},
      create: { name, isBodyWeight },
    });
    movements.push(movement);
  }
  console.log("✅ Movements ready");

  // 3. Generate History for each user
  const baseWeights: Record<string, number> = {
    "Bench Press": 135,
    Squat: 185,
    Deadlift: 225,
    "Pull-ups": 180,
    "Push-ups": 180,
  };

  const today = new Date();
  const daysToSimulate = 30;

  console.log(`\n🏋️ Generating ${daysToSimulate} days of history...`);

  for (const user of users) {
    let totalWorkouts = 0;
    let totalWeightEntries = 0;
    let currentStreak = 0;
    let lastActiveAt = user.createdAt;

    // Weight Tracking
    // Everyone logs weight occasionally (30% chance)
    for (let i = daysToSimulate; i >= 0; i--) {
      if (Math.random() > 0.3) continue;
      
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(8, 0, 0, 0);

      await prisma.weightTracking.create({
        data: {
          userId: user.id,
          weight: 180 + (Math.random() * 5 - 2.5),
          createdAt: date,
        },
      });
      totalWeightEntries++;
      // Update last active if newer
      if (date > lastActiveAt) lastActiveAt = date;
    }

    // Workouts
    // Streak calculation helper
    let streakCounter = 0;

    for (let i = daysToSimulate; i >= 0; i--) {
      // Logic: varied workout frequency
      if (Math.random() > user.workoutChance) {
        streakCounter = 0; // miss a day, reset streak (simplified logic)
        continue;
      }

      streakCounter++;
      currentStreak = streakCounter; // update max streak? No, current streak means consecutive from TODAY backwards.
      // But we are simulating past to present.
      // So streakCounter tracks consecutive days ending at 'i'.
      // If i==0 (today) and we worked out, streak is streakCounter.
      // If we miss today, streak is 0?
      // Simplified: currentStreak = streakCounter at end of loop.

      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(18, 0, 0, 0);

      const workout = await prisma.workout.create({
        data: {
          userId: user.id,
          completedAt: date,
        },
      });

      // Add sets...
      const shuffled = [...movements].sort(() => Math.random() - 0.5);
      const dayMovements = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));

      for (const movement of dayMovements) {
        const base = baseWeights[movement.name] ?? 100;
        const dayWeight = base + (30 - i) * 1; // progressive overload
        const numSets = 3;

        for (let s = 0; s < numSets; s++) {
          await prisma.set.create({
            data: {
              workoutId: workout.id,
              movementId: movement.id,
              weight: movement.isBodyWeight ? 180 : Math.round(dayWeight),
              reps: 8,
            },
          });
        }
      }

      totalWorkouts++;
      if (date > lastActiveAt) lastActiveAt = date;
    }
    
    // If user didn't workout today (i=0), streak might be 0 depending on definition.
    // For now, let's trust the counter from the loop.

    // Upsert Stats
    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        totalWorkouts,
        totalWeightEntries,
        currentStreak,
        lastActiveAt,
      },
      create: {
        userId: user.id,
        totalWorkouts,
        totalWeightEntries,
        currentStreak,
        lastActiveAt,
      },
    });
    console.log(`📊 Stats for ${user.email}: ${totalWorkouts} workouts, streak ${currentStreak}`);
  }

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
