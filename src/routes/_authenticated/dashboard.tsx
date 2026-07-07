import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Books · Aldine Library" }] }),
  component: Dashboard,
});

type Loan = {
  id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: "borrowed" | "returned" | "overdue";
  books: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  } | null;
};

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["borrowings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("borrowings")
        .select("id, borrowed_at, due_date, returned_at, status, books(id,title,author,cover_url)")
        .eq("user_id", user!.id)
        .order("borrowed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Loan[];
    },
  });

  const returnBook = useMutation({
    mutationFn: async (loanId: string) => {
      const { error } = await supabase
        .from("borrowings")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", loanId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book returned. Thank you!");
      qc.invalidateQueries({ queryKey: ["borrowings"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = loans.filter((l) => l.status === "borrowed");
  const history = loans.filter((l) => l.status !== "borrowed");

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">My Library</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-foreground">Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={BookOpen} label="Currently borrowed" value={active.length} />
            <StatCard icon={Clock} label="Total loans" value={loans.length} />
            <StatCard icon={CheckCircle2} label="Returned" value={history.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="font-serif text-2xl font-bold">Currently borrowed</h2>
        {isLoading ? <p className="mt-4 text-muted-foreground">Loading…</p> : active.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">You haven't borrowed anything yet.</p>
            <Button asChild className="mt-4"><Link to="/catalog">Browse the catalog</Link></Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {active.map((l) => <LoanRow key={l.id} loan={l} onReturn={() => returnBook.mutate(l.id)} returning={returnBook.isPending} />)}
          </div>
        )}

        {history.length > 0 && (
          <>
            <h2 className="mt-12 font-serif text-2xl font-bold">History</h2>
            <div className="mt-4 space-y-3">
              {history.map((l) => <LoanRow key={l.id} loan={l} />)}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div className="mt-3 font-serif text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function LoanRow({ loan, onReturn, returning }: { loan: Loan; onReturn?: () => void; returning?: boolean }) {
  const due = new Date(loan.due_date);
  const isOverdue = loan.status === "borrowed" && due < new Date();

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-secondary">
        {loan.books?.cover_url && <img src={loan.books.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <Link to="/books/$id" params={{ id: loan.books?.id ?? "" }} className="font-serif font-bold text-foreground hover:underline">{loan.books?.title}</Link>
        <p className="text-sm text-muted-foreground">{loan.books?.author}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Borrowed {new Date(loan.borrowed_at).toLocaleDateString()} · Due {due.toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant={loan.status === "returned" ? "secondary" : isOverdue ? "destructive" : "default"}>
          {loan.status === "returned" ? "Returned" : isOverdue ? "Overdue" : "On loan"}
        </Badge>
        {onReturn && (
          <Button size="sm" variant="outline" onClick={onReturn} disabled={returning}>
            {returning ? "Returning…" : "Return"}
          </Button>
        )}
      </div>
    </div>
  );
}
