import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
 import { CalendarCheck, Clock, ArrowLeft, Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TodayTask {
  id: string;
  task_number: number;
  title: string;
  status: string;
  priority: string;
   request_source?: string;
   created_at: string;
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  NotStarted: "لم يبدأ",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  PendingDeptHeadReview: "بانتظار المراجعة",
  PendingSupervisorReview: "بانتظار المشرف",
  PendingExecutiveReview: "بانتظار التنفيذي",
  PendingGMApproval: "بانتظار الموافقة",
  Approved: "معتمد",
  NeedRevision: "يحتاج تعديل",
  Rejected: "مرفوض",
};

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

export function TodayTasks() {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        
         // جلب المهام المستحقة اليوم أو المنشأة اليوم
         let baseQuery = supabase
          .from("tasks")
           .select(`
             id, 
             task_number, 
             title, 
             status, 
             priority,
             created_at,
             requests!inner(request_source)
           `)
          .not("status", "in", '("Completed","Approved","Rejected")');

        // Role-based filtering
        if (role === "Employee" && profile?.id) {
           baseQuery = baseQuery.eq("assignee_id", profile.id);
        } else if (role === "DepartmentHead" && profile?.department_id) {
           baseQuery = baseQuery.eq("department_id", profile.department_id);
        }

         // جلب المهام المستحقة اليوم
         const { data: dueTodayData, error: error1 } = await baseQuery
           .eq("due_date", today)
           .order("priority", { ascending: true })
           .limit(5);

         if (error1) throw error1;
         
         // جلب المهام المنشأة اليوم (بدون تاريخ استحقاق أو تاريخ استحقاق مستقبلي)
         let createdTodayQuery = supabase
           .from("tasks")
           .select(`
             id, 
             task_number, 
             title, 
             status, 
             priority,
             created_at,
             requests!inner(request_source)
           `)
           .gte("created_at", `${today}T00:00:00`)
           .lt("created_at", `${today}T23:59:59`)
           .not("status", "in", '("Completed","Approved","Rejected")')
           .or(`due_date.is.null,due_date.neq.${today}`);
         
         if (role === "Employee" && profile?.id) {
           createdTodayQuery = createdTodayQuery.eq("assignee_id", profile.id);
         } else if (role === "DepartmentHead" && profile?.department_id) {
           createdTodayQuery = createdTodayQuery.eq("department_id", profile.department_id);
         }
         
         const { data: createdTodayData, error: error2 } = await createdTodayQuery
           .order("priority", { ascending: true })
           .limit(5);
         
         if (error2) throw error2;
         
         // دمج النتائج وإزالة التكرارات
         const allTasks = [...(dueTodayData || []), ...(createdTodayData || [])];
         const uniqueTasks = allTasks.filter((task, index, self) => 
           index === self.findIndex(t => t.id === task.id)
         );
         
         // ترتيب حسب الأولوية وتحديد العدد
         const sortedTasks = uniqueTasks.sort((a, b) => {
           const priorityOrder = { High: 1, Medium: 2, Low: 3 };
           return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                  (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
         }).slice(0, 5);
         
         // تحويل البيانات للصيغة المطلوبة
         const formattedTasks = sortedTasks.map(task => ({
           id: task.id,
           task_number: task.task_number,
           title: task.title,
           status: task.status,
           priority: task.priority,
           created_at: task.created_at,
           request_source: (task.requests as any)?.request_source,
         }));
         
         setTasks(formattedTasks as TodayTask[]);
      } catch (error) {
        console.error("Error fetching today tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (profile) fetchData();
  }, [profile, role]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border p-4 h-[300px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">مهام اليوم</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => navigate("/tasks/calendar")}
        >
          عرض التقويم
          <ArrowLeft className="w-3 h-3" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground text-sm">لا توجد مهام مستحقة اليوم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    TSK-{String(task.task_number).padStart(3, "0")}
                  </span>
                   {task.request_source === "internal" && (
                     <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-accent">
                       <Building2 className="w-3 h-3 ml-1" />
                       داخلي
                     </Badge>
                   )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      task.priority === "High" && "priority-high",
                      task.priority === "Medium" && "priority-medium",
                      task.priority === "Low" && "priority-low"
                    )}
                  >
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
                <p className="font-medium text-sm truncate">{task.title}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {statusLabels[task.status] || task.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
