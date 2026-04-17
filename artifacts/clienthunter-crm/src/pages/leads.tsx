import { useState } from "react";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useListLeads, useDeleteLead, getListLeadsQueryKey, useCreateLead } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Search, Plus, MoreHorizontal, Eye, Edit, Trash, Globe, Linkedin, Mail, Phone, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  const { data: leads, isLoading } = useListLeads({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  }, { query: { queryKey: getListLeadsQueryKey({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  }) } });

  const deleteLead = useDeleteLead();
  const createLead = useCreateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    fullName: "",
    companyName: "",
    email: "",
    status: "New Lead",
    priority: "Medium"
  });

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await deleteLead.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        toast({ title: "Lead deleted" });
      } catch (err) {
        toast({ title: "Failed to delete lead", variant: "destructive" });
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({ data: newLead });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsCreateOpen(false);
      toast({ title: "Lead created successfully" });
      setNewLead({ fullName: "", companyName: "", email: "", status: "New Lead", priority: "Medium" });
    } catch (err) {
      toast({ title: "Failed to create lead", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1">Manage your contacts and prospects.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input required value={newLead.fullName} onChange={e => setNewLead({...newLead, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input required value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newLead.status} onValueChange={v => setNewLead({...newLead, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["New Lead", "Profile Checked", "Contacted", "Follow-up Sent", "Replied", "Meeting Scheduled", "Proposal Sent"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newLead.priority} onValueChange={v => setNewLead({...newLead, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["High", "Medium", "Low"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createLead.isPending}>
                    {createLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads, companies..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New Lead">New Lead</SelectItem>
                <SelectItem value="Profile Checked">Profile Checked</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Follow-up Sent">Follow-up Sent</SelectItem>
                <SelectItem value="Replied">Replied</SelectItem>
                <SelectItem value="Meeting Scheduled">Meeting Scheduled</SelectItem>
                <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 w-20 bg-muted rounded-full animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted rounded-full animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-12 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 w-8 bg-muted rounded ml-auto animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : leads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No leads found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                leads?.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50 group">
                    <TableCell>
                      <div className="font-medium">{lead.fullName}</div>
                      {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                    </TableCell>
                    <TableCell>{lead.companyName}</TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell><PriorityBadge priority={lead.priority} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {lead.linkedinUrl && (
                          <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {lead.websiteUrl && (
                          <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${lead.id}`} className="cursor-pointer flex items-center">
                              <Eye className="w-4 h-4 mr-2" /> View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-destructive focus:text-destructive">
                            <Trash className="w-4 h-4 mr-2" /> Delete lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
