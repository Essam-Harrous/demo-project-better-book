import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createWorkoutServerFn,
  completeWorkoutServerFn,
  addSetServerFn,
  deleteSetServerFn,
} from "@/lib/workouts.server";
import { Play, Check, Plus, X } from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentWorkoutQueryOptions, movementsQueryOptions } from "./-queries/current-workout";
import { weightTrackingHistoryQueryOptions } from "../_layout.weight-tracking/-queries/weight-tracking-history";

export const Route = createFileRoute("/__index/_layout/current-workout/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(currentWorkoutQueryOptions()),
      context.queryClient.ensureQueryData(movementsQueryOptions()),
      context.queryClient.ensureQueryData(weightTrackingHistoryQueryOptions()),
    ]);
  },
  component: CurrentWorkoutPage,
});

function CurrentWorkoutPage() {
  const queryClient = useQueryClient();
  const { data: workout } = useSuspenseQuery(currentWorkoutQueryOptions());
  const { data: movements } = useSuspenseQuery(movementsQueryOptions());
  const { data: weightHistory } = useSuspenseQuery(weightTrackingHistoryQueryOptions());
  const [selectedMovement, setSelectedMovement] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [isBodyWeightMovement, setIsBodyWeightMovement] = useState(false);

  // Find the current body weight (latest entry)
  const currentBodyWeight = weightHistory?.[0]?.weight ?? null;

  const handleMovementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const movementId = e.target.value;
    setSelectedMovement(movementId);
    const movement = movements.find((m) => m.id === movementId);
    const isBW = movement?.isBodyWeight ?? false;
    setIsBodyWeightMovement(isBW);
    if (isBW && currentBodyWeight !== null) {
      setWeight(String(currentBodyWeight));
    } else if (isBW) {
      setWeight("");
    }
  };

  const createWorkoutMutation = useMutation({
    mutationFn: () => createWorkoutServerFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentWorkoutQueryOptions().queryKey });
    },
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: () => completeWorkoutServerFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentWorkoutQueryOptions().queryKey });
    },
  });

  const addSetMutation = useMutation({
    mutationFn: (data: { movementId: string; reps: number; weight: number }) =>
      addSetServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentWorkoutQueryOptions().queryKey });
      setReps("");
    },
  });

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => deleteSetServerFn({ data: { setId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentWorkoutQueryOptions().queryKey });
    },
  });

  const canAddSet =
    selectedMovement &&
    reps &&
    weight &&
    !(isBodyWeightMovement && currentBodyWeight === null);

  const handleAddSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddSet) return;
    addSetMutation.mutate({
      movementId: selectedMovement,
      reps: parseInt(reps),
      weight: parseInt(weight),
    });
  };

  if (!workout) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Current Workout</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">No active workout. Ready to start?</p>
            <Button onClick={() => createWorkoutMutation.mutate()} size="lg">
              <Play className="w-4 h-4 mr-2" />
              {createWorkoutMutation.isPending ? "Starting..." : "Start Workout"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Current Workout</h1>
        <Button variant="outline" onClick={() => completeWorkoutMutation.mutate()}>
          <Check className="w-4 h-4 mr-2" />
          {completeWorkoutMutation.isPending ? "Completing..." : "Complete Workout"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddSet} className="space-y-2">
            <div className="flex gap-2 items-center">
              <Select value={selectedMovement} onChange={handleMovementChange}>
                <option value="">Select movement</option>
                {movements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.isBodyWeight ? " (BW)" : ""}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="Weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-24"
                min={0}
                disabled={isBodyWeightMovement}
              />
              <Input
                type="number"
                placeholder="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-24"
                min={1}
              />
              <Button type="submit" disabled={!canAddSet} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {addSetMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            {isBodyWeightMovement && currentBodyWeight === null && (
              <p className="text-sm text-amber-600">
                No body weight recorded. Please go to the{" "}
                <Link to="/weight-tracking" className="underline font-medium text-primary hover:text-primary/80">
                  Weight Tracking
                </Link>{" "}
                page and enter your weight before adding body weight movements.
              </p>
            )}
          </form>
          {workout.sets.length === 0 ? (
            <p className="text-sm text-slate-500">No sets yet. Add exercises to your workout!</p>
          ) : (
            <ul className="space-y-2">
              {workout.sets.map((set) => (
                <li key={set.id} className="px-3 py-2 bg-slate-50 rounded-lg text-sm flex items-center justify-between">
                  <div>
                    <span className="font-medium">{set.movement.name}</span>
                    {set.movement.isBodyWeight && (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-full ml-2">
                        BW
                      </span>
                    )}
                    <span className="text-slate-500 ml-2">
                      {set.reps} reps × {set.weight} lbs
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSetMutation.mutate(set.id)}
                    className="h-8 w-8 text-slate-400">
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
