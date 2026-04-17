import { MainLayout } from "@/components/layout/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetFollowupsToday, useGetFollowupsOverdue, useGetFollowupsUpcoming, useCompleteFollowup } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, CalendarClock, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Followups() {
  const { data: today, isLoading: loadingToday } = useGetFollowupsToday();
  const { data: overdue, isLoading: loadingOverdue } = useGetFollowupsOverdue();
  const { data: upcoming, isLoading: loadingUpcoming } = useGetFollowupsUpcoming();
  
  const completeFollowup = useCompleteFollowup();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleComplete = async (id: number) => {
    try {
      await completeFollowup.mutateAsync({ id, data: { rescheduleInDays: 7 } }); // Default push 1 week
      queryClient.invalidateQueries({ queryKey: ["/api/followups"] });
      toast({ title: "Follow-up completed", description: "Rescheduled for next week." });
    } catch (err) {
      toast({ title: "Failed to complete", variant: "destructive" });
    }
  };

  const renderList = (leads: any[] | undefined, loading: boolean, emptyMsg: string, variant: "today" | "overdue" | "upcoming") => {
    if (loading) {
      return (
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      );
    }

    if (!leads?.length) {
      return (
        <div className="text-center py-20 bg-card rounded-xl border mt-6">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">{emptyMsg}</h3>
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-6">
        {leads.map(lead => (
          <Card key={lead.id} className={`overflow-hidden border-l-4 ${variant === 'overdue' ? 'border-l-destructive' : variant === 'today' ? 'border-l-primary' : 'border-l-muted'}`}>
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-4">
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl ${variant === 'overdue' ? 'bg-destructive/10 text-destructive' : variant === 'today' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {variant === 'overdue' ? <AlertCircle className="w-6 h-6" /> : 
                     variant === 'today' ? <Clock className="w-6 h-6" /> : 
                     <CalendarClock className="w-6 h-6" />}
                  </div>
                  <div>
                    <Link href={`/leads/${lead.id}`} className="font-bold text-lg hover:underline hover:text-primary">
                      {lead.fullName}
                    </Link>
                    <p className="text-muted-foreground">{lead.companyName}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">{lead.status}</span>
                      {lead.nextFollowupDate && (
                        <span className="text-xs border px-2 py-1 rounded-md font-medium text-foreground">
                          Due: {format(parseISO(lead.nextFollowupDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                    <Link href={`/leads/${lead.id}`}>View</Link>
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-none" 
                    onClick={() => handleComplete(lead.id)}
                    disabled={completeFollowup.isPending}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Stay on top of your communication schedule.</p>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="today">
              Today {today?.length ? `(${today.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue {overdue?.length ? `(${overdue.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today">
            {renderList(today, loadingToday, "No follow-ups scheduled for today. You're all caught up!", "today")}
          </TabsContent>
          
          <TabsContent value="overdue">
            {renderList(overdue, loadingOverdue, "No overdue follow-ups. Great job!", "overdue")}
          </TabsContent>
          
          <TabsContent value="upcoming">
            {renderList(upcoming, loadingUpcoming, "No upcoming follow-ups scheduled.", "upcoming")}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
