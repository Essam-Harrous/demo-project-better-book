import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createWeightTrackingServerFn,
  deleteWeightTrackingServerFn,
} from "@/lib/weight-tracking.server";
import { Plus, Trash2 } from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weightTrackingHistoryQueryOptions } from "./-queries/weight-tracking-history";

export const Route = createFileRoute("/__index/_layout/weight-tracking/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(weightTrackingHistoryQueryOptions());
  },
  component: WeightTrackingPage,
});

function WeightTrackingPage() {
  const queryClient = useQueryClient();
  const { data: weightHistory } = useSuspenseQuery(weightTrackingHistoryQueryOptions());
  const [weight, setWeight] = useState("");

  const createWeightMutation = useMutation({
    mutationFn: (data: { weight: number }) => createWeightTrackingServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightTrackingHistoryQueryOptions().queryKey });
      setWeight("");
    },
  });

  const deleteWeightMutation = useMutation({
    mutationFn: (id: string) => deleteWeightTrackingServerFn({ data: { weightTrackingIds: [id] } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightTrackingHistoryQueryOptions().queryKey });
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
