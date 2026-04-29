import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusConfig: Record<string, { label: string; color: string }> = {
  New: { label: "جديد", color: "#3b82f6" },
  NotStarted: { label: "لم يبدأ", color: "#94a3b8" },
  InProgress: { label: "قيد التنفيذ", color: "#f59e0b" },
  Completed: { label: "مكتمل", color: "#22c55e" },
  PendingDeptHeadReview: { label: "بانتظار رئيس القسم", color: "#a855f7" },
  PendingSupervisorReview: { label: "بانتظار المشرف", color: "#6366f1" },
  PendingExecutiveReview: { label: "بانتظار التنفيذي", color: "#06b6d4" },
  PendingGMApproval: { label: "بانتظار المدير العام", color: "#ec4899" },
  Approved: { label: "معتمد", color: "#16a34a" },
  NeedRevision: { label: "يحتاج تعديل", color: "#f97316" },
  Rejected: { label: "مرفوض", color: "#ef4444" },
};

interface StatusData {
  name: string;
  value: number;
  label: string;
  color: string;
}

export function TasksByStatus() {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, role } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase.from("tasks").select("status");

        // Role-based filtering
        if (role === "Employee" && profile?.id) {
          query = query.eq("assignee_id", profile.id);
        } else if (role === "DepartmentHead" && profile?.department_id) {
          query = query.eq("department_id", profile.department_id);
        }

        const { data: tasks, error } = await query;
        if (error) throw error;

        // Count by status
        const statusCounts: Record<string, number> = {};
        (tasks || []).forEach((task) => {
          const status = task.status as string;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Convert to chart data
        const chartData = Object.entries(statusCounts)
          .map(([status, count]) => ({
            name: status,
            value: count,
            label: statusConfig[status]?.label || status,
            color: statusConfig[status]?.color || "#6b7280",
          }))
          .filter((d) => d.value > 0);

        setData(chartData);
      } catch (error) {
        console.error("Error fetching status data:", error);
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

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-4 h-[300px] flex items-center justify-center text-muted-foreground">
        لا توجد مهام لعرضها
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-semibold mb-4">توزيع المهام حسب الحالة</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const item = data.find((d) => d.name === name);
                return [value, item?.label || name];
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontFamily: "Cairo",
              }}
            />
            <Legend
              formatter={(value: string) => {
                const item = data.find((d) => d.name === value);
                return item?.label || value;
              }}
              wrapperStyle={{
                fontFamily: "Cairo",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
