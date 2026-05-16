import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check, X, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  isRead: boolean;
  leadId?: number;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

interface NotificationCounts {
  unread: number;
  urgent: number;
  overdueFollowups: number;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: counts } = useQuery<NotificationCounts>({
    queryKey: ["/api/notifications/counts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { unreadOnly: true }],
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : 30000, // More frequent when open
  });

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
    },
    onError: () => {
      toast({ title: "Failed to mark notification as read", variant: "destructive" });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
      toast({ title: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
    },
    onError: () => {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    },
  });

  const getIcon = (type: string, priority: string) => {
    if (type === "followup_overdue" || priority === "urgent") {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (type === "followup_due") {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
    if (type === "data_enrichment_needed") {
      return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    }
    return <Bell className="w-4 h-4 text-muted-foreground" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      // Navigate to action URL
      window.location.href = notification.actionUrl;
    }
    markAsRead.mutate(notification.id);
  };

  const unreadCount = counts?.unread || 0;
  const hasUrgent = (counts?.urgent ?? 0) > 0 || (counts?.overdueFollowups ?? 0) > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {hasUrgent ? (
            <BellRing className="w-5 h-5 text-red-500 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading notifications...
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div>No new notifications</div>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  {getIcon(notification.type, notification.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {notification.title}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getPriorityColor(notification.priority)}`}
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                      </span>
                      {notification.actionText && (
                        <span className="text-xs text-primary font-medium">
                          {notification.actionText}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification.mutate(notification.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-sm text-muted-foreground"
              onClick={() => window.location.href = "/notifications"}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
