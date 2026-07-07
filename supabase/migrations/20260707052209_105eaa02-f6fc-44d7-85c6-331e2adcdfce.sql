
-- ============ Roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + assign role on signup (first user = admin, others = member)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'member';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Role policies
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Books ============
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  isbn text,
  category text,
  description text,
  cover_url text,
  published_year integer,
  total_copies integer NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies integer NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Books are viewable by everyone" ON public.books
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert books" ON public.books
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update books" ON public.books
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete books" ON public.books
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Borrowings ============
CREATE TYPE public.borrow_status AS ENUM ('borrowed', 'returned', 'overdue');

CREATE TABLE public.borrowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  returned_at timestamptz,
  status public.borrow_status NOT NULL DEFAULT 'borrowed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.borrowings TO authenticated;
GRANT ALL ON public.borrowings TO service_role;
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own borrowings" ON public.borrowings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all borrowings" ON public.borrowings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own borrowings" ON public.borrowings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own borrowings" ON public.borrowings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any borrowing" ON public.borrowings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Adjust available_copies when a borrowing is created or returned
CREATE OR REPLACE FUNCTION public.adjust_book_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET available_copies = available_copies - 1
      WHERE id = NEW.book_id AND available_copies > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No copies available';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'borrowed' AND NEW.status = 'returned' THEN
      UPDATE public.books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER borrowings_adjust_availability
AFTER INSERT OR UPDATE ON public.borrowings
FOR EACH ROW EXECUTE FUNCTION public.adjust_book_availability();

CREATE INDEX borrowings_user_idx ON public.borrowings(user_id);
CREATE INDEX borrowings_book_idx ON public.borrowings(book_id);
CREATE INDEX books_title_idx ON public.books USING gin (to_tsvector('english', title || ' ' || author));
