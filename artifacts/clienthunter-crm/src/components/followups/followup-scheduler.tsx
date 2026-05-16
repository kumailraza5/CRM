import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../../lib/api";

interface FollowupSchedulerProps {
  leadId: number;
  leadName: string;
  trigger?: React.ReactNode;
}

export function FollowupScheduler({ leadId, leadName, trigger }: FollowupSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "email",
    title: "",
    description: "",
    priority: "medium",
    scheduledFor: "",
    scheduledTime: "09:00",
    reminderHours: 1,
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.scheduledFor) {
      toast({ title: "Title and date are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);
      const reminderDateTime = new Date(scheduledDateTime.getTime() - formData.reminderHours * 60 * 60 * 1000);

      const response = await authFetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          scheduledFor: scheduledDateTime.toISOString(),
          reminderAt: reminderDateTime.toISOString(),
          notes: formData.notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to schedule follow-up");

      toast({ title: "Follow-up scheduled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/followups"] });
      
      setIsOpen(false);
      setFormData({
        type: "email",
        title: "",
        description: "",
        priority: "medium",
        scheduledFor: "",
        scheduledTime: "09:00",
        reminderHours: 1,
        notes: "",
      });
    } catch (error) {
      toast({ title: "Failed to schedule follow-up", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultTitle = (type: string) => {
    const titles = {
      call: "Follow-up Call",
      email: "Follow-up Email",
      linkedin_message: "LinkedIn Message",
      meeting: "Meeting",
      proposal: "Send Proposal",
      demo: "Product Demo",
      check_in: "Check-in",
      custom: "Custom Follow-up",
    };
    return titles[type as keyof typeof titles] || "Follow-up";
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      title: prev.title || getDefaultTitle(type),
    }));
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Calendar className="w-4 h-4 mr-2" />
      Schedule Follow-up
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow-up for {leadName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="proposal">Send Proposal</SelectItem>
                <SelectItem value="demo">Product Demo</SelectItem>
                <SelectItem value="check_in">Check-in</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Follow-up title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What do you need to do?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select 
                value={formData.reminderHours.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reminderHours: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">At time</SelectItem>
                  <SelectItem value="1">1 hour before</SelectItem>
                  <SelectItem value="2">2 hours before</SelectItem>
                  <SelectItem value="24">1 day before</SelectItem>
                  <SelectItem value="48">2 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                required
                min={getMinDate()}
                value={formData.scheduledFor}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or context..."
              rows={2}
            />
          </div>

          {formData.priority === "urgent" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">
                Urgent follow-ups will trigger immediate notifications
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
