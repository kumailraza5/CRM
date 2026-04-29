import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!isMounted) return;

      if (!session) {
        setLocation("/login");
        return;
      }

      const currentUser = await getCurrentUser();
      queryClient.setQueryData(["/api/auth/user"], currentUser);
      setLocation("/dashboard");
    }

    handleCallback().catch((error) => {
      console.error("Auth callback error:", error);
      if (isMounted) {
        setLocation("/login");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [queryClient, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Verifying authentication...</p>
      </div>
    </div>
  );
}
