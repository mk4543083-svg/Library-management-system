import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/library/Nav";
import { Footer } from "@/components/library/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, BookOpen, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/librarian")({
  head: () => ({ meta: [{ title: "Catalog Management · Aldine Library" }] }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const allowed = roles?.some((r) => r.role === "librarian" || r.role === "admin");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },
  component: Librarian,
});

type Book = {
  id: string;
  title: string;
  author: string;
  category: string | null;
  cover_url: string | null;
  isbn: string | null;
  published_year: number | null;
  description: string | null;
  total_copies: number;
  available_copies: number;
};

function Librarian() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Book | null>(null);
  const [open, setOpen] = useState(false);

  const { data: books = [] } = useQuery({
    queryKey: ["books", "librarian"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase.from("books").select("*").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["borrowings", "librarian"],
    queryFn: async () => {
      const { data } = await supabase
        .from("borrowings")
        .select("id, status, borrowed_at, due_date, book_id, books(title)")
        .order("borrowed_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const totalCopies = books.reduce((n, b) => n + b.total_copies, 0);
  const availableCopies = books.reduce((n, b) => n + b.available_copies, 0);
  const activeLoans = loans.filter((l) => l.status === "borrowed").length;
  const overdue = loans.filter((l) => l.status === "borrowed" && new Date(l.due_date) < new Date()).length;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Book removed"); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const markReturned = useMutation({
    mutationFn: async (loanId: string) => {
      const { error } = await supabase.from("borrowings")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", loanId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as returned");
      qc.invalidateQueries({ queryKey: ["borrowings"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(b: Book | null) { setEditing(b); setOpen(true); }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Librarian</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="mt-2 font-serif text-4xl font-bold text-foreground">Catalog Management</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => startEdit(null)}><Plus className="h-4 w-4" />Add book</Button>
              </DialogTrigger>
              <BookForm book={editing} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["books"] }); }} />
            </Dialog>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Stat icon={BookOpen} label="Titles" value={books.length} />
            <Stat icon={BookOpen} label="Copies" value={`${availableCopies} / ${totalCopies}`} />
            <Stat icon={Clock} label="Active loans" value={activeLoans} />
            <Stat icon={AlertTriangle} label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : "default"} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="font-serif text-2xl font-bold">Books ({books.length})</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.author}</TableCell>
                  <TableCell>{b.category}</TableCell>
                  <TableCell>{b.available_copies} / {b.total_copies}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${b.title}"?`) && del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <h2 className="mt-12 font-serif text-2xl font-bold">Recent loans</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l: { id: string; status: string; borrowed_at: string; due_date: string; books?: { title: string } | null }) => {
                const isOverdue = l.status === "borrowed" && new Date(l.due_date) < new Date();
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.books?.title}</TableCell>
                    <TableCell>{new Date(l.borrowed_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(l.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "returned" ? "secondary" : isOverdue ? "destructive" : "default"}>
                        {l.status === "returned" ? "Returned" : isOverdue ? "Overdue" : "On loan"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "borrowed" && (
                        <Button size="sm" variant="outline" onClick={() => markReturned.mutate(l.id)} disabled={markReturned.isPending}>Mark returned</Button>
                      )}
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className={`grid h-9 w-9 place-items-center rounded-md ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-serif text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function BookForm({ book, onDone }: { book: Book | null; onDone: () => void }) {
  const [f, setF] = useState({
    title: book?.title ?? "",
    author: book?.author ?? "",
    category: book?.category ?? "",
    isbn: book?.isbn ?? "",
    cover_url: book?.cover_url ?? "",
    published_year: book?.published_year?.toString() ?? "",
    description: book?.description ?? "",
    total_copies: book?.total_copies?.toString() ?? "1",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: f.title,
      author: f.author,
      category: f.category || null,
      isbn: f.isbn || null,
      cover_url: f.cover_url || null,
      published_year: f.published_year ? Number(f.published_year) : null,
      description: f.description || null,
      total_copies: Number(f.total_copies),
      ...(book ? {} : { available_copies: Number(f.total_copies) }),
    };
    const q = book
      ? supabase.from("books").update(payload).eq("id", book.id)
      : supabase.from("books").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(book ? "Book updated" : "Book added");
    onDone();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{book ? "Edit book" : "Add new book"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Author"><Input required value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Genre"><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
          <Field label="Year"><Input type="number" value={f.published_year} onChange={(e) => setF({ ...f, published_year: e.target.value })} /></Field>
        </div>
        <Field label="ISBN"><Input value={f.isbn} onChange={(e) => setF({ ...f, isbn: e.target.value })} /></Field>
        <Field label="Cover image URL"><Input value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Total copies"><Input type="number" min={0} required value={f.total_copies} onChange={(e) => setF({ ...f, total_copies: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : book ? "Save changes" : "Add book"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
