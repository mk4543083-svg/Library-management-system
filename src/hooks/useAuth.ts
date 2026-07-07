import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (u: User | null) => {
      if (!u) {
        setRole(null);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (!mounted) return;
      const isAdmin = data?.some((r) => r.role === "admin");
      setRole(isAdmin ? "admin" : "member");
    };

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      load(data.user).finally(() => mounted && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      load(u);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading, isAdmin: role === "admin" };
}
