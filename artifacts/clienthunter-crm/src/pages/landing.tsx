import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Crosshair, ArrowRight, Target, Zap, BarChart3, Users, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary selection:text-white">
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-1.5 rounded-lg">
            <Crosshair className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">ClientHunter</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Log in
          </Link>
          <Button asChild>
            <Link href="/register">Start Hunting</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <span className="flex w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            The command center for solo agencies
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter max-w-4xl leading-tight mb-6"
          >
            Turn LinkedIn connections into <span className="text-primary">paying clients</span>.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mb-10"
          >
            Stop losing leads in spreadsheets. ClientHunter is a sharp, fast CRM designed specifically for freelance developers and designers who hunt on LinkedIn.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="h-12 px-8 text-base group" asChild>
              <Link href="/register">
                Start Hunting for Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/login">View Demo</Link>
            </Button>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 bg-muted/50 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Built for the modern hunt</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Every pixel earns its place. No bloat, no confusing setups. Just the tools you need to close deals.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Laser-focused Pipeline",
                  description: "Drag and drop leads through stages. Always know who to contact next."
                },
                {
                  icon: Zap,
                  title: "AI Lead Scoring",
                  description: "Automatically prioritize leads based on profile data and interaction history."
                },
                {
                  icon: BarChart3,
                  title: "Actionable Analytics",
                  description: "Track your conversion rates and revenue growth without complex reports."
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-background p-8 rounded-2xl border shadow-sm"
                >
                  <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight">ClientHunter</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ClientHunter. The CRM for solo agencies.
          </p>
        </div>
      </footer>
    </div>
  );
}
