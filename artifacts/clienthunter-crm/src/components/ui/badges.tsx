import { Badge } from "@/components/ui/badge";

type Status = "New Lead" | "Profile Checked" | "Contacted" | "Follow-up Sent" | "Replied" | "Meeting Scheduled" | "Proposal Sent" | "Won" | "Lost";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
  
  switch (status as Status) {
    case "New Lead":
      colorClass = "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300";
      break;
    case "Profile Checked":
      colorClass = "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300";
      break;
    case "Contacted":
      colorClass = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300";
      break;
    case "Follow-up Sent":
      colorClass = "bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-300";
      break;
    case "Replied":
      colorClass = "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300";
      break;
    case "Meeting Scheduled":
      colorClass = "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300";
      break;
    case "Proposal Sent":
      colorClass = "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300";
      break;
    case "Won":
      colorClass = "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300";
      break;
    case "Lost":
      colorClass = "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300";
      break;
  }

  return (
    <Badge className={`font-medium border-0 shadow-none ${colorClass}`}>
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  let colorClass = "";
  
  switch (priority) {
    case "High":
      colorClass = "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
      break;
    case "Medium":
      colorClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400";
      break;
    case "Low":
      colorClass = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400";
      break;
    default:
      colorClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
  }

  return (
    <Badge variant="outline" className={`font-medium border-0 ${colorClass}`}>
      {priority}
    </Badge>
  );
}
