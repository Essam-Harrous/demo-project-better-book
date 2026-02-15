import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { authMiddleware } from "@/lib/auth.server";
import { z } from "zod";

export const getDailyNutritionServerFn = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ date: z.string() })) // Expect YYYY-MM-DD
  .handler(async ({ context, data }) => {
    const prisma = await getServerSidePrismaClient();
    
    // Parse the date to get usage range for the day
    const startDate = new Date(data.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.date);
    endDate.setHours(23, 59, 59, 999);

    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId: context.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fats: acc.fats + log.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return { logs, totals };
  });

export const createNutritionLogServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      name: z.string().min(1),
      calories: z.number().nonnegative(),
      protein: z.number().nonnegative(),
      carbs: z.number().nonnegative(),
      fats: z.number().nonnegative(),
      date: z.string(), // YYYY-MM-DD
    })
  )
  .handler(async ({ context, data }) => {
    const prisma = await getServerSidePrismaClient();
    const logDate = new Date(data.date);
    // Set to noon to avoid timezone edge cases shifting the day
    logDate.setHours(12, 0, 0, 0);

    const log = await prisma.nutritionLog.create({
      data: {
        userId: context.user.id,
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        date: logDate,
      },
    });

    return { success: true, log };
  });

export const deleteNutritionLogServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const prisma = await getServerSidePrismaClient();
    
    await prisma.nutritionLog.deleteMany({
      where: {
        id: data.id,
        userId: context.user.id, // Ensure ownership
      },
    });

    return { success: true };
  });
