import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getAdminDashboardStats, getUsersList } from "@/lib/admin.server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Activity, Flame } from "lucide-react";
import { UserListTable } from "@/components/admin/user-list-table";
import { z } from "zod";

export const Route = createFileRoute("/__index/_layout/admin/")({
  validateSearch: z.object({
    page: z.number().optional(),
    search: z.string().optional(),
  }),
  loaderDeps: ({ search: { page, search } }) => ({ page, search }),
  loader: async ({ deps: { page, search } }) => {
    const [stats, usersData] = await Promise.all([
      getAdminDashboardStats(),
      getUsersList({ data: { page: page || 1, search, pageSize: 10 } }),
    ]);
    return { ...stats, usersData };
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const { topWorkouts, topStreaks, recentActive, usersData } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const handleSearchChange = (term: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: term || undefined, page: 1 }),
      replace: true,
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Top Workouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topWorkouts.map((stat, i) => (
              <div key={stat.userId} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{stat.user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{stat.user.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.user.email}</p>
                </div>
                <div className="ml-auto font-medium">+{stat.totalWorkouts}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Streaks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Streaks</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topStreaks.map((stat, i) => (
              <div key={stat.userId} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{stat.user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{stat.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Streak: {stat.currentStreak} days
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActive.map((stat, i) => (
              <div key={stat.userId} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{stat.user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{stat.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last Active: {new Date(stat.lastActiveAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Users</h3>
        <UserListTable
          users={usersData.users}
          total={usersData.total}
          totalPages={usersData.totalPages}
          currentPage={searchParams.page || 1}
          search={searchParams.search || ""}
          onSearchChange={handleSearchChange}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
