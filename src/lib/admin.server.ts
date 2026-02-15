import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "./db.server";
import { getUserServerFn } from "./auth.server";
import { z } from "zod";

// --- Stats Update Logic (Materialized View) ---

export const updateUserStats = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: userId }: { data: string }) => {
    const prisma = await getServerSidePrismaClient();
    // 1. Calculate values
    const [workoutsCount, weightCount, workoutDates] = await Promise.all([
      prisma.workout.count({ where: { userId, completedAt: { not: null } } }),
      prisma.weightTracking.count({ where: { userId } }),
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

    // 2. Calculate Streak
    let currentStreak = 0;
    if (workoutDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let lastDate = new Date(workoutDates[0].completedAt!); // timestamp
      lastDate.setHours(0, 0, 0, 0);

      // Check if last workout was today or yesterday to star streak
      const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 1) {
        currentStreak = 1;
        // Check backwards
        for (let i = 1; i < workoutDates.length; i++) {
          const prevDate = new Date(workoutDates[i].completedAt!);
          prevDate.setHours(0, 0, 0, 0);
          const gap = (lastDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
          if (gap === 1) {
            currentStreak++;
            lastDate = prevDate;
          } else if (gap === 0) {
            // Same day, continue
            continue;
          } else {
            // Gap > 1 day
            break;
          }
        }
      }
    }

    // 3. Upsert Stats
    await prisma.userStats.upsert({
      where: { userId },
      update: {
        totalWorkouts: workoutsCount,
        totalWeightEntries: weightCount,
        currentStreak,
        lastActiveAt: workoutDates[0]?.completedAt || new Date(),
      },
      create: {
        userId,
        totalWorkouts: workoutsCount,
        totalWeightEntries: weightCount,
        currentStreak,
        lastActiveAt: workoutDates[0]?.completedAt || new Date(),
      },
    });

    return { success: true };
  });

// --- Dashboard Queries ---

export const getAdminDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getUserServerFn();
  if (!user) throw new Error("Unauthorized");

  if (user.role !== "ADMIN") throw new Error("Forbidden");

  const prisma = await getServerSidePrismaClient();

  const [topWorkouts, topStreaks, recentActive] = await Promise.all([
    prisma.userStats.findMany({
      take: 5,
      orderBy: { totalWorkouts: "desc" },
      include: { user: { select: { name: true, email: true, id: true } } },
    }),
    prisma.userStats.findMany({
      take: 5,
      orderBy: { currentStreak: "desc" },
      include: { user: { select: { name: true, email: true, id: true } } },
    }),
    prisma.userStats.findMany({
      take: 5,
      orderBy: { lastActiveAt: "desc" },
      include: { user: { select: { name: true, email: true, id: true } } },
    }),
  ]);

  return { topWorkouts, topStreaks, recentActive };
});

export const getUsersList = createServerFn({ method: "GET" })
  .inputValidator(z.object({ page: z.number().default(1), search: z.string().optional(), pageSize: z.number().optional() }))
  .handler(async ({ data: { page, search, pageSize = 20 } }: { data: { page: number; search?: string; pageSize?: number } }) => {
    const user = await getUserServerFn();
    if (!user) throw new Error("Unauthorized");
    
    if (user.role !== "ADMIN") throw new Error("Forbidden");

    const prisma = await getServerSidePrismaClient();

    const limit = pageSize;
    const where = search
      ? {
          role: { not: "ADMIN" as const },
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { role: { not: "ADMIN" as const } };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: { stats: true },
        orderBy: { stats: { lastActiveAt: "desc" } },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, totalPages: Math.ceil(total / limit) };
  });

export const getUserDetails = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }: { data: { userId: string } }) => {
    const user = await getUserServerFn();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    const prisma = await getServerSidePrismaClient();

    const [targetUser, workouts, weightTrackings, nutritionLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { stats: true },
      }),
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 10,
        include: { sets: { include: { movement: true } } },
      }),
      prisma.weightTracking.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.nutritionLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 20,
      }),
    ]);

    if (!targetUser) throw new Error("User not found");

    return { user: targetUser, workouts, weightTrackings: weightTrackings || [], nutritionLogs: nutritionLogs || [] };
  });
