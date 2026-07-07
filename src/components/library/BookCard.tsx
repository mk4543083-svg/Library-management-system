import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export type BookSummary = {
  id: string;
  title: string;
  author: string;
  category: string | null;
  cover_url: string | null;
  available_copies: number;
  total_copies: number;
};

export function BookCard({ book }: { book: BookSummary }) {
  const soldOut = book.available_copies <= 0;
  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-secondary">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`${book.title} cover`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            soldOut ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
          }`}
        >
          {soldOut ? "Unavailable" : `${book.available_copies} left`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {book.category && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">{book.category}</span>
        )}
        <h3 className="font-serif text-base font-bold leading-snug text-foreground line-clamp-2">{book.title}</h3>
        <p className="mt-auto text-sm text-muted-foreground">{book.author}</p>
      </div>
    </Link>
  );
}
