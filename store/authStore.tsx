"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile } from "@/services/getUserProfile";

type AuthContextType = {
  user: any;
  role: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export function AuthStore({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        const profile = await getUserProfile();
        setRole(profile?.role ?? null);
      }

      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
