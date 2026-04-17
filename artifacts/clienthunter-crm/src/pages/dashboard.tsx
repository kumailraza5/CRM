import { MainLayout } from "@/components/layout/main-layout";
import { 
  useGetDashboardSummary, 
  useGetDashboardPipeline, 
  useGetDashboardMonthly, 
  useListActivities 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Crosshair, TrendingUp, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { motion } from "framer-motion";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/ui/badges";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: loadingPipeline } = useGetDashboardPipeline();
  const { data: monthly, isLoading: loadingMonthly } = useGetDashboardMonthly();
  const { data: activities, isLoading: loadingActivities } = useListActivities({
    query: { queryKey: ["/api/activities"] } // Since useListActivities might not export a queryKey helper natively in some setups
  });

  const cards = [
    { title: "Total Leads", value: summary?.totalLeads, icon: Users, desc: "Active in system" },
    { title: "New Leads", value: summary?.newLeads, icon: Crosshair, desc: "Added this month" },
    { title: "Deals Won", value: summary?.dealsWon, icon: CheckCircle2, desc: "Total successful" },
    { title: "Revenue Closed", value: summary ? `$${summary.revenueClosed.toLocaleString()}` : undefined, icon: TrendingUp, desc: "Total revenue" },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your agency today.</p>
        </div>

        {/* Action Items Bar */}
        {(summary?.followupsDueToday || summary?.overdueFollowups || summary?.repliesReceived) ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {summary?.followupsDueToday > 0 && (
              <Link href="/followups">
                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl flex items-center justify-between hover:bg-primary/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Crosshair className="w-5 h-5" />
                    <span className="font-semibold">Follow-ups Due Today</span>
                  </div>
                  <span className="bg-primary text-white font-bold px-2 py-0.5 rounded-md text-sm">{summary.followupsDueToday}</span>
                </div>
              </Link>
            )}
            {summary?.overdueFollowups > 0 && (
              <Link href="/followups">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center justify-between hover:bg-destructive/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Overdue Follow-ups</span>
                  </div>
                  <span className="bg-destructive text-white font-bold px-2 py-0.5 rounded-md text-sm">{summary.overdueFollowups}</span>
                </div>
              </Link>
            )}
            {summary?.repliesReceived > 0 && (
              <Link href="/leads?status=Replied">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-xl flex items-center justify-between hover:bg-amber-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-semibold">New Replies</span>
                  </div>
                  <span className="bg-amber-500 text-white font-bold px-2 py-0.5 rounded-md text-sm">{summary.repliesReceived}</span>
                </div>
              </Link>
            )}
          </motion.div>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingSummary ? <Skeleton className="h-8 w-20" /> : card.value || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charts */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue closed over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {loadingMonthly ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tickMargin={10} />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`} 
                          tickLine={false} 
                          axisLine={false} 
                          fontSize={12} 
                          width={60}
                        />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [`$${value}`, "Revenue"]}
                        />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                          {(monthly || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Distribution</CardTitle>
                <CardDescription>Leads across all active stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {loadingPipeline ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipeline || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis type="category" dataKey="status" width={120} tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions on your leads</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[630px] pr-2">
              {loadingActivities ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities?.length ? (
                <div className="space-y-6">
                  {activities.map((activity, i) => (
                    <div key={activity.id} className="flex gap-3 relative">
                      {i !== activities.length - 1 && (
                        <div className="absolute top-8 bottom-[-24px] left-4 w-px bg-border z-0"></div>
                      )}
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 z-10 border border-background">
                        {activity.type === "added" ? <Users className="w-4 h-4" /> :
                         activity.type === "messaged" ? <MessageSquare className="w-4 h-4" /> :
                         activity.type === "replied" ? <MessageSquare className="w-4 h-4" /> :
                         activity.type === "meeting" ? <CheckCircle2 className="w-4 h-4" /> :
                         <Crosshair className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {activity.leadName && (
                            <Link href={`/leads/${activity.leadId}`} className="hover:underline hover:text-primary mr-1">
                              {activity.leadName}
                            </Link>
                          )}
                          <span className="font-normal text-muted-foreground">{activity.description}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
