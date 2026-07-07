import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { BookCard, type BookSummary } from "@/components/library/BookCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog · Aldine Library" },
      { name: "description", content: "Browse and search every title in the Aldine Library catalog." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", "all"],
    queryFn: async (): Promise<BookSummary[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, category, cover_url, available_copies, total_copies")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useMemo(() => Array.from(new Set(books.map((b) => b.category).filter(Boolean))) as string[], [books]);

  const filtered = books.filter((b) => {
    if (category && b.category !== category) return false;
    if (q) {
      const s = q.toLowerCase();
      return b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Catalog</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-foreground sm:text-5xl">Every title, one search away</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Filter by category or search by title and author.</p>

          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or author…" className="h-11 pl-9 bg-background" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge onClick={() => setCategory(null)} variant={category === null ? "default" : "secondary"} className="cursor-pointer">All</Badge>
            {categories.map((c) => (
              <Badge key={c} onClick={() => setCategory(c)} variant={category === c ? "default" : "secondary"} className="cursor-pointer">{c}</Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading books…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No books match your search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
            {filtered.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
