import { useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Star } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardAISummary() {
  const { data: leads, isLoading } = useListLeads({
    priority: "High",
  });

  // Take top 3 high priority leads
  const priorityLeads = leads?.slice(0, 3) || [];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Priority Leads
        </CardTitle>
        <CardDescription>Top leads recommended for immediate action</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : priorityLeads.length > 0 ? (
          <div className="space-y-3">
            {priorityLeads.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="group p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{lead.fullName}</h4>
                    <p className="text-xs text-muted-foreground">{lead.companyName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      High Priority
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed rounded-lg bg-background/50">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">No high-priority leads found</p>
          </div>
        )}
        <Link href="/leads?priority=High">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-primary hover:text-primary hover:bg-primary/10">
            View all priority leads
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
