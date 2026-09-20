import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { mergeAuthUser, signOut as adapterSignOut } from "@/adapters/base44/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const applySession = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      return;
    }
    const merged = await mergeAuthUser(session.user);
    setUser(merged);
    setIsAuthenticated(true);
    setAuthError(null);
  }, []);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const { data } = await supabase.auth.getSession();
      await applySession(data.session);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required" });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setIsLoadingPublicSettings(false);
    }
  }, [applySession]);

  useEffect(() => {
    checkUserAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [applySession, checkUserAuth]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
    return data.session?.user || null;
  }, [applySession]);

  const logout = useCallback(async () => {
    await adapterSignOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      checkUserAuth,
      refreshUser,
      logout,
      navigateToLogin,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      checkUserAuth,
      refreshUser,
      logout,
      navigateToLogin,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
