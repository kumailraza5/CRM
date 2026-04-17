import { useState } from "react";
import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  useGetLead, 
  useUpdateLead, 
  useGetLeadScore, 
  useListNotes, 
  useCreateNote,
  getGetLeadQueryKey,
  getGetLeadScoreQueryKey,
  getListNotesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Globe, Linkedin, Mail, Phone, Building, MapPin, Briefcase, Plus, Loader2, Zap, Clock, CheckCircle2, MessageSquare, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteType, setNoteType] = useState("added");
  
  const updateLead = useUpdateLead();
  const createNote = useCreateNote();
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

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      await createNote.mutateAsync({
        leadId,
        data: { type: noteType, content: newNoteContent }
      });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(leadId) });
      setNewNoteContent("");
      toast({ title: "Note added" });
    } catch (err) {
      toast({ title: "Failed to add note", variant: "destructive" });
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

            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {lead.email ? <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a> : <span className="text-muted-foreground">No email</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {lead.phone || <span className="text-muted-foreground">No phone</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Linkedin className="w-4 h-4 text-muted-foreground" />
                      {lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn Profile</a> : <span className="text-muted-foreground">No LinkedIn</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      {lead.websiteUrl ? <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website</a> : <span className="text-muted-foreground">No website</span>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      {lead.companySize ? `${lead.companySize} employees` : <span className="text-muted-foreground">Unknown size</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      {lead.industry || <span className="text-muted-foreground">Unknown industry</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {lead.country || <span className="text-muted-foreground">Unknown location</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Add a note or log an activity..." 
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex flex-col gap-2 w-32 shrink-0">
                    <select 
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={noteType}
                      onChange={e => setNoteType(e.target.value)}
                    >
                      <option value="added">Note</option>
                      <option value="messaged">Message</option>
                      <option value="replied">Reply</option>
                      <option value="meeting">Meeting</option>
                    </select>
                    <Button className="w-full" onClick={handleAddNote} disabled={createNote.isPending || !newNoteContent.trim()}>
                      {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  {loadingNotes ? (
                    <Skeleton className="h-20 w-full" />
                  ) : notes?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No activity logged yet.</p>
                  ) : (
                    notes?.map((note, i) => (
                      <div key={note.id} className="flex gap-4 relative">
                        {i !== notes.length - 1 && (
                          <div className="absolute top-10 bottom-[-24px] left-5 w-px bg-border z-0"></div>
                        )}
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 z-10 border border-background">
                          {note.type === "added" ? <Plus className="w-4 h-4" /> :
                           note.type === "messaged" ? <MessageSquare className="w-4 h-4 text-blue-500" /> :
                           note.type === "replied" ? <MessageSquare className="w-4 h-4 text-amber-500" /> :
                           note.type === "meeting" ? <CalendarClock className="w-4 h-4 text-primary" /> :
                           <Clock className="w-4 h-4" />}
                        </div>
                        <div className="bg-muted/30 p-4 rounded-xl flex-1 border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold capitalize">{note.type}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(note.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
                    <Badge variant="outline" className="text-sm px-3 py-1 bg-background">{score.label}</Badge>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Recommendations</h4>
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
