import { createServerFn } from "@tanstack/react-start";
import { getServerSidePrismaClient } from "@/lib/db.server";
import { z } from "zod";

export const createMovementServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1), isBodyWeight: z.boolean().default(false) }))
  .handler(async ({ data }: { data: { name: string; isBodyWeight: boolean } }) => {
    const prisma = await getServerSidePrismaClient();
    const movement = await prisma.movement.create({
      data: { name: data.name, isBodyWeight: data.isBodyWeight },
    });
    return { success: true, movement };
  });

export const getMovementsServerFn = createServerFn().handler(async () => {
  const prisma = await getServerSidePrismaClient();
  return prisma.movement.findMany({
    orderBy: { name: "asc" },
  });
});

export const deleteMovementServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ movementId: z.string(), force: z.boolean().default(false) }))
  .handler(async ({ data }: { data: { movementId: string; force: boolean } }) => {
    const prisma = await getServerSidePrismaClient();

    const linkedSets = await prisma.set.findMany({
      where: { movementId: data.movementId },
      select: { workoutId: true },
    });

    const setCount = linkedSets.length;
    const workoutCount = new Set(linkedSets.map((s) => s.workoutId)).size;

    if (!data.force) {
      // Check-only mode: always return status, never delete
      return { requiresConfirmation: setCount > 0, setCount, workoutCount } as const;
    }

    // Cascade: delete linked sets first, then the movement
    await prisma.set.deleteMany({ where: { movementId: data.movementId } });
    await prisma.movement.delete({ where: { id: data.movementId } });

    return { success: true } as const;
  });
