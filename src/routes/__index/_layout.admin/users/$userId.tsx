import { createFileRoute, Link } from "@tanstack/react-router";
import { getUserDetails } from "@/lib/admin.server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Calendar, Flame, Activity, Weight, Apple, ArrowLeft, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/__index/_layout/admin/users/$userId")({
  loader: ({ params: { userId } }) => getUserDetails({ data: { userId } }),
  component: UserDetails,
});

function UserDetails() {
  const { user, workouts, weightTrackings, nutritionLogs } = Route.useLoaderData();

  // Calculate some quick stats for the header/cards if needed
  const latestWeight = weightTrackings[0]?.weight;
  const initialWeight = weightTrackings[weightTrackings.length - 1]?.weight;
  const weightChange = latestWeight && initialWeight ? latestWeight - initialWeight : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Navigation */}
      <div>
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
        <Avatar className="h-20 w-20 border-4 border-slate-50 shadow-sm">
          <AvatarFallback className="text-3xl bg-slate-100 text-slate-600 font-medium">
            {user.name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {user.name || "Unknown User"}
            </h1>
            {user.role === "ADMIN" && (
              <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 shadow-sm">Admin</Badge>
            )}
            <Badge variant="secondary" className="text-xs font-normal text-slate-500">
              {user.email}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span className={user.stats?.lastActiveAt ? "text-green-600 flex items-center gap-1" : "text-slate-400"}>
              <Activity className="h-3 w-3" />
              {user.stats?.lastActiveAt
                ? `Active ${new Date(user.stats.lastActiveAt).toLocaleDateString()}`
                : "Inactive"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
           {/* Placeholder for actions like "Edit User" or "Freeze Account" */}
        </div>
      </div>

      {/* High Level Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats?.totalWorkouts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime sessions</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats?.currentStreak || 0} Days</div>
            <p className="text-xs text-muted-foreground mt-1">Consistency score</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Current Weight</CardTitle>
            <Weight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestWeight ? `${Number(latestWeight.toFixed(2))} lbs` : "—"}</div>
            {weightChange !== 0 && (
               <p className={`text-xs mt-1 flex items-center gap-1 ${weightChange < 0 ? "text-green-600" : "text-amber-600"}`}>
                 <TrendingUp className={`h-3 w-3 ${weightChange < 0 ? "rotate-180" : ""}`} />
                 {Number(Math.abs(weightChange).toFixed(2))} lbs {weightChange < 0 ? "lost" : "gained"}
               </p>
            )}
            {weightChange === 0 && <p className="text-xs text-muted-foreground mt-1">No change recorded</p>}
          </CardContent>
        </Card>

         <Card className="shadow-sm border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Nutrition Logs</CardTitle>
            <Apple className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Meals tracked recently</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="workouts" className="space-y-6">
        <div className="border-b border-slate-200">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger 
              value="workouts" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2"
            >
              <Dumbbell className="h-4 w-4" /> Workouts
            </TabsTrigger>
            <TabsTrigger 
              value="weight" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2"
            >
              <Weight className="h-4 w-4" /> Weight History
            </TabsTrigger>
            <TabsTrigger 
              value="nutrition" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2"
            >
              <Apple className="h-4 w-4" /> Nutrition
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workouts" className="space-y-4">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                 {workouts.length > 0 && <Badge variant="outline">{workouts.length} recent</Badge>}
               </div>
            </CardHeader>
            <CardContent className="px-0 grid gap-4">
              {workouts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Dumbbell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900">No workouts recorded</h3>
                  <p className="text-slate-500">This user hasn't logged any workouts yet.</p>
                </div>
              ) : (
                workouts.map((workout) => (
                  <Card key={workout.id} className="overflow-hidden hover:shadow-md transition-shadow border-slate-200">
                    <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100">
                          <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-slate-700">
                          {workout.completedAt
                            ? new Date(workout.completedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            : "In Progress"}
                        </span>
                      </div>
                      <Badge variant="secondary" className="font-normal">{workout.sets.length} sets completed</Badge>
                    </div>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {workout.sets.map((set) => (
                          <div key={set.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className="h-2 w-2 rounded-full bg-blue-400" />
                               <span className="font-medium text-slate-700">{set.movement.name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium">
                              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">{set.weight} lbs</span>
                              <span className="text-slate-400">×</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">{set.reps} reps</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weight">
          <Card>
            <CardHeader>
              <CardTitle>Weight Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Weight (lbs)</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weightTrackings.map((entry, i) => {
                       const nextEntry = weightTrackings[i + 1];
                       const diff = nextEntry ? entry.weight - nextEntry.weight : 0;
                       return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{Number(entry.weight.toFixed(2))}</TableCell>
                          <TableCell className="text-right">
                             {diff !== 0 && (
                               <span className={diff < 0 ? "text-green-600" : "text-amber-600"}>
                                 {diff > 0 ? "+" : ""}{Number(diff.toFixed(2))}
                               </span>
                             )}
                             {diff === 0 && <span className="text-slate-400">-</span>}
                          </TableCell>
                        </TableRow>
                       );
                    })}
                    {weightTrackings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                           <div className="flex flex-col items-center justify-center gap-2">
                             <Weight className="h-8 w-8 text-slate-300" />
                             <span>No weight entries recorded</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrition">
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Logs</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Meal</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Macros (P/C/F)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nutritionLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell>{log.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.calories} kcal</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="font-medium text-slate-700">{log.protein}g</span> P • 
                          <span className="font-medium text-slate-700"> {log.carbs}g</span> C • 
                          <span className="font-medium text-slate-700"> {log.fats}g</span> F
                        </TableCell>
                      </TableRow>
                    ))}
                    {nutritionLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                           <div className="flex flex-col items-center justify-center gap-2">
                             <Apple className="h-8 w-8 text-slate-300" />
                             <span>No nutrition logs recorded</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
