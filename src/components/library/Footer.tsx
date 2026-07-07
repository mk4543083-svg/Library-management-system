import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><BookOpen className="h-4 w-4" /></span>
            <span className="font-serif text-lg font-bold">Aldine Library</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A place to browse, borrow, and return — quietly organized around the books that matter to you.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li><Link to="/catalog" className="hover:text-primary">Catalog</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary">My Books</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">About</h4>
          <p className="mt-3 text-sm text-muted-foreground">
            BCA Project · IGNOU · Library Management System.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aldine Library. All rights reserved.
      </div>
    </footer>
  );
}
