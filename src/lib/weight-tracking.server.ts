import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { authMiddleware } from "@/lib/auth.server";
import { z } from "zod";

export const createWeightTrackingServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ weight: z.number() }))
  .handler(async ({ context, data }) => {
    const prisma = await getServerSidePrismaClient();
    const weightTracking = await prisma.weightTracking.create({
      data: {
        userId: context.user.id,
        weight: data.weight,
      },
    });
    return { success: true, weightTracking };
  });

export const getWeightTrackingHistoryServerFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const prisma = await getServerSidePrismaClient();
    const weightTrackings = await prisma.weightTracking.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: "desc" },
    });
    return weightTrackings;
  });

export const deleteWeightTrackingServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ weightTrackingIds: z.array(z.string()) }))
  .handler(async ({ context, data }) => {
    const prisma = await getServerSidePrismaClient();
    await prisma.weightTracking.deleteMany({
      where: { id: { in: data.weightTrackingIds }, userId: context.user.id },
    });
    return { success: true };
  });
