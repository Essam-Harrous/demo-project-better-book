import { PrismaClient } from "./generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/demo_project";

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...\n");

  // 1. Find or create a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      },
    });
    console.log("✅ Created test user:", user.email);
  } else {
    console.log("✅ Using existing user:", user.email);
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
    let movement = await prisma.movement.findFirst({ where: { name } });
    if (!movement) {
      movement = await prisma.movement.create({ data: { name, isBodyWeight } });
      console.log(`✅ Created movement: ${name}${isBodyWeight ? " (BW)" : ""}`);
    } else {
      console.log(`✅ Using existing movement: ${name}`);
    }
    movements.push(movement);
  }

  // 3. Create weight tracking entries for the last 15 days
  console.log("\n📊 Creating weight tracking entries...");
  const baseWeight = 180;
  for (let i = 14; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    // Slight weight variation (-2 to +2 lbs)
    const weight = baseWeight + (Math.random() * 4 - 2);

    await prisma.weightTracking.create({
      data: {
        userId: user.id,
        weight: parseFloat(weight.toFixed(1)),
        createdAt: date,
      },
    });
  }
  console.log("✅ Created 15 days of weight entries");

  // 4. Create workouts with sets for the last 15 days
  console.log("\n🏋️ Creating workouts...");

  // Simulated progression: weights increase slightly over the 15 days
  const baseWeights: Record<string, number> = {
    "Bench Press": 135,
    Squat: 185,
    Deadlift: 225,
    "Pull-ups": 180, // body weight
    "Push-ups": 180, // body weight
  };

  for (let i = 14; i >= 0; i--) {
    // Skip some days randomly (rest days)
    if (Math.random() < 0.3) continue;

    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(18, 0, 0, 0);

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        completedAt: date,
      },
    });

    // Pick 2-4 movements for this workout
    const shuffled = [...movements].sort(() => Math.random() - 0.5);
    const dayMovements = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));

    for (const movement of dayMovements) {
      const base = baseWeights[movement.name] ?? 100;
      // Progressive overload: add ~1 lb per day
      const dayWeight = base + (14 - i) * 1;
      const numSets = 3 + Math.floor(Math.random() * 2); // 3-4 sets

      for (let s = 0; s < numSets; s++) {
        // Weight varies slightly per set, reps decrease as weight goes up
        const setWeight = Math.round(dayWeight + (Math.random() * 10 - 5));
        const reps = Math.max(3, 8 - Math.floor(Math.random() * 4));

        await prisma.set.create({
          data: {
            workoutId: workout.id,
            movementId: movement.id,
            weight: movement.isBodyWeight ? Math.round(baseWeight) : setWeight,
            reps,
          },
        });
      }
    }

    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    console.log(`✅ Workout on ${dateStr}: ${dayMovements.map((m) => m.name).join(", ")}`);
  }

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
