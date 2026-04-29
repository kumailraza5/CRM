import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Crosshair, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

function getAppRedirectUrl(path: string) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${basePath}${path}`;
}

export default function VerifyEmail() {
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || "";
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAppRedirectUrl("/auth/callback"),
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Email Resent",
        description: "A new verification link has been sent to your email.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email");
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
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <br/>
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Click the link in the email to verify your account. Once verified, you will be redirected to the dashboard.
            </p>
            
            <Button 
              variant="outline" 
              className="w-full h-11" 
              onClick={handleResend}
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend verification email"
              )}
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to log in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
