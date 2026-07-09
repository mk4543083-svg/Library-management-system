import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { BookOpen, Users, Clock, AlertTriangle, Trash2, ShieldCheck, Library as LibIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Aldine Library" }] }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { userId: userData.user.id };
  },
  component: Admin,
});

type Role = "admin" | "librarian" | "member";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

function Admin() {
  const qc = useQueryClient();
  const currentUserId = Route.useRouteContext().userId;

  // Analytics
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [books, loans, users] = await Promise.all([
        supabase.from("books").select("total_copies, available_copies"),
        supabase.from("borrowings").select("status, due_date"),
        supabase.from("profiles").select("id"),
      ]);
      const totalTitles = books.data?.length ?? 0;
      const totalCopies = books.data?.reduce((n, b) => n + (b.total_copies ?? 0), 0) ?? 0;
      const activeLoans = loans.data?.filter((l) => l.status === "borrowed").length ?? 0;
      const overdue = loans.data?.filter((l) => l.status === "borrowed" && new Date(l.due_date) < new Date()).length ?? 0;
      return {
        totalTitles,
        totalCopies,
        activeLoans,
        overdue,
        totalUsers: users.data?.length ?? 0,
        totalLoans: loans.data?.length ?? 0,
      };
    },
  });

  // Users + their roles
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, Role[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as Role);
        roleMap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: ProfileRow) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("admin_set_user_role", { _target_user: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role added"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("admin_remove_user_role", { _target_user: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role removed"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_user", { _target_user: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleRole(userId: string, role: Role, has: boolean) {
    if (has) removeRole.mutate({ userId, role });
    else setRole.mutate({ userId, role });
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Administrator</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-foreground">Reporting & Analytics</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat icon={BookOpen} label="Total titles" value={stats?.totalTitles ?? "—"} />
            <Stat icon={LibIcon} label="Total copies" value={stats?.totalCopies ?? "—"} />
            <Stat icon={Clock} label="Active loans" value={stats?.activeLoans ?? "—"} />
            <Stat icon={AlertTriangle} label="Overdue" value={stats?.overdue ?? "—"} tone={(stats?.overdue ?? 0) > 0 ? "danger" : "default"} />
            <Stat icon={Users} label="Registered users" value={stats?.totalUsers ?? "—"} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl font-bold">Manage Users</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Toggle roles to grant catalog or admin access. All members can browse and borrow.</p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const hasAdmin = u.roles.includes("admin");
                const hasLibrarian = u.roles.includes("librarian");
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.length === 0 && <Badge variant="secondary">member</Badge>}
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant={hasLibrarian ? "secondary" : "outline"}
                          onClick={() => toggleRole(u.id, "librarian", hasLibrarian)}
                          disabled={setRole.isPending || removeRole.isPending}>
                          {hasLibrarian ? "Revoke librarian" : "Make librarian"}
                        </Button>
                        <Button size="sm" variant={hasAdmin ? "secondary" : "outline"}
                          onClick={() => toggleRole(u.id, "admin", hasAdmin)}
                          disabled={setRole.isPending || removeRole.isPending}>
                          {hasAdmin ? "Revoke admin" : "Make admin"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={isSelf}
                          onClick={() => confirm(`Delete ${u.email}? This removes their account and all borrowings.`) && deleteUser.mutate(u.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: typeof BookOpen; label: string; value: number | string; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className={`grid h-9 w-9 place-items-center rounded-md ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-serif text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
