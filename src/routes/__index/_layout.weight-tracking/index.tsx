import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createWeightTrackingServerFn,
  deleteWeightTrackingServerFn,
} from "@/lib/weight-tracking.server";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weightTrackingHistoryQueryOptions } from "./-queries/weight-tracking-history";
import { Chart } from "react-charts";
import type { AxisOptions } from "react-charts";

export const Route = createFileRoute("/__index/_layout/weight-tracking/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(weightTrackingHistoryQueryOptions());
  },
  component: WeightTrackingPage,
});

type WeightDatum = {
  date: Date;
  weight: number;
};

function WeightTrackingPage() {
  const queryClient = useQueryClient();
  const { data: weightHistory } = useSuspenseQuery(weightTrackingHistoryQueryOptions());
  const [weight, setWeight] = useState("");

  const createWeightMutation = useMutation({
    mutationFn: (data: { weight: number }) => createWeightTrackingServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightTrackingHistoryQueryOptions().queryKey });
      toast.success("Weight entry added");
      setWeight("");
    },
  });

  const deleteWeightMutation = useMutation({
    mutationFn: (id: string) => deleteWeightTrackingServerFn({ data: { weightTrackingIds: [id] } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightTrackingHistoryQueryOptions().queryKey });
      toast.success("Weight entry deleted");
    },
  });

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    createWeightMutation.mutate({
      weight: parseFloat(weight),
    });
  };

  const currentWeight = weightHistory?.[0]?.weight;
  const chartData = useMemo(() => {
    const toLocalDayKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const now = new Date();
    const fifteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

    const byDay = new Map<string, number>();
    weightHistory
      .filter((entry) => new Date(entry.createdAt) >= fifteenDaysAgo)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((entry) => {
        const dayKey = toLocalDayKey(new Date(entry.createdAt));
        byDay.set(dayKey, entry.weight);
      });

    const points: WeightDatum[] = [];
    let lastWeight: number | null = null;

    const olderEntry = weightHistory
      .filter((entry) => new Date(entry.createdAt) < fifteenDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (olderEntry) {
      lastWeight = olderEntry.weight;
    }

    for (let i = 0; i < 15; i++) {
      const d = new Date(fifteenDaysAgo.getFullYear(), fifteenDaysAgo.getMonth(), fifteenDaysAgo.getDate() + i);
      const dayKey = toLocalDayKey(d);

      if (byDay.has(dayKey)) {
        lastWeight = byDay.get(dayKey)!;
      }

      if (lastWeight !== null) {
        points.push({ date: d, weight: lastWeight });
      }
    }

    return [
      {
        label: "Weight",
        data: points,
      },
    ];
  }, [weightHistory]);

  const primaryAxis = useMemo(
    (): AxisOptions<WeightDatum> => ({
      getValue: (datum) => datum.date,
      hardMin: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 14),
      hardMax: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59),
      formatters: {
        scale: (value: Date | null) =>
          value ? value.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      },
    }),
    [],
  );

  const weightRange = useMemo(() => {
    const weights = chartData[0].data.map((d) => d.weight);
    if (weights.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return {
      min: Math.floor(min * 0.8),
      max: Math.ceil(max * 1.2),
    };
  }, [chartData]);

  const secondaryAxes = useMemo(
    (): AxisOptions<WeightDatum>[] => [
      {
        getValue: (datum) => datum.weight,
        elementType: "line",
        hardMin: weightRange.min,
        hardMax: weightRange.max,
      },
    ],
    [weightRange],
  );

  const hasChartData = chartData[0].data.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Weight Tracking</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900">
              {currentWeight ? `${currentWeight} lbs` : "--"}
            </div>
            <p className="text-slate-500 mt-2">
              {weightHistory?.[0]?.createdAt
                ? new Date(weightHistory[0].createdAt).toLocaleDateString()
                : "No entries yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWeight} className="flex gap-2">
              <Input
                type="number"
                placeholder="Weight (lbs)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="flex-1"
                step="0.1"
                min={0}
              />
              <Button type="submit" disabled={!weight || createWeightMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {createWeightMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Weight Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {hasChartData ? (
            <div style={{ height: "300px" }}>
              <Chart
                options={{
                  data: chartData,
                  primaryAxis,
                  secondaryAxes,
                  defaultColors: ["oklch(37.8% 0.077 168.94)"],
                }}
              />
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No data in the last 15 days. Add some entries!
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {weightHistory.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No weight entries yet. Start tracking!</p>
          ) : (
            <div className="space-y-2">
              {weightHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-slate-900">{entry.weight} lbs</span>
                    <span className="text-sm text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWeightMutation.mutate(entry.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deleteWeightMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
