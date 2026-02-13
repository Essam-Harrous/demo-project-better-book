import { getWeightTrackingHistoryServerFn } from "@/lib/weight-tracking.server";
import { queryOptions } from "@tanstack/react-query";

export const weightTrackingHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ["weight-tracking", "history"],
    queryFn: () => getWeightTrackingHistoryServerFn(),
  });
