import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crosshair, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareResetSession() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const linkError = hashParams.get("error_description") || hashParams.get("error");

      if (linkError) {
        setError(linkError);
        setInvalidLink(true);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const code = queryParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session) {
        setError("Reset link is invalid or expired. Please request a new password reset link.");
        setInvalidLink(true);
      }
    }

    prepareResetSession()
      .catch((err: any) => {
        setError(err?.message || "Reset link is invalid or expired.");
        setInvalidLink(true);
      })
      .finally(() => {
        if (isMounted) {
          setCheckingLink(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast({
        title: "Password Reset",
        description: "Your password has been successfully reset. You can now log in.",
      });
      
      await supabase.auth.signOut(); // Force them to log in again with new password
      setLocation("/login");
    } catch (err: any) {
      setError(err.message || "Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-background rounded-2xl border shadow-xl overflow-hidden"
      >
        <div className="p-8 sm:p-10">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-primary text-white p-2 rounded-xl">
                <Crosshair className="w-6 h-6" />
              </div>
              <span className="font-bold text-2xl tracking-tight">ClientHunter</span>
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Set new password</h1>
            <p className="text-muted-foreground">
              {checkingLink ? "Checking your reset link..." : "Please enter your new password below."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="h-11"
              />
            </div>
            
            <Button type="submit" className="w-full h-11 text-base mt-6" disabled={loading || checkingLink || invalidLink}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
