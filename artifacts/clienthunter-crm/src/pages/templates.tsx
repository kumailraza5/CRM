import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, FileText, Plus, Trash, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Templates() {
  const { data: templates, isLoading } = useListTemplates({ query: { queryKey: getListTemplatesQueryKey() } });
  
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", category: "Email", subject: "", content: "" });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ title: "", category: "Email", subject: "", content: "" });
    setIsOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({ 
      title: template.title, 
      category: template.category, 
      subject: template.subject || "", 
      content: template.content 
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, data: formData });
        toast({ title: "Template updated" });
      } else {
        await createTemplate.mutateAsync({ data: formData });
        toast({ title: "Template created" });
      }
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      setIsOpen(false);
    } catch (err) {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this template?")) {
      try {
        await deleteTemplate.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({ title: "Template deleted" });
      } catch (err) {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground mt-1">Reusable outreach messages for faster hunting.</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Initial Outreach" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select 
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Email</option>
                      <option>LinkedIn</option>
                      <option>SMS</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject Line (Optional)</Label>
                  <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Quick question about [Company]" />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea 
                    required 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Hi [Name],&#10;&#10;I noticed..."
                  />
                  <p className="text-xs text-muted-foreground">Use placeholders like [Name] or [Company] to personalize later.</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>Save Template</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))
          ) : templates?.length === 0 ? (
            <div className="col-span-full text-center py-20 border border-dashed rounded-xl bg-card">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No templates yet</h3>
              <Button onClick={handleOpenCreate} variant="outline" className="mt-4">Create your first template</Button>
            </div>
          ) : (
            templates?.map(template => (
              <Card key={template.id} className="flex flex-col h-full group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{template.category}</span>
                  </div>
                  {template.subject && <p className="text-sm font-medium text-muted-foreground truncate">Subj: {template.subject}</p>}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap font-mono line-clamp-6 text-muted-foreground">
                    {template.content}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(template)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={() => copyToClipboard(template.content)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
