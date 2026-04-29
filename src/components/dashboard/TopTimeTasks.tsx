import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatMinutesToHours } from "@/lib/csv-export";

interface TaskTimeEntry {
  task_id: string;
  task_title: string;
  total_minutes: number;
}

export function TopTimeTasks() {
  const [tasks, setTasks] = useState<TaskTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopTasks();
  }, []);

  const fetchTopTasks = async () => {
    try {
      // Get all time entries with task info
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          task_id,
          duration_minutes,
          tasks!inner(id, title)
        `)
        .not("duration_minutes", "is", null);

      if (error) throw error;

      // Aggregate by task
      const taskMap = new Map<string, { title: string; totalMinutes: number }>();
      
      (data || []).forEach((entry: any) => {
        const taskId = entry.task_id;
        const existing = taskMap.get(taskId);
        if (existing) {
          existing.totalMinutes += entry.duration_minutes || 0;
        } else {
          taskMap.set(taskId, {
            title: entry.tasks?.title || "مهمة غير معروفة",
            totalMinutes: entry.duration_minutes || 0,
          });
        }
      });

      // Convert to array and sort
      const sortedTasks = Array.from(taskMap.entries())
        .map(([id, data]) => ({
          task_id: id,
          task_title: data.title,
          total_minutes: data.totalMinutes,
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes)
        .slice(0, 5);

      setTasks(sortedTasks);
    } catch (error) {
      console.error("Error fetching top tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            أكثر المهام استهلاكًا للوقت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          أكثر المهام استهلاكًا للوقت
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            لا توجد بيانات وقت مسجلة
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.task_id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <Link
                    to={`/tasks/${task.task_id}`}
                    className="text-sm truncate hover:text-primary hover:underline flex items-center gap-1"
                  >
                    {task.task_title}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </div>
                <span className="text-sm font-medium text-primary whitespace-nowrap">
                  {formatMinutesToHours(task.total_minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
