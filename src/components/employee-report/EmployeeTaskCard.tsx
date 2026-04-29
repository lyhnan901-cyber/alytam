import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Eye, 
  XCircle,
  Timer,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TaskDetails {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  timeSpentMinutes: number;
}

interface EmployeeTaskCardProps {
  task: TaskDetails;
  onClick?: () => void;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}> = {
  Completed: { label: "مكتملة", icon: CheckCircle2, variant: "default", className: "bg-success text-success-foreground" },
  Approved: { label: "معتمدة", icon: CheckCircle2, variant: "default", className: "bg-success text-success-foreground" },
  InProgress: { label: "قيد التنفيذ", icon: Clock, variant: "secondary", className: "bg-warning text-warning-foreground" },
  New: { label: "جديدة", icon: Clock, variant: "outline", className: "bg-muted text-muted-foreground" },
  NotStarted: { label: "لم تبدأ", icon: Clock, variant: "outline", className: "bg-muted text-muted-foreground" },
  PendingDeptHeadReview: { label: "بانتظار مراجعة رئيس القسم", icon: Eye, variant: "secondary", className: "bg-info text-info-foreground" },
  PendingSupervisorReview: { label: "بانتظار مراجعة المشرف", icon: Eye, variant: "secondary", className: "bg-info text-info-foreground" },
  PendingExecutiveReview: { label: "بانتظار مراجعة المدير التنفيذي", icon: Eye, variant: "secondary", className: "bg-info text-info-foreground" },
  PendingGMApproval: { label: "بانتظار اعتماد المدير العام", icon: Eye, variant: "secondary", className: "bg-info text-info-foreground" },
  NeedRevision: { label: "تحتاج مراجعة", icon: AlertTriangle, variant: "destructive", className: "bg-destructive text-destructive-foreground" },
  Rejected: { label: "مرفوضة", icon: XCircle, variant: "destructive", className: "bg-destructive text-destructive-foreground" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  High: { label: "عالية", className: "bg-destructive/10 text-destructive border-destructive/30" },
  Medium: { label: "متوسطة", className: "bg-warning/10 text-warning border-warning/30" },
  Low: { label: "منخفضة", className: "bg-muted text-muted-foreground border-muted" },
};

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours}س ${mins}د`;
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (["Completed", "Approved", "Rejected"].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

export function EmployeeTaskCard({ task, onClick }: EmployeeTaskCardProps) {
  const status = statusConfig[task.status] || statusConfig.New;
  const priority = priorityConfig[task.priority] || priorityConfig.Medium;
  const StatusIcon = status.icon;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Card 
      className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={`w-4 h-4 shrink-0 ${overdue ? 'text-destructive' : ''}`} />
            <p className="font-medium text-sm truncate">{task.title}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.dueDate), "d MMM", { locale: ar })}
                {overdue && <AlertTriangle className="w-3 h-3" />}
              </span>
            )}
            
            {task.timeSpentMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatTime(task.timeSpentMinutes)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-xs ${status.className}`}>
            {overdue ? "متأخرة" : status.label}
          </Badge>
          <Badge variant="outline" className={`text-xs ${priority.className}`}>
            {priority.label}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
