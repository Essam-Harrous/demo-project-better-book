import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { getUserServerFn } from "@/lib/auth.server";
import { LayoutDashboard, Shield } from "lucide-react";

export const Route = createFileRoute("/__index/_layout/admin")({
  loader: async ({ context }) => {
    // Double check admin role on server
    const user = await getUserServerFn();
    if (user?.role !== "ADMIN") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
        </div>
        <div className="flex gap-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary [&.active]:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

        </div>
      </div>
      <Outlet />
    </div>
  );
}
