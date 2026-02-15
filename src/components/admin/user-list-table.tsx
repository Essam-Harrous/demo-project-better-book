import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { useState, useEffect } from "react";

interface UserWithStats {
  id: string;
  name: string | null;
  email: string;
  role: string;
  stats?: {
    totalWorkouts: number;
    currentStreak: number;
    lastActiveAt?: Date | string | null;
  } | null;
}

interface UserListTableProps {
  users: UserWithStats[];
  total?: number;
  totalPages?: number;
  currentPage?: number;
  search?: string;
  onSearchChange?: (term: string) => void;
  onPageChange?: (page: number) => void;
  hideSearch?: boolean;
  hidePagination?: boolean;
}

export function UserListTable({
  users,
  total,
  totalPages = 1,
  currentPage = 1,
  search = "",
  onSearchChange,
  onPageChange,
  hideSearch = false,
  hidePagination = false,
}: UserListTableProps) {
  const [searchTerm, setSearchTerm] = useState(search);
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (onSearchChange && debouncedSearch !== search) {
        onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, search]);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  return (
    <div className="space-y-4">
      {!hideSearch && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Users {total !== undefined && `(${total})`}</h2>
          <div className="w-[300px]">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Total Workouts</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user.id} 
                className="cursor-pointer hover:bg-slate-50 relative group"
              >
                <TableCell>
                  <Link to="/admin/users/$userId" params={{ userId: user.id }} className="absolute inset-0 z-10" />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {user.role === "ADMIN" ? (
                    <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">User</Badge>
                  )}
                </TableCell>
                <TableCell>{user.stats?.totalWorkouts || 0}</TableCell>
                <TableCell>{user.stats?.currentStreak || 0} 🔥</TableCell>
                <TableCell>
                  {user.stats?.lastActiveAt
                    ? new Date(user.stats.lastActiveAt).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right relative z-20">
                  <Link to="/admin/users/$userId" params={{ userId: user.id }}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!hidePagination && onPageChange && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
