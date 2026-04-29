import { useState, useEffect } from "react";
import { Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, startOfWeek, endOfDay, endOfWeek } from "date-fns";

interface TimeStats {
  todayMinutes: number;
  weekMinutes: number;
  departmentTodayMinutes: number;
  departmentWeekMinutes: number;
}

export function TimeTrackingWidget() {
  const { user, role, profile } = useAuth();
  const [stats, setStats] = useState<TimeStats>({
    todayMinutes: 0,
    weekMinutes: 0,
    departmentTodayMinutes: 0,
    departmentWeekMinutes: 0,
  });
  const [loading, setLoading] = useState(true);

  const isManager =
    role === "GeneralManager" ||
    role === "ExecutiveManager" ||
    role === "DepartmentHead" ||
    role === "Supervisor";

  useEffect(() => {
    if (user) {
      fetchTimeStats();
    }
  }, [user]);

  const fetchTimeStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 }).toISOString();

      // Fetch user's time entries for today
      const { data: todayData } = await supabase
        .from("time_entries")
        .select("duration_minutes")
        .eq("user_id", user.id)
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd)
        .not("duration_minutes", "is", null);

      // Fetch user's time entries for this week
      const { data: weekData } = await supabase
        .from("time_entries")
        .select("duration_minutes")
        .eq("user_id", user.id)
        .gte("start_time", weekStart)
        .lte("start_time", weekEnd)
        .not("duration_minutes", "is", null);

      const todayMinutes =
        todayData?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0;
      const weekMinutes =
        weekData?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0;

      let departmentTodayMinutes = 0;
      let departmentWeekMinutes = 0;

      // For managers, fetch department/all stats
      if (isManager) {
        // Get all time entries (RLS will filter based on role)
        const { data: deptTodayData } = await supabase
          .from("time_entries")
          .select("duration_minutes")
          .gte("start_time", todayStart)
          .lte("start_time", todayEnd)
          .not("duration_minutes", "is", null);

        const { data: deptWeekData } = await supabase
          .from("time_entries")
          .select("duration_minutes")
          .gte("start_time", weekStart)
          .lte("start_time", weekEnd)
          .not("duration_minutes", "is", null);

        departmentTodayMinutes =
          deptTodayData?.reduce(
            (sum, e) => sum + (e.duration_minutes || 0),
            0
          ) || 0;
        departmentWeekMinutes =
          deptWeekData?.reduce(
            (sum, e) => sum + (e.duration_minutes || 0),
            0
          ) || 0;
      }

      setStats({
        todayMinutes,
        weekMinutes,
        departmentTodayMinutes,
        departmentWeekMinutes,
      });
    } catch (error) {
      console.error("Error fetching time stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}س ${mins > 0 ? `${mins}د` : ""}`;
    }
    return `${mins}د`;
  };

  const formatHours = (minutes: number) => {
    return (minutes / 60).toFixed(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تتبع الوقت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          تتبع الوقت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">
              {formatTime(stats.todayMinutes)}
            </div>
            <div className="text-sm text-muted-foreground">اليوم</div>
          </div>
          <div className="p-4 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold">
              {formatHours(stats.weekMinutes)} ساعة
            </div>
            <div className="text-sm text-muted-foreground">هذا الأسبوع</div>
          </div>
        </div>

        {/* Department Stats for Managers */}
        {isManager && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              {role === "GeneralManager" || role === "ExecutiveManager"
                ? "إجمالي الفريق"
                : "القسم"}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-semibold">
                  {formatTime(stats.departmentTodayMinutes)}
                </div>
                <div className="text-xs text-muted-foreground">اليوم</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xl font-semibold">
                  {formatHours(stats.departmentWeekMinutes)} ساعة
                </div>
                <div className="text-xs text-muted-foreground">هذا الأسبوع</div>
              </div>
            </div>
          </div>
        )}

        {stats.todayMinutes === 0 && stats.weekMinutes === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            لم تسجل أي وقت بعد
          </p>
        )}
      </CardContent>
    </Card>
  );
}
