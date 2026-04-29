import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, eachWeekOfInterval, subWeeks, subMonths 
} from "date-fns";
import { ar } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";

import { PeriodSelector, PeriodType } from "@/components/my-report/PeriodSelector";
import { TaskStatusFilter, TaskStatusCategory, statusCategories } from "@/components/my-report/TaskStatusFilter";
import { TaskStatsCards } from "@/components/my-report/TaskStatsCards";
import { TaskDistributionChart } from "@/components/my-report/TaskDistributionChart";
import { TaskProgressChart } from "@/components/my-report/TaskProgressChart";
import { FilteredTasksList } from "@/components/my-report/FilteredTasksList";
import { OverdueTasksAlert } from "@/components/my-report/OverdueTasksAlert";
import { PerformanceComparisonChart } from "@/components/my-report/PerformanceComparisonChart";
import { ExportReportButton } from "@/components/my-report/ExportReportButton";

export default function MyReport() {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("today");
  const [customRange, setCustomRange] = useState<DateRange>();
  const [selectedCategories, setSelectedCategories] = useState<TaskStatusCategory[]>([
    "completed",
    "inProgress",
    "pending",
    "notStarted",
  ]);
  const [comparisonType, setComparisonType] = useState<"weeks" | "months">("weeks");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "custom":
        if (customRange?.from) {
          return {
            from: startOfDay(customRange.from),
            to: customRange.to ? endOfDay(customRange.to) : endOfDay(customRange.from),
          };
        }
        return { from: startOfDay(now), to: endOfDay(now) };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  }, [period, customRange]);

  // Fetch ALL user's tasks (for alerts and comparison)
  const { data: allTasks = [], isLoading: allTasksLoading } = useQuery({
    queryKey: ["all-my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assignee_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's tasks for current period
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["my-tasks", user?.id, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assignee_id", user.id)
        .or(`due_date.gte.${format(dateRange.from, "yyyy-MM-dd")},due_date.is.null`)
        .lte("created_at", dateRange.to.toISOString());

      if (error) throw error;
      
      // Filter tasks that fall within the date range
      return (data || []).filter(task => {
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          return dueDate >= dateRange.from && dueDate <= dateRange.to;
        }
        // For tasks without due date, check created_at
        const createdAt = new Date(task.created_at);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      });
    },
    enabled: !!user?.id,
  });

  // Fetch time entries for current period
  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ["my-time-entries", user?.id, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", dateRange.from.toISOString())
        .lte("start_time", dateRange.to.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch ALL time entries (for comparison)
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ["all-my-time-entries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const threeMonthsAgo = subMonths(new Date(), 3);
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", threeMonthsAgo.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = tasks.filter(t => 
      statusCategories.completed.statuses.includes(t.status)
    ).length;
    
    const inProgress = tasks.filter(t => 
      statusCategories.inProgress.statuses.includes(t.status)
    ).length;
    
    const pending = tasks.filter(t => 
      statusCategories.pending.statuses.includes(t.status)
    ).length;
    
    const notStarted = tasks.filter(t => 
      statusCategories.notStarted.statuses.includes(t.status)
    ).length;

    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      notStarted,
      remaining: total - completed,
      completionRate,
      totalMinutes,
    };
  }, [tasks, timeEntries]);

  // Distribution data for pie chart
  const distributionData = useMemo(() => ({
    completed: stats.completed,
    inProgress: stats.inProgress,
    pending: stats.pending,
    notStarted: stats.notStarted,
  }), [stats]);

  // Progress data for bar chart
  const progressData = useMemo(() => {
    if (period === "today") {
      return [{
        date: format(new Date(), "yyyy-MM-dd"),
        label: "اليوم",
        completed: stats.completed,
        remaining: stats.remaining,
        timeMinutes: stats.totalMinutes,
      }];
    }

    const intervals = period === "month" 
      ? eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { weekStartsOn: 0 })
      : eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return intervals.slice(0, 7).map((date, index) => {
      const isWeekly = period === "month";
      const intervalStart = isWeekly ? startOfWeek(date, { weekStartsOn: 0 }) : startOfDay(date);
      const intervalEnd = isWeekly ? endOfWeek(date, { weekStartsOn: 0 }) : endOfDay(date);

      const intervalTasks = tasks.filter(task => {
        const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
        return taskDate >= intervalStart && taskDate <= intervalEnd;
      });

      const completed = intervalTasks.filter(t => 
        statusCategories.completed.statuses.includes(t.status)
      ).length;

      return {
        date: format(date, "yyyy-MM-dd"),
        label: isWeekly 
          ? `الأسبوع ${index + 1}` 
          : format(date, "EEEE", { locale: ar }),
        completed,
        remaining: intervalTasks.length - completed,
        timeMinutes: 0,
      };
    });
  }, [tasks, period, dateRange, stats]);

  // Performance comparison data
  const comparisonData = useMemo(() => {
    const now = new Date();
    const periods = [];

    if (comparisonType === "weeks") {
      // Get last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        
        const weekTasks = allTasks.filter(task => {
          const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
          return taskDate >= weekStart && taskDate <= weekEnd;
        });

        const weekTimeEntries = allTimeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });

        const completed = weekTasks.filter(t => 
          statusCategories.completed.statuses.includes(t.status)
        ).length;

        periods.push({
          label: i === 0 ? "هذا الأسبوع" : i === 1 ? "الأسبوع الماضي" : `قبل ${i} أسابيع`,
          completed,
          total: weekTasks.length,
          completionRate: weekTasks.length > 0 ? Math.round((completed / weekTasks.length) * 100) : 0,
          timeMinutes: weekTimeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
        });
      }
    } else {
      // Get last 4 months
      for (let i = 3; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const monthTasks = allTasks.filter(task => {
          const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });

        const monthTimeEntries = allTimeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });

        const completed = monthTasks.filter(t => 
          statusCategories.completed.statuses.includes(t.status)
        ).length;

        periods.push({
          label: format(monthStart, "MMMM", { locale: ar }),
          completed,
          total: monthTasks.length,
          completionRate: monthTasks.length > 0 ? Math.round((completed / monthTasks.length) * 100) : 0,
          timeMinutes: monthTimeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
        });
      }
    }

    return periods;
  }, [allTasks, allTimeEntries, comparisonType]);

  // Toggle category filter
  const handleToggleCategory = (category: TaskStatusCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Select all categories
  const handleSelectAll = () => {
    if (selectedCategories.length === 4) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(["completed", "inProgress", "pending", "notStarted"]);
    }
  };

  const isLoading = tasksLoading || timeLoading || allTasksLoading;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />تقرير الأداء الشخصي
          </h1>
          <p className="page-subtitle">تتبع مهامك وإنجازاتك بشكل مفصل</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportReportButton tasks={tasks} stats={stats} dateRange={dateRange}
            userName={profile?.full_name || "مستخدم"} />
          <PeriodSelector period={period} onPeriodChange={setPeriod}
            customRange={customRange} onCustomRangeChange={setCustomRange} />
        </div>
      </div>

      {/* Overdue Tasks Alerts */}
      {!allTasksLoading && <OverdueTasksAlert tasks={allTasks} />}

      {/* Today's Summary Card */}
      <Card className="bg-gradient-to-l from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}
              </p>
              <p className="text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `لديك ${stats.total} مهام في هذه الفترة`
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <TaskStatsCards
          total={stats.total}
          completed={stats.completed}
          remaining={stats.remaining}
          completionRate={stats.completionRate}
          totalMinutes={stats.totalMinutes}
        />
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Card className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </Card>
          </>
        ) : (
          <>
            <TaskDistributionChart data={distributionData} />
            <TaskProgressChart data={progressData} />
          </>
        )}
      </div>

      {/* Performance Comparison Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">مقارنة الأداء عبر الزمن</CardTitle>
            <Tabs value={comparisonType} onValueChange={(v) => setComparisonType(v as "weeks" | "months")}>
              <TabsList className="h-8">
                <TabsTrigger value="weeks" className="text-xs px-3 h-7">أسبوعي</TabsTrigger>
                <TabsTrigger value="months" className="text-xs px-3 h-7">شهري</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <PerformanceComparisonChart data={comparisonData} comparisonType={comparisonType} />
          )}
        </CardContent>
      </Card>

      {/* Status Filter */}
      <TaskStatusFilter
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onSelectAll={handleSelectAll}
      />

      {/* Tasks List */}
      {isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </Card>
      ) : (
        <FilteredTasksList
          tasks={tasks}
          selectedCategories={selectedCategories}
        />
      )}
    </div>
  );
}
