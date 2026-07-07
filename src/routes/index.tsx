import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { BookCard, type BookSummary } from "@/components/library/BookCard";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, BookMarked, Clock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aldine Library — Borrow, Read, Return" },
      { name: "description", content: "Browse a curated catalog, borrow books online, and manage your loans in one elegant place." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: books } = useQuery({
    queryKey: ["books", "featured"],
    queryFn: async (): Promise<BookSummary[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, category, cover_url, available_copies, total_copies")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              A quieter way to run a library
            </span>
            <h1 className="mt-5 font-serif text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Every book,<br />
              <span className="text-accent">a chapter away.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-primary-foreground/80 sm:text-lg">
              Aldine is a modern library management system — search the catalog, borrow with one click, and return without a queue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/catalog"><Search className="h-4 w-4" />Browse the catalog</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/auth">Get a library card</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6 text-primary-foreground/90">
              <Stat number="12+" label="Titles" />
              <Stat number="14 days" label="Loan period" />
              <Stat number="24/7" label="Access" />
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="grid grid-cols-3 gap-4">
              {books?.slice(0, 6).map((b, i) => (
                <div key={b.id} className={`overflow-hidden rounded-lg shadow-2xl ring-1 ring-black/10 ${i % 2 ? "translate-y-6" : ""}`}>
                  {b.cover_url && <img src={b.cover_url} alt={b.title} className="aspect-[2/3] h-full w-full object-cover" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "Discover", body: "Search titles, authors, and categories across the whole collection instantly." },
            { icon: BookMarked, title: "Borrow", body: "One-click checkout with a 14-day return window and automatic availability tracking." },
            { icon: Clock, title: "Track", body: "See what you're reading, what's due, and what you've returned — all in one place." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-serif text-xl font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured books */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">On the shelves</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">Featured titles</h2>
          </div>
          <Link to="/catalog" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
          {books?.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
      </section>

      {/* Admin note */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-secondary/40 p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">Librarians run the show.</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Admins can add new titles, adjust stock, and review every loan in a dedicated dashboard. The first account created becomes the admin automatically.
              </p>
            </div>
          </div>
          <Button asChild variant="default">
            <Link to="/auth">Create the admin account</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-2xl font-bold text-accent">{number}</div>
      <div className="text-xs uppercase tracking-widest text-primary-foreground/70">{label}</div>
    </div>
  );
}
