import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListDeals, useCreateDeal, useUpdateDeal, useDeleteDeal, getListDealsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Plus, Edit, Trash, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

export default function Revenue() {
  const { data: deals, isLoading } = useListDeals({ query: { queryKey: getListDealsQueryKey() } });
  
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({ 
    clientName: "", 
    serviceSold: "", 
    amount: 0, 
    currency: "USD",
    dealDate: todayStr,
    paymentStatus: "Pending"
  });

  const totalRevenue = deals?.reduce((sum, deal) => sum + deal.amount, 0) || 0;

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ clientName: "", serviceSold: "", amount: 0, currency: "USD", dealDate: todayStr, paymentStatus: "Pending" });
    setIsOpen(true);
  };

  const handleOpenEdit = (deal: any) => {
    setEditingId(deal.id);
    setFormData({ 
      clientName: deal.clientName, 
      serviceSold: deal.serviceSold, 
      amount: deal.amount, 
      currency: deal.currency,
      dealDate: deal.dealDate.split('T')[0],
      paymentStatus: deal.paymentStatus
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        dealDate: new Date(formData.dealDate).toISOString()
      };

      if (editingId) {
        await updateDeal.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Deal updated" });
      } else {
        await createDeal.mutateAsync({ data: payload });
        toast({ title: "Deal logged" });
      }
      queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
      setIsOpen(false);
    } catch (err) {
      toast({ title: "Failed to save deal", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this deal record?")) {
      try {
        await deleteDeal.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
        toast({ title: "Deal deleted" });
      } catch (err) {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
            <p className="text-muted-foreground mt-1">Track your won deals and income.</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Log Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Deal" : "Log Won Deal"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Service Sold</Label>
                  <Input required value={formData.serviceSold} onChange={e => setFormData({...formData, serviceSold: e.target.value})} placeholder="e.g. Landing Page Design" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" required min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <select className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" required value={formData.dealDate} onChange={e => setFormData({...formData, dealDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <select className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDeal.isPending || updateDeal.isPending}>Save Deal</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Total Pipeline Revenue</p>
              {isLoading ? (
                <Skeleton className="h-10 w-48" />
              ) : (
                <div className="text-4xl font-black tracking-tight text-foreground">
                  ${totalRevenue.toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : deals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No deals logged yet. Start closing!
                  </TableCell>
                </TableRow>
              ) : (
                deals?.map((deal) => (
                  <TableRow key={deal.id} className="hover:bg-muted/50 group">
                    <TableCell className="font-medium">{deal.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{deal.serviceSold}</TableCell>
                    <TableCell>{format(parseISO(deal.dealDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        deal.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30' :
                        deal.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800'
                      }>
                        {deal.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {deal.currency === 'USD' ? '$' : deal.currency === 'EUR' ? '€' : '£'}
                      {deal.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(deal)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(deal.id)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
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
