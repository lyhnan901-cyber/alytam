import { useState, useEffect } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EmployeeStat {
  id: string;
  full_name: string;
  completed_count: number;
}

export function TopEmployees() {
  const [employees, setEmployees] = useState<EmployeeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, isGeneralManager } = useAuth();

  // Only show for GM and ExecutiveManager
  const canView = isGeneralManager || role === "ExecutiveManager";

  useEffect(() => {
    const fetchData = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      try {
        // Get completed/approved tasks
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("assignee_id")
          .in("status", ["Completed", "Approved"])
          .not("assignee_id", "is", null);

        if (tasksError) throw tasksError;

        // Count by assignee
        const counts: Record<string, number> = {};
        (tasks || []).forEach((task) => {
          const id = task.assignee_id as string;
          counts[id] = (counts[id] || 0) + 1;
        });

        // Get top 5
        const topIds = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id);

        if (topIds.length === 0) {
          setEmployees([]);
          setLoading(false);
          return;
        }

        // Fetch profile names
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", topIds);

        if (profilesError) throw profilesError;

        const result = topIds.map((id) => ({
          id,
          full_name: profiles?.find((p) => p.id === id)?.full_name || "غير معروف",
          completed_count: counts[id],
        }));

        setEmployees(result);
      } catch (error) {
        console.error("Error fetching top employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [canView]);

  if (!canView) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border p-4 h-[300px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const getIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-semibold mb-4">أعلى 5 موظفين إنجازاً</h3>
      {employees.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          لا توجد بيانات بعد
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp, index) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                {getIcon(index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.completed_count} مهمة مكتملة
                </p>
              </div>
              <div className="text-lg font-bold text-primary">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
