import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { deleteWorkoutsServerFn } from "@/lib/workouts.server";
import { Trash2 } from "lucide-react";
import { workoutHistoryQueryOptions } from "./-queries/workout-history";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Chart } from "react-charts";
import type { AxisOptions } from "react-charts";

export const Route = createFileRoute("/__index/_layout/workout-history/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(workoutHistoryQueryOptions());
  },
  component: WorkoutHistoryPage,
});

type MetricDatum = {
  date: Date;
  value: number;
};

type MetricType = "max-weight" | "total-reps" | "total-volume";

const METRIC_LABELS: Record<MetricType, string> = {
  "max-weight": "Maximum Weight (lbs)",
  "total-reps": "Total Reps",
  "total-volume": "Total Volume (lbs × reps)",
};

function WorkoutHistoryPage() {
  const queryClient = useQueryClient();
  const { data: workouts } = useSuspenseQuery(workoutHistoryQueryOptions());
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [chartMovement, setChartMovement] = useState("");
  const [chartMetric, setChartMetric] = useState<MetricType>("max-weight");

  const deleteWorkoutsMutation = useMutation({
    mutationFn: (workoutIds: string[]) => deleteWorkoutsServerFn({ data: { workoutIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutHistoryQueryOptions().queryKey });
      setSelectedWorkouts(new Set());
    },
  });

  const uniqueMovements = Array.from(
    new Map(workouts.flatMap((w) => w.sets.map((s) => [s.movement.id, s.movement.name]))).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const chartData = useMemo(() => {
    if (!chartMovement) return [{ label: "", data: [] as MetricDatum[] }];

    const points: MetricDatum[] = [];

    const fifteenDaysAgo = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 14);

    workouts
      .filter((w) => w.completedAt && new Date(w.completedAt) >= fifteenDaysAgo)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
      .forEach((workout) => {
        const movementSets = workout.sets.filter((s) => s.movement.id === chartMovement);
        if (movementSets.length === 0) return;

        let value = 0;
        switch (chartMetric) {
          case "max-weight":
            value = Math.max(...movementSets.map((s) => s.weight));
            break;
          case "total-reps":
            value = movementSets.reduce((sum, s) => sum + s.reps, 0);
            break;
          case "total-volume":
            value = movementSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
            break;
        }

        points.push({
          date: new Date(workout.completedAt!),
          value,
        });
      });

    const movementName = uniqueMovements.find(([id]) => id === chartMovement)?.[1] ?? "Movement";
    return [{ label: movementName, data: points }];
  }, [workouts, chartMovement, chartMetric, uniqueMovements]);

  const primaryAxis = useMemo(
    (): AxisOptions<MetricDatum> => ({
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

  const metricRange = useMemo(() => {
    const values = chartData[0].data.map((d) => d.value);
    if (values.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      min: Math.floor(min * 0.8),
      max: Math.ceil(max * 1.2),
    };
  }, [chartData]);

  const secondaryAxes = useMemo(
    (): AxisOptions<MetricDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: "line",
        hardMin: metricRange.min,
        hardMax: metricRange.max,
      },
    ],
    [metricRange],
  );

  const hasChartData = chartData[0].data.length > 0;

  const toggleWorkout = (id: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedWorkouts.size === workouts.length) {
      setSelectedWorkouts(new Set());
    } else {
      setSelectedWorkouts(new Set(workouts.map((w) => w.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedWorkouts.size === 0) return;
    deleteWorkoutsMutation.mutate(Array.from(selectedWorkouts));
  };

  return (
    <div className="space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workout History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select
              value={chartMovement}
              onChange={(e) => setChartMovement(e.target.value)}
              className="w-48"
            >
              <option value="">Select movement</option>
              {uniqueMovements.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value as MetricType)}
              className="w-56"
            >
              <option value="max-weight">Maximum Weight</option>
              <option value="total-reps">Total Reps</option>
              <option value="total-volume">Total Volume</option>
            </Select>
          </div>

          {!chartMovement ? (
            <p className="text-slate-500 text-center py-8">
              Select a movement to see your progression.
            </p>
          ) : hasChartData ? (
            <div>
              <p className="text-sm text-slate-500 mb-2">{METRIC_LABELS[chartMetric]}</p>
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
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No data found for this movement.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Completed Workouts</CardTitle>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedWorkouts.size === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteWorkoutsMutation.isPending ? "Deleting..." : `Delete Selected (${selectedWorkouts.size})`}
          </Button>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <p className="text-sm text-slate-500">No completed workouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedWorkouts.size === workouts.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Sets</th>
                    {uniqueMovements.map(([id, name]) => (
                      <th key={id} className="text-right py-3 px-4 font-medium text-slate-600">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workouts.map((workout) => {
                    const setsByMovement = new Map<string, typeof workout.sets>();
                    workout.sets.forEach((set) => {
                      const existing = setsByMovement.get(set.movement.id) || [];
                      setsByMovement.set(set.movement.id, [...existing, set]);
                    });

                    const isSelected = selectedWorkouts.has(workout.id);
                    return (
                      <tr
                        key={workout.id}
                        className={`border-b border-slate-100 ${isSelected ? "bg-primary/10" : "hover:bg-slate-50"}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedWorkouts.has(workout.id)}
                            onChange={() => toggleWorkout(workout.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {workout.completedAt
                            ? new Date(workout.completedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">{workout.sets.length}</td>
                        {uniqueMovements.map(([movementId]) => {
                          const movementSets = setsByMovement.get(movementId);
                          if (!movementSets || movementSets.length === 0) {
                            return (
                              <td key={movementId} className="py-3 px-4 text-right text-slate-300">
                                -
                              </td>
                            );
                          }
                          const maxWeight = Math.max(...movementSets.map((s) => s.weight));
                          const avgReps = Math.round(
                            movementSets.reduce((sum, s) => sum + s.reps, 0) / movementSets.length,
                          );
                          const numSets = movementSets.length;
                          return (
                            <td key={movementId} className="py-3 px-4 text-right text-slate-600">
                              {maxWeight} lbs / {avgReps} reps / {numSets} sets
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
