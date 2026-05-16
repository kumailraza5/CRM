import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  MessageSquare, 
  CalendarClock, 
  Clock, 
  CheckCircle2,
  Phone,
  Mail,
  Briefcase,
  FileText,
  Loader2
} from "lucide-react";
import { FollowupScheduler } from "./followup-scheduler";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "../../lib/api";

interface Activity {
  id: number;
  type: string;
  content: string;
  createdAt: string;
}

interface Followup {
  id: number;
  type: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  scheduledFor: string;
  reminderAt?: string;
  completedAt?: string;
  notes?: string;
}

interface EnhancedActivityTimelineProps {
  leadId: number;
  leadName: string;
}

export function EnhancedActivityTimeline({ leadId, leadName }: EnhancedActivityTimelineProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [scheduleFollowup, setScheduleFollowup] = useState(false);
  const [followupTitle, setFollowupTitle] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [followupTime, setFollowupTime] = useState("09:00");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activities, isLoading: loadingActivities } = useQuery<Activity[]>({
    queryKey: ["/api/leads", leadId, "notes"],
    queryFn: async () => {
      const response = await authFetch(`/api/leads/${leadId}/notes`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    }
  });

  const { data: followups, isLoading: loadingFollowups } = useQuery<Followup[]>({
    queryKey: ["/api/leads", leadId, "followups"],
    queryFn: async () => {
      const response = await authFetch(`/api/leads/${leadId}/followups`);
      if (!response.ok) throw new Error("Failed to fetch follow-ups");
      return response.json();
    }
  });

  const createNote = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      const response = await authFetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "notes"] });
      toast({ title: "Activity logged" });
    },
    onError: () => {
      toast({ title: "Failed to log activity", variant: "destructive" });
    },
  });

  const completeFollowup = useMutation({
    mutationFn: async (followupId: number) => {
      const response = await authFetch(`/api/followups/${followupId}/complete`, {
        method: "POST",
        body: JSON.stringify({ notes: "Completed from activity timeline" }),
      });
      if (!response.ok) throw new Error("Failed to complete follow-up");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followups"] });
      toast({ title: "Follow-up completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete follow-up", variant: "destructive" });
    },
  });

  const handleAddActivity = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await createNote.mutateAsync({ type: noteType, content: newNoteContent });
      
      // If follow-up scheduling is enabled, create the follow-up
      if (scheduleFollowup && followupTitle && followupDate) {
        const scheduledDateTime = new Date(`${followupDate}T${followupTime}`);
        const response = await authFetch(`/api/leads/${leadId}/followups`, {
          method: "POST",
          body: JSON.stringify({
            type: noteType === "messaged" ? "email" : noteType === "meeting" ? "meeting" : "check_in",
            title: followupTitle,
            description: `Follow-up for: ${newNoteContent}`,
            priority: "medium",
            scheduledFor: scheduledDateTime.toISOString(),
            reminderAt: new Date(scheduledDateTime.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour before
          }),
        });

        if (!response.ok) {
          toast({ title: "Activity logged but follow-up failed", variant: "destructive" });
        } else {
          toast({ title: "Activity and follow-up scheduled" });
          queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "followups"] });
        }
      }

      setNewNoteContent("");
      setScheduleFollowup(false);
      setFollowupTitle("");
      setFollowupDate("");
      setFollowupTime("09:00");
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "added": return <Plus className="w-4 h-4" />;
      case "messaged": return <Mail className="w-4 h-4 text-blue-500" />;
      case "replied": return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case "meeting": return <CalendarClock className="w-4 h-4 text-primary" />;
      case "call": return <Phone className="w-4 h-4 text-green-500" />;
      case "proposal": return <FileText className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getFollowupIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="w-4 h-4 text-green-500" />;
      case "email": return <Mail className="w-4 h-4 text-blue-500" />;
      case "linkedin_message": return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case "meeting": return <CalendarClock className="w-4 h-4 text-primary" />;
      case "proposal": return <FileText className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
      case "high": return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20";
      case "medium": return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
      default: return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20";
    }
  };

  // Combine and sort activities and follow-ups
  const allItems = [
    ...(activities || []).map(a => ({ ...a, itemType: 'activity' as const })),
    ...(followups || []).map(f => ({ ...f, itemType: 'followup' as const }))
  ].sort((a, b) => {
    const dateA = a.itemType === 'activity' ? new Date(a.createdAt) : new Date(a.scheduledFor);
    const dateB = b.itemType === 'activity' ? new Date(b.createdAt) : new Date(b.scheduledFor);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Activity & Follow-up Timeline</span>
          <FollowupScheduler 
            leadId={leadId} 
            leadName={leadName}
            trigger={
              <Button variant="outline" size="sm">
                <CalendarClock className="w-4 h-4 mr-2" />
                Quick Schedule
              </Button>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Activity Input */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <Textarea 
            placeholder="Log an activity or add a note..." 
            value={newNoteContent}
            onChange={e => setNewNoteContent(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Activity Type</Label>
              <select 
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                value={noteType}
                onChange={e => setNoteType(e.target.value)}
              >
                <option value="general">Note</option>
                <option value="messaged">Message</option>
                <option value="replied">Reply</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="proposal">Proposal</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="schedule-followup"
                checked={scheduleFollowup}
                onCheckedChange={setScheduleFollowup}
              />
              <Label htmlFor="schedule-followup" className="text-sm">
                Schedule follow-up
              </Label>
            </div>

            {scheduleFollowup && (
              <>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Follow-up Title</Label>
                  <input
                    type="text"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    placeholder="Follow-up title"
                    value={followupTitle}
                    onChange={e => setFollowupTitle(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Date</Label>
                  <input
                    type="date"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    value={followupDate}
                    onChange={e => setFollowupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Time</Label>
                  <input
                    type="time"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    value={followupTime}
                    onChange={e => setFollowupTime(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button 
              onClick={handleAddActivity} 
              disabled={!newNoteContent.trim() || createNote.isPending || (scheduleFollowup && (!followupTitle || !followupDate))}
              className="ml-auto"
            >
              {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>

        {/* Combined Timeline */}
        <div className="space-y-6 mt-6">
          {loadingActivities || loadingFollowups ? (
            <Skeleton className="h-20 w-full" />
          ) : allItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No activity or follow-ups scheduled yet.</p>
          ) : (
            allItems.map((item, i) => (
              <div key={`${item.itemType}-${item.id}`} className="flex gap-4 relative">
                {i !== allItems.length - 1 && (
                  <div className="absolute top-10 bottom-[-24px] left-5 w-px bg-border z-0"></div>
                )}
                
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 z-10 border border-background">
                  {item.itemType === 'activity' ? (
                    getActivityIcon(item.type)
                  ) : (
                    getFollowupIcon(item.type)
                  )}
                </div>
                
                <div className={`flex-1 p-4 rounded-xl border ${
                  item.itemType === 'followup' 
                    ? getPriorityColor(item.priority) 
                    : 'bg-muted/30'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-semibold capitalize">
                        {item.itemType === 'activity' ? item.type : `${item.type} - ${item.title}`}
                      </span>
                      {item.itemType === 'followup' && (
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.itemType === 'activity' 
                        ? formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })
                        : `Due ${format(parseISO(item.scheduledFor), "MMM d, h:mm a")}`
                      }
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {item.itemType === 'activity' ? item.content : item.description}
                  </p>
                  
                  {item.itemType === 'followup' && item.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => completeFollowup.mutate(item.id)}
                        disabled={completeFollowup.isPending}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                      <FollowupScheduler 
                        leadId={leadId} 
                        leadName={leadName}
                        trigger={
                          <Button size="sm" variant="ghost">
                            Reschedule
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
