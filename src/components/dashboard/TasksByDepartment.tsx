import { useState, useEffect } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentStats {
  id: string;
  name: string;
  total: number;
  completed: number;
  inProgress: number;
}

export function TasksByDepartment() {
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartmentStats = async () => {
      try {
        // Fetch all departments
        const { data: depts } = await supabase
          .from("departments")
          .select("id, name");

        if (!depts) return;

        // Fetch tasks for each department
        const statsPromises = depts.map(async (dept) => {
          const { count: total } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id);

          const { count: completed } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .in("status", ["Completed", "Approved"]);

          const { count: inProgress } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("status", "InProgress");

          return {
            id: dept.id,
            name: dept.name,
            total: total || 0,
            completed: completed || 0,
            inProgress: inProgress || 0,
          };
        });

        const stats = await Promise.all(statsPromises);
        setDepartments(stats.filter((s) => s.total > 0));
      } catch (error) {
        console.error("Error fetching department stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentStats();
  }, []);

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          المهام حسب القسم
        </h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {departments.map((dept) => {
            const progressPercent =
              dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
            return (
              <div key={dept.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dept.name}</span>
                  <span className="text-muted-foreground">
                    {dept.completed}/{dept.total} مهمة
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    مكتملة: {dept.completed}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    قيد التنفيذ: {dept.inProgress}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
