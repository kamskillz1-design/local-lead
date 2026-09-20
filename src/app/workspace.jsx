import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setCompany(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .neq("active", false)
        .limit(1)
        .maybeSingle();
      setProfile(membership || null);
      if (membership?.company_id) {
        const { data: co } = await supabase
          .from("companies")
          .select("*")
          .eq("company_id", membership.company_id)
          .maybeSingle();
        setCompany(co || null);
      } else {
        setCompany(null);
      }
    } catch {
      setProfile(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoadingAuth) return;
    refresh();
  }, [isLoadingAuth, refresh, isAuthenticated]);

  const value = useMemo(
    () => ({
      user,
      profile,
      company,
      loading,
      refresh,
    }),
    [user, profile, company, loading, refresh]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function RequireWorkspace({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { profile, company, loading } = useWorkspace();

  if (isLoadingAuth || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!profile || !company) return <Navigate to="/welcome" replace />;
  return children;
}
