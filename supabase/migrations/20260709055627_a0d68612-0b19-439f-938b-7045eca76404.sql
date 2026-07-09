
CREATE POLICY "Librarians insert books" ON public.books
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'librarian'));
CREATE POLICY "Librarians update books" ON public.books
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'librarian'));
CREATE POLICY "Librarians delete books" ON public.books
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Librarians read all borrowings" ON public.borrowings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'librarian'));
CREATE POLICY "Librarians update any borrowing" ON public.borrowings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Librarians read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'librarian'));

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can change roles'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_remove_user_role(_target_user uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can change roles'; END IF;
  IF _role = 'admin' AND (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;
  IF _target_user = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account here'; END IF;
  DELETE FROM auth.users WHERE id = _target_user;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
