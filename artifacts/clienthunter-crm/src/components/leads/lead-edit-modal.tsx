import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateLead, getGetLeadQueryKey } from "@workspace/api-client-react";
import type { Lead } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface LeadEditModalProps {
  lead: Lead;
  trigger?: React.ReactNode;
}

export function LeadEditModal({ lead, trigger }: LeadEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: lead.fullName,
    companyName: lead.companyName,
    email: lead.email || "",
    phone: lead.phone || "",
    linkedinUrl: lead.linkedinUrl || "",
    websiteUrl: lead.websiteUrl || "",
    industry: lead.industry || "",
    companySize: lead.companySize || "",
    country: lead.country || "",
    estimatedBudget: lead.estimatedBudget || "",
    priority: lead.priority,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateLead = useUpdateLead();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: lead.fullName,
        companyName: lead.companyName,
        email: lead.email || "",
        phone: lead.phone || "",
        linkedinUrl: lead.linkedinUrl || "",
        websiteUrl: lead.websiteUrl || "",
        industry: lead.industry || "",
        companySize: lead.companySize || "",
        country: lead.country || "",
        estimatedBudget: lead.estimatedBudget || "",
        priority: lead.priority,
      });
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          ...formData,
          estimatedBudget: formData.estimatedBudget ? formData.estimatedBudget.toString() : null,
        } as any,
      });
      
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(lead.id) });
      toast({ title: "Lead updated successfully" });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Failed to update lead", variant: "destructive" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead: {lead.fullName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input 
                id="fullName" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input 
                id="companyName" 
                name="companyName" 
                value={formData.companyName} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="+1..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input 
                id="linkedinUrl" 
                name="linkedinUrl" 
                value={formData.linkedinUrl} 
                onChange={handleChange} 
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input 
                id="websiteUrl" 
                name="websiteUrl" 
                value={formData.websiteUrl} 
                onChange={handleChange} 
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input 
                id="industry" 
                name="industry" 
                value={formData.industry} 
                onChange={handleChange} 
                placeholder="Software, Real Estate..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size</Label>
              <Select 
                value={formData.companySize} 
                onValueChange={(v) => setFormData(p => ({ ...p, companySize: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input 
                id="country" 
                name="country" 
                value={formData.country} 
                onChange={handleChange} 
                placeholder="United States, UK..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedBudget">Estimated Budget ($)</Label>
              <Input 
                id="estimatedBudget" 
                name="estimatedBudget" 
                type="number" 
                value={formData.estimatedBudget} 
                onChange={handleChange} 
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v: any) => setFormData(p => ({ ...p, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateLead.isPending}>
              {updateLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
