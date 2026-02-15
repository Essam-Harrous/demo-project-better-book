import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMovementServerFn, deleteMovementServerFn } from "@/lib/movements.server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { movementsQueryOptions } from "./-queries/movements";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

export const Route = createFileRoute("/__index/_layout/movements/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(movementsQueryOptions());
  },
  component: MovementsPage,
});

function MovementsPage() {
  const queryClient = useQueryClient();
  const { data: movements } = useSuspenseQuery(movementsQueryOptions());
  const [name, setName] = useState("");
  const [isBodyWeight, setIsBodyWeight] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    movementId: string;
    movementName: string;
    setCount: number;
    workoutCount: number;
  }>({ open: false, movementId: "", movementName: "", setCount: 0, workoutCount: 0 });

  const createMovementMutation = useMutation({
    mutationFn: (data: { name: string; isBodyWeight: boolean }) =>
      createMovementServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movementsQueryOptions().queryKey });
      setName("");
      setIsBodyWeight(false);
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: (movementId: string) =>
      deleteMovementServerFn({ data: { movementId, force: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movementsQueryOptions().queryKey });
      toast.success(`"${deleteDialog.movementName}" has been deleted`);
      setDeleteDialog((prev) => ({ ...prev, open: false }));
    },
  });

  const handleDelete = async (movementId: string, movementName: string) => {
    const result = await deleteMovementServerFn({ data: { movementId, force: false } });
    setDeleteDialog({
      open: true,
      movementId,
      movementName,
      setCount: result.requiresConfirmation ? result.setCount : 0,
      workoutCount: result.requiresConfirmation ? result.workoutCount : 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMovementMutation.mutate({ name: name.trim(), isBodyWeight });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Movements</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add New Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
              <Input
                placeholder="Movement name (e.g. Bench Press)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!name.trim()}>
                {createMovementMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isBodyWeight}
                onChange={(e) => setIsBodyWeight(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-primary focus:ring-primary/50"
              />
              Is body weight movement?
            </label>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-slate-500">No movements yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {movements.map((movement) => (
                <li key={movement.id} className="px-3 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {movement.name}
                    {movement.isBodyWeight && (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        Body weight
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDelete(movement.id, movement.name)}
                    disabled={deleteMovementMutation.isPending}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Delete ${movement.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete "{deleteDialog.movementName}"?
            </DialogTitle>
            <DialogDescription>
              {deleteDialog.setCount > 0 ? (
                <>
                  This movement is linked to{" "}
                  <strong>{deleteDialog.setCount} set{deleteDialog.setCount !== 1 ? "s" : ""}</strong>{" "}
                  across{" "}
                  <strong>{deleteDialog.workoutCount} workout{deleteDialog.workoutCount !== 1 ? "s" : ""}</strong>.
                  Deleting it will permanently remove those sets from your workout history.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMovementMutation.mutate(deleteDialog.movementId)}
              disabled={deleteMovementMutation.isPending}
            >
              {deleteMovementMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
