import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { statusCategories, TaskStatusCategory } from "./TaskStatusFilter";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  task_number: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface FilteredTasksListProps {
  tasks: Task[];
  selectedCategories: TaskStatusCategory[];
}

const getStatusCategory = (status: string): TaskStatusCategory | null => {
  for (const [key, category] of Object.entries(statusCategories) as [TaskStatusCategory, typeof statusCategories.completed][]) {
    if (category.statuses.includes(status)) {
      return key;
    }
  }
  return null;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    New: "جديدة",
    NotStarted: "لم تبدأ",
    InProgress: "قيد التنفيذ",
    Completed: "مكتملة",
    PendingDeptHeadReview: "بانتظار رئيس القسم",
    PendingSupervisorReview: "بانتظار المشرف",
    PendingExecutiveReview: "بانتظار المدير التنفيذي",
    PendingGMApproval: "بانتظار المدير العام",
    Approved: "معتمدة",
    NeedRevision: "تحتاج مراجعة",
    Rejected: "مرفوضة",
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    High: "عالية",
    Medium: "متوسطة",
    Low: "منخفضة",
  };
  return labels[priority] || priority;
};

const getPriorityClass = (priority: string): string => {
  const classes: Record<string, string> = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low",
  };
  return classes[priority] || "";
};

export function FilteredTasksList({ tasks, selectedCategories }: FilteredTasksListProps) {
  const navigate = useNavigate();

  const filteredTasks = tasks.filter((task) => {
    const category = getStatusCategory(task.status);
    return category && selectedCategories.includes(category);
  });

  if (filteredTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">قائمة المهام</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">لا توجد مهام تطابق الفلتر المحدد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          قائمة المهام ({filteredTasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>المهمة</TableHead>
              <TableHead className="w-[150px]">الحالة</TableHead>
              <TableHead className="w-[100px]">الأولوية</TableHead>
              <TableHead className="w-[120px]">تاريخ الاستحقاق</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => {
              const category = getStatusCategory(task.status);
              const categoryInfo = category ? statusCategories[category] : null;

              return (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {task.task_number}
                  </TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("gap-1", categoryInfo?.bgColor)}
                    >
                      <span className={cn("w-2 h-2 rounded-full", categoryInfo?.color)} />
                      {getStatusLabel(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPriorityClass(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.due_date
                      ? format(new Date(task.due_date), "d MMM yyyy", { locale: ar })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
