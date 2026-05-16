import { useState } from "react";
import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  useGetLead, 
  useUpdateLead, 
  useGetLeadScore, 
  useListNotes, 
  getGetLeadQueryKey,
  getGetLeadScoreQueryKey,
  getListNotesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { ArrowLeft, Globe, Linkedin, Mail, Phone, Building, MapPin, Briefcase, Plus, Loader2, Zap, Clock, CheckCircle2, MessageSquare, CalendarClock, AlertTriangle, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EnhancedActivityTimeline } from "@/components/followups/enhanced-activity-timeline";
import { FollowupScheduler } from "@/components/followups/followup-scheduler";
import { LeadEditModal } from "@/components/leads/lead-edit-modal";
import { authFetch } from "@/lib/api";

export default function LeadDetail() {
  const params = useParams();
  const leadId = parseInt(params.id || "0");
  
  const { data: lead, isLoading: loadingLead } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) }
  });
  
  const { data: score, isLoading: loadingScore } = useGetLeadScore(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadScoreQueryKey(leadId) }
  });
  
  const { data: notes, isLoading: loadingNotes } = useListNotes(leadId, {
    query: { enabled: !!leadId, queryKey: getListNotesQueryKey(leadId) }
  });

  const [aiStrategy, setAiStrategy] = useState<any>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  const getAiStrategy = async () => {
    setLoadingStrategy(true);
    try {
      const response = await authFetch(`/api/leads/${leadId}/ai-suggestions`, {
        method: "POST"
      });
      if (!response.ok) throw new Error("Failed to get suggestions");
      const data = await response.json();
      setAiStrategy(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "followups"] });
      toast({ title: "AI Strategy generated and follow-up scheduled" });
    } catch (error) {
      toast({ title: "Failed to generate AI strategy", variant: "destructive" });
    } finally {
      setLoadingStrategy(false);
    }
  };

  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusChange = async (status: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      toast({ title: "Status updated" });
    } catch (err) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };


  if (loadingLead) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Lead not found</h2>
          <Button asChild className="mt-4">
            <Link href="/leads">Back to Leads</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/leads"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.fullName}</h1>
            <p className="text-muted-foreground mt-1">{lead.companyName}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions / Status pipeline */}
            <Card>
              <CardContent className="p-4 overflow-x-auto">
                <div className="flex items-center min-w-max gap-2">
                  {["New Lead", "Contacted", "Replied", "Meeting Scheduled", "Proposal Sent", "Won"].map((s, i, arr) => (
                    <div key={s} className="flex items-center">
                      <Button 
                        variant={lead.status === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusChange(s)}
                        className={`rounded-full ${lead.status === s ? '' : 'text-muted-foreground'}`}
                      >
                        {s}
                      </Button>
                      {i < arr.length - 1 && <div className="w-8 h-px bg-border mx-1"></div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile Info with Data Enrichment Prompts */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Profile Details</CardTitle>
                  <LeadEditModal 
                    lead={lead} 
                    trigger={
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Quick Edit
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">No email</span>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {lead.phone || (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">No phone</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Optional
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Linkedin className="w-4 h-4 text-muted-foreground" />
                      {lead.linkedinUrl ? (
                        <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">No LinkedIn</span>
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Required
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      {lead.websiteUrl ? (
                        <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website</a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">No website</span>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      {lead.companySize ? (
                        <span>{lead.companySize} employees</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Unknown size</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Optional
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      {lead.industry || (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Unknown industry</span>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {lead.country || (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Unknown location</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Optional
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      {lead.estimatedBudget ? (
                        <span className="font-medium">${lead.estimatedBudget}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">No budget</span>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Data Enrichment Actions */}
                {(!lead.email || !lead.linkedinUrl || !lead.websiteUrl || !lead.industry || !lead.estimatedBudget) && (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Complete Lead Profile</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                          Missing key information reduces lead quality score and limits outreach options.
                        </p>
                        <div className="flex gap-2">
                          <LeadEditModal 
                            lead={lead}
                            trigger={
                              <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white border-none">
                                <Plus className="w-4 h-4 mr-2" />
                                Complete Profile
                              </Button>
                            }
                          />
                          <FollowupScheduler 
                            leadId={leadId} 
                            leadName={lead.fullName}
                            trigger={
                              <Button size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Schedule Data Research
                              </Button>
                            }
                          />
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange("Profile Checked")}>
                            Mark as Checked
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Action Plan */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  AI Action Plan
                </CardTitle>
                <CardDescription>Get a tailored outreach strategy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiStrategy ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Recommended Action</h4>
                      <p className="text-sm font-semibold">{aiStrategy.recommendedAction}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Strategic Tips</h4>
                      <ul className="space-y-2">
                        {aiStrategy.suggestions.map((s: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-primary">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {aiStrategy.createdFollowup && (
                      <div className="text-xs text-muted-foreground p-2 bg-muted rounded border border-dashed">
                        Auto-scheduled follow-up for {format(parseISO(aiStrategy.createdFollowup.scheduledFor), "MMM d, h:mm a")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Let AI analyze this lead and suggest your next best move.
                    </p>
                    <Button 
                      onClick={getAiStrategy} 
                      disabled={loadingStrategy}
                      className="w-full"
                    >
                      {loadingStrategy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                      Generate Strategy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Activity Timeline */}
            <EnhancedActivityTimeline 
              leadId={leadId} 
              leadName={lead.fullName} 
            />
          </div>

          <div className="space-y-6">
            {/* AI Score */}
            <Card className="bg-gradient-to-b from-card to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  AI Lead Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingScore ? (
                  <Skeleton className="h-32 w-full" />
                ) : score ? (
                  <div className="space-y-6">
                    <div className="flex items-end gap-4">
                      <div className="text-5xl font-black text-primary">{score.score}</div>
                      <div className="text-lg font-medium text-muted-foreground pb-1">/ 100</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-sm px-3 py-1 bg-background">{score.label}</Badge>
                      <span className={`text-sm font-bold ${score.score >= 60 ? 'text-green-500' : score.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {score.label} Potential
                      </span>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold">Best Follow-up Time</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{score.bestFollowupTime}</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        AI Recommendations
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {score.tips.map((tip, i) => (
                          <li key={i} className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Score not available</p>
                )}
              </CardContent>
            </Card>

            {/* Lead Meta */}
            <Card>
              <CardHeader>
                <CardTitle>System Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added</span>
                  <span className="font-medium">{format(parseISO(lead.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span className="font-medium">
                    {lead.lastContactDate ? format(parseISO(lead.lastContactDate), "MMM d, yyyy") : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium">{lead.leadSource || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">
                    {lead.estimatedBudget ? `$${lead.estimatedBudget}` : "Unknown"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
