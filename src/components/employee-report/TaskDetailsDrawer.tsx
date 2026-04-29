import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo,
  Percent 
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type StatType = "total" | "completed" | "inProgress" | "overdue" | "completionRate";

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  department_id: string | null;
  departments?: { name: string } | null;
}

interface TaskDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  statType: StatType | null;
  tasks: TaskData[];
  title: string;
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  NotStarted: "لم يبدأ",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  PendingDeptHeadReview: "بانتظار رئيس القسم",
  PendingSupervisorReview: "بانتظار المشرف",
  PendingExecutiveReview: "بانتظار المدير التنفيذي",
  PendingGMApproval: "بانتظار المدير العام",
  Approved: "معتمد",
  NeedRevision: "يحتاج تعديل",
  Rejected: "مرفوض",
};

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

const statTypeConfig: Record<StatType, { label: string; icon: React.ElementType; color: string }> = {
  total: { label: "إجمالي المهام", icon: ListTodo, color: "text-primary" },
  completed: { label: "المهام المكتملة", icon: CheckCircle2, color: "text-success" },
  inProgress: { label: "قيد التنفيذ", icon: Clock, color: "text-warning" },
  overdue: { label: "المهام المتأخرة", icon: AlertTriangle, color: "text-destructive" },
  completionRate: { label: "نسبة الإنجاز", icon: Percent, color: "text-info" },
};

export function TaskDetailsDrawer({
  open,
  onClose,
  statType,
  tasks,
  title,
}: TaskDetailsDrawerProps) {
  const navigate = useNavigate();

  const filteredTasks = useMemo(() => {
    if (!statType) return [];
    
    const completedStatuses = ["Completed", "Approved"];
    const inProgressStatuses = ["InProgress"];
    const today = new Date();

    switch (statType) {
      case "total":
        return tasks;
      case "completed":
        return tasks.filter((t) => completedStatuses.includes(t.status));
      case "inProgress":
        return tasks.filter((t) => inProgressStatuses.includes(t.status));
      case "overdue":
        return tasks.filter((t) => {
          if (!t.due_date) return false;
          if (completedStatuses.includes(t.status)) return false;
          return new Date(t.due_date) < today;
        });
      case "completionRate":
        return tasks.filter((t) => completedStatuses.includes(t.status));
      default:
        return [];
    }
  }, [statType, tasks]);

  const config = statType ? statTypeConfig[statType] : null;
  const Icon = config?.icon;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {Icon && <Icon className={cn("w-5 h-5", config?.color)} />}
            {title}
          </SheetTitle>
          <SheetDescription>
            {filteredTasks.length} مهمة
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              لا توجد مهام مطابقة
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المهمة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الأولوية</TableHead>
                  <TableHead className="text-right">تاريخ التسليم</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">{task.title}</p>
                        {task.departments?.name && (
                          <p className="text-xs text-muted-foreground">
                            {task.departments.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          task.status === "Completed" && "status-completed",
                          task.status === "Approved" && "status-completed",
                          task.status === "InProgress" && "status-in-progress",
                          task.status.includes("Pending") && "status-pending"
                        )}
                      >
                        {statusLabels[task.status] || task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          task.priority === "High" && "priority-high",
                          task.priority === "Medium" && "priority-medium",
                          task.priority === "Low" && "priority-low"
                        )}
                      >
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {task.due_date
                        ? format(new Date(task.due_date), "d MMM yyyy", { locale: ar })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onClose();
                          navigate(`/tasks/${task.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
