import { Link, useRouter } from "@tanstack/react-router";
import { BookOpen, LogOut, LayoutDashboard, Shield, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Nav() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Aldine <span className="text-accent">Library</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground [&.active]:text-primary [&.active]:bg-secondary" activeOptions={{ exact: true }}>Home</Link>
          <Link to="/catalog" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground [&.active]:text-primary [&.active]:bg-secondary">Catalog</Link>
          {user && (
            <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground [&.active]:text-primary [&.active]:bg-secondary">My Books</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground [&.active]:text-primary [&.active]:bg-secondary">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground font-semibold text-sm shadow-sm ring-1 ring-border">
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="h-4 w-4" />My Books</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Shield className="h-4 w-4" />Admin</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="default">
              <Link to="/auth"><LogIn className="h-4 w-4" />Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
