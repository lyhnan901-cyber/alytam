import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, CalendarX, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  task_number: number;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
}

interface OverdueTasksAlertProps {
  tasks: Task[];
}

export function OverdueTasksAlert({ tasks }: OverdueTasksAlertProps) {
  const navigate = useNavigate();
  const now = new Date();

  // Separate overdue and upcoming tasks
  const { overdueTasks, upcomingTasks } = useMemo(() => {
    const incompleteTasks = tasks.filter(
      (t) => !["Completed", "Approved", "Rejected"].includes(t.status) && t.due_date
    );

    const overdue = incompleteTasks.filter((t) => {
      const dueDate = new Date(t.due_date!);
      return isBefore(dueDate, now);
    });

    const upcoming = incompleteTasks.filter((t) => {
      const dueDate = new Date(t.due_date!);
      const threeDaysFromNow = addDays(now, 3);
      return isAfter(dueDate, now) && isBefore(dueDate, threeDaysFromNow);
    });

    // Sort by due date
    overdue.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    upcoming.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    return { overdueTasks: overdue, upcomingTasks: upcoming };
  }, [tasks, now]);

  if (overdueTasks.length === 0 && upcomingTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">
            مهام متأخرة ({overdueTasks.length})
          </AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-muted-foreground">
              لديك مهام تجاوزت موعد التسليم، يرجى إكمالها في أقرب وقت
            </p>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map((task) => {
                const daysOverdue = differenceInDays(now, new Date(task.due_date!));
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 border"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarX className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-destructive">
                          متأخرة {daysOverdue === 0 ? "اليوم" : `${daysOverdue} يوم`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="gap-1"
                    >
                      عرض
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {overdueTasks.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{overdueTasks.length - 3} مهام أخرى متأخرة
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Tasks Alert */}
      {upcomingTasks.length > 0 && (
        <Alert className="border-warning/50 bg-warning/5">
          <Clock className="h-5 w-5 text-warning" />
          <AlertTitle className="text-lg font-bold text-warning">
            مهام قريبة من موعد التسليم ({upcomingTasks.length})
          </AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-muted-foreground">
              هذه المهام يجب إكمالها خلال الأيام الثلاثة القادمة
            </p>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map((task) => {
                const daysUntilDue = differenceInDays(new Date(task.due_date!), now);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 border"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-warning" />
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-warning">
                          {daysUntilDue === 0
                            ? "تستحق اليوم"
                            : daysUntilDue === 1
                            ? "تستحق غداً"
                            : `تستحق خلال ${daysUntilDue} أيام`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          task.priority === "High" && "priority-high",
                          task.priority === "Medium" && "priority-medium",
                          task.priority === "Low" && "priority-low"
                        )}
                      >
                        {task.priority === "High"
                          ? "عالية"
                          : task.priority === "Medium"
                          ? "متوسطة"
                          : "منخفضة"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="gap-1"
                      >
                        عرض
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{upcomingTasks.length - 3} مهام أخرى قريبة
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
