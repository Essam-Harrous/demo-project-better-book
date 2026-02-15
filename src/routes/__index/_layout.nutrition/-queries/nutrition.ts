import { queryOptions } from "@tanstack/react-query";
import { getDailyNutritionServerFn } from "@/lib/nutrition.server";

export const dailyNutritionQueryOptions = (date: string) =>
  queryOptions({
    queryKey: ["nutrition", "daily", date],
    queryFn: () => getDailyNutritionServerFn({ data: { date } }),
  });
