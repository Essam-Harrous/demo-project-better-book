import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createNutritionLogServerFn,
  deleteNutritionLogServerFn,
} from "@/lib/nutrition.server";
import { Trash2, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyNutritionQueryOptions } from "./-queries/nutrition";
import { toast } from "react-toastify";
import { MacroCard } from "./macro-card";

export const Route = createFileRoute("/__index/_layout/nutrition/")({
  loader: async ({ context, location }) => {
    const today = new Date().toISOString().split("T")[0];
    const date = (location.search as any).date || today;
    await context.queryClient.ensureQueryData(dailyNutritionQueryOptions(date));
  },
  validateSearch: (search: Record<string, unknown>): { date?: string } => {
    return {
      date: typeof search.date === "string" ? search.date : undefined,
    };
  },
  component: NutritionPage,
});

function NutritionPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const today = new Date().toISOString().split("T")[0];
  const date = search.date || today;

  const queryClient = useQueryClient();
  const { data: { logs, totals } } = useSuspenseQuery(dailyNutritionQueryOptions(date));

  // Form state
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  const createLogMutation = useMutation({
    mutationFn: (data: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      date: string;
    }) => createNutritionLogServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyNutritionQueryOptions(date).queryKey });
      toast.success("Entry added");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => deleteNutritionLogServerFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyNutritionQueryOptions(date).queryKey });
      toast.success("Entry deleted");
    },
  });

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !calories) return;

    createLogMutation.mutate({
      name,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      date,
    });
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split("T")[0];
    navigate({ search: { date: newDate } });
  };

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Nutrition Tracking</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)} data-testid="prev-day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-md shadow-sm min-w-[200px] justify-center">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <span className="font-medium">{date === today ? "Today" : formattedDate}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)} data-testid="next-day" disabled={date >= today}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4" data-testid="daily-summary">
        <MacroCard title="Calories" value={totals.calories} unit="kcal" color="bg-blue-500" />
        <MacroCard title="Protein" value={totals.protein} unit="g" color="bg-green-500" />
        <MacroCard title="Carbs" value={totals.carbs} unit="g" color="bg-amber-500" />
        <MacroCard title="Fats" value={totals.fats} unit="g" color="bg-red-500" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Add Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntry} className="space-y-4" data-testid="add-entry-form">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Chicken Breast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fats">Fats (g)</Label>
                  <Input
                    id="fats"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!name || !calories || createLogMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {createLogMutation.isPending ? "Adding..." : "Add Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Log List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No entries for this day. Add one to get started!
              </div>
            ) : (
              <div className="space-y-4" data-testid="log-list">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg group"
                  >
                    <div>
                      <h4 className="font-medium text-slate-900">{log.name}</h4>
                      <div className="text-sm text-slate-500 flex gap-3 mt-1">
                        <span>{log.calories} kcal</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-green-600 font-medium">{log.protein}g P</span>
                        <span className="text-amber-600 font-medium">{log.carbs}g C</span>
                        <span className="text-red-600 font-medium">{log.fats}g F</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLogMutation.mutate(log.id)}
                      disabled={deleteLogMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
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
    </div>
  );
}


