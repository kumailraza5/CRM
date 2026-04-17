import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListLeads, useUpdateLead, getListLeadsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, DollarSign, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  "New Lead", 
  "Contacted", 
  "Replied", 
  "Meeting Scheduled", 
  "Proposal Sent"
];

export default function Pipeline() {
  const { data: leads, isLoading } = useListLeads({
    status: STAGES.join(","), // Approximate fetch all active
  }, { query: { queryKey: ["/api/leads", "pipeline"] } }); // Custom key for pipeline
  
  const updateLead = useUpdateLead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("leadId", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (!leadId) return;

    const lead = leads?.find(l => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      // Optimistic update
      queryClient.setQueryData(["/api/leads", "pipeline"], (old: any) => {
        if (!old) return old;
        return old.map((l: any) => l.id === leadId ? { ...l, status: newStatus } : l);
      });

      try {
        await updateLead.mutateAsync({ id: leadId, data: { status: newStatus } });
        toast({ title: `Moved to ${newStatus}` });
      } catch (err) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", "pipeline"] });
        toast({ title: "Failed to move lead", variant: "destructive" });
      }
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Drag and drop leads to update their status.</p>
        </div>

        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageLeads = leads?.filter(l => l.status === stage) || [];
            
            return (
              <div 
                key={stage}
                className="flex-shrink-0 w-80 bg-muted/40 rounded-xl border flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="p-3 border-b bg-muted/50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-semibold text-sm">{stage}</h3>
                  <Badge variant="secondary" className="rounded-full bg-background">{stageLeads.length}</Badge>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))
                  ) : stageLeads.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg border-border bg-background/50">
                      Empty
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="bg-card p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex gap-2 items-start mb-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:text-primary hover:underline truncate block">
                              {lead.fullName}
                            </Link>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                              <Building className="w-3 h-3 shrink-0" /> {lead.companyName}
                            </p>
                          </div>
                        </div>
                        {lead.estimatedBudget && (
                          <div className="flex justify-end">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <DollarSign className="w-3 h-3 mr-0.5" />
                              {lead.estimatedBudget.toLocaleString()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
