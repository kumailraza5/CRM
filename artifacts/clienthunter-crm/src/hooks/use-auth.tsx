import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  getCurrentUser,
  useGetCurrentUser, 
  useRegister, 
  useLogout,
  setAuthTokenGetter
} from "@workspace/api-client-react";
import type { AuthUser, RegisterRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

type LoginData = { email: string; password?: string };

function getAppRedirectUrl(path: string) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${basePath}${path}`;
}

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Configure the API client to send the Supabase JWT with every request
setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const { 
    data: user, 
    isLoading: isUserLoading, 
    error: userError 
  } = useGetCurrentUser({
    query: {
      queryKey: ["/api/auth/user"],
      retry: false,
      staleTime: Infinity,
      enabled: !isInitializing && hasSession,
    }
  });

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setIsInitializing(false);
      if (session) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(Boolean(session));
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (event === "SIGNED_OUT") {
        queryClient.setQueryData(["/api/auth/user"], null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = async (data: LoginData) => {
    if (!data.password) throw new Error("Password required");
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) throw error;

    setHasSession(true);
    const currentUser = await getCurrentUser();
    queryClient.setQueryData(["/api/auth/user"], currentUser);
    setLocation("/dashboard");
  };

  const register = async (data: RegisterRequest) => {
    // 1. Sign up with Supabase
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: (data as any).password,
      options: {
        emailRedirectTo: getAppRedirectUrl("/auth/callback"),
        data: {
          name: data.name
        }
      }
    });

    if (error) throw error;
    if (!authData.user) throw new Error("Failed to create user");

    // 2. Create profile in our database
    await registerMutation.mutateAsync({ 
      data: {
        email: data.email,
        name: data.name,
        supabaseId: authData.user.id
      } 
    });

    // Redirect to verify email page
    setLocation(`/verify-email?email=${encodeURIComponent(data.email)}`);
  };

  const logout = async () => {
    // 1. Call our API logout
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      console.error("API logout failed", e);
    }
    
    // 2. Clear Supabase session
    await supabase.auth.signOut();
    
    // 3. Clear cache and redirect
    setHasSession(false);
    queryClient.setQueryData(["/api/auth/user"], null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user: hasSession ? user ?? null : null, 
        isLoading: isInitializing || (hasSession && isUserLoading), 
        login, 
        register, 
        logout,
        error: registerMutation.error || (hasSession ? userError : null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
