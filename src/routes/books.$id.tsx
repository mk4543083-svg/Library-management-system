import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Calendar, Hash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/books/$id")({
  component: BookDetail,
});

function BookDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingLoan } = useQuery({
    queryKey: ["loan", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("borrowings")
        .select("id")
        .eq("book_id", id)
        .eq("user_id", user!.id)
        .eq("status", "borrowed")
        .maybeSingle();
      return data;
    },
  });

  const borrow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase.from("borrowings").insert({ book_id: id, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Borrowed! Return within 14 days.");
      qc.invalidateQueries({ queryKey: ["book", id] });
      qc.invalidateQueries({ queryKey: ["loan", id] });
      qc.invalidateQueries({ queryKey: ["borrowings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Frame><p className="text-muted-foreground">Loading…</p></Frame>;
  if (!book) return <Frame><p className="text-muted-foreground">Book not found.</p></Frame>;

  const soldOut = book.available_copies <= 0;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[280px_1fr]">
          <div className="mx-auto w-full max-w-[280px]">
            <div className="overflow-hidden rounded-xl border border-border bg-secondary shadow-xl">
              {book.cover_url ? (
                <img src={book.cover_url} alt={`${book.title} cover`} className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="grid aspect-[2/3] place-items-center text-muted-foreground"><BookOpen className="h-14 w-14" /></div>
              )}
            </div>
          </div>

          <div>
            {book.category && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{book.category}</span>}
            <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-foreground sm:text-5xl">{book.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">by <span className="font-medium text-foreground">{book.author}</span></p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
              {book.published_year && <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />{book.published_year}</span>}
              {book.isbn && <span className="inline-flex items-center gap-2"><Hash className="h-4 w-4" />ISBN {book.isbn}</span>}
              <span className={soldOut ? "text-destructive" : "text-foreground"}>
                {book.available_copies} of {book.total_copies} available
              </span>
            </div>

            {book.description && <p className="mt-6 max-w-2xl leading-relaxed text-foreground/90">{book.description}</p>}

            <div className="mt-8 flex flex-wrap gap-3">
              {!user ? (
                <Button size="lg" onClick={() => router.navigate({ to: "/auth" })}>Sign in to borrow</Button>
              ) : existingLoan ? (
                <Button size="lg" variant="outline" disabled>Already borrowed</Button>
              ) : (
                <Button size="lg" disabled={soldOut || borrow.isPending} onClick={() => borrow.mutate()}>
                  {soldOut ? "Unavailable" : borrow.isPending ? "Borrowing…" : "Borrow this book"}
                </Button>
              )}
              <Button asChild size="lg" variant="outline"><Link to="/catalog">Continue browsing</Link></Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">{children}</div>
      <Footer />
    </div>
  );
}
