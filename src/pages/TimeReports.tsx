import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Download,
  Filter,
  Loader2,
  CalendarDays,
  Users,
  Building2,
  CheckSquare,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, formatMinutesToHours } from "@/lib/csv-export";
import { exportFullReportPDF, exportTaskSummaryPDF, exportUserSummaryPDF, exportDeptSummaryPDF } from "@/lib/pdf-export";
import { TimeReportsCharts } from "@/components/time-tracking/TimeReportsCharts";
import { WeeklyGoalWidget } from "@/components/time-tracking/WeeklyGoalWidget";
import { TeamGoalsManagement } from "@/components/time-tracking/TeamGoalsManagement";
import { WeeklyPerformanceChart } from "@/components/time-tracking/WeeklyPerformanceChart";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string;
  duration_minutes: number;
  start_time: string;
  user_name: string;
  department_id: string | null;
  department_name: string | null;
  task_title: string;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  userId: string;
  departmentId: string;
  taskId: string;
}

interface User {
  id: string;
  full_name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

export default function TimeReports() {
  const { user, role } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    userId: "",
    departmentId: "",
    taskId: "",
  });

  const isManager = ["GeneralManager", "ExecutiveManager", "Supervisor", "DepartmentHead"].includes(role || "");

  useEffect(() => {
    Promise.all([fetchEntries(), fetchFiltersData(), fetchUserDepartment()]);
  }, []);

  const fetchUserDepartment = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", user.id)
      .single();
    setUserDepartmentId(data?.department_id || null);
  };

  const fetchFiltersData = async () => {
    const [usersRes, deptsRes, tasksRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("tasks").select("id, title").order("title"),
    ]);

    setUsers(usersRes.data || []);
    setDepartments(deptsRes.data || []);
    setTasks(tasksRes.data || []);
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          user_id,
          task_id,
          duration_minutes,
          start_time,
          profiles!inner(id, full_name, department_id, departments(id, name)),
          tasks!inner(id, title)
        `)
        .not("duration_minutes", "is", null)
        .order("start_time", { ascending: false });

      if (error) throw error;

      const mapped: TimeEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        task_id: entry.task_id,
        duration_minutes: entry.duration_minutes || 0,
        start_time: entry.start_time,
        user_name: entry.profiles?.full_name || "غير معروف",
        department_id: entry.profiles?.department_id,
        department_name: entry.profiles?.departments?.name || null,
        task_title: entry.tasks?.title || "غير معروف",
      }));

      setEntries(mapped);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.dateFrom) {
        const entryDate = new Date(entry.start_time).toISOString().split("T")[0];
        if (entryDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const entryDate = new Date(entry.start_time).toISOString().split("T")[0];
        if (entryDate > filters.dateTo) return false;
      }
      if (filters.userId && entry.user_id !== filters.userId) return false;
      if (filters.departmentId && entry.department_id !== filters.departmentId) return false;
      if (filters.taskId && entry.task_id !== filters.taskId) return false;
      return true;
    });
  }, [entries, filters]);

  // Aggregated data by task
  const taskSummary = useMemo(() => {
    const map = new Map<string, { title: string; users: Set<string>; minutes: number }>();
    filteredEntries.forEach((e) => {
      const existing = map.get(e.task_id);
      if (existing) {
        existing.users.add(e.user_id);
        existing.minutes += e.duration_minutes;
      } else {
        map.set(e.task_id, {
          title: e.task_title,
          users: new Set([e.user_id]),
          minutes: e.duration_minutes,
        });
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        task_id: id,
        task_title: data.title,
        user_count: data.users.size,
        total_minutes: data.minutes,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);
  }, [filteredEntries]);

  // Aggregated data by user
  const userSummary = useMemo(() => {
    const map = new Map<string, { name: string; tasks: Set<string>; minutes: number }>();
    filteredEntries.forEach((e) => {
      const existing = map.get(e.user_id);
      if (existing) {
        existing.tasks.add(e.task_id);
        existing.minutes += e.duration_minutes;
      } else {
        map.set(e.user_id, {
          name: e.user_name,
          tasks: new Set([e.task_id]),
          minutes: e.duration_minutes,
        });
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        user_id: id,
        user_name: data.name,
        task_count: data.tasks.size,
        total_minutes: data.minutes,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);
  }, [filteredEntries]);

  // Aggregated data by department
  const deptSummary = useMemo(() => {
    const map = new Map<string, { name: string; users: Set<string>; minutes: number }>();
    filteredEntries.forEach((e) => {
      if (!e.department_id) return;
      const existing = map.get(e.department_id);
      if (existing) {
        existing.users.add(e.user_id);
        existing.minutes += e.duration_minutes;
      } else {
        map.set(e.department_id, {
          name: e.department_name || "غير محدد",
          users: new Set([e.user_id]),
          minutes: e.duration_minutes,
        });
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        department_id: id,
        department_name: data.name,
        user_count: data.users.size,
        total_minutes: data.minutes,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);
  }, [filteredEntries]);

  const handleExportTasks = () => {
    exportToCSV(
      taskSummary.map((t) => ({
        ...t,
        total_time: formatMinutesToHours(t.total_minutes),
      })),
      "time-report-tasks",
      [
        { key: "task_title", label: "المهمة" },
        { key: "user_count", label: "عدد المستخدمين" },
        { key: "total_time", label: "إجمالي الوقت" },
      ]
    );
  };

  const handleExportUsers = () => {
    exportToCSV(
      userSummary.map((u) => ({
        ...u,
        total_time: formatMinutesToHours(u.total_minutes),
      })),
      "time-report-users",
      [
        { key: "user_name", label: "المستخدم" },
        { key: "task_count", label: "عدد المهام" },
        { key: "total_time", label: "إجمالي الوقت" },
      ]
    );
  };

  const handleExportDepts = () => {
    exportToCSV(
      deptSummary.map((d) => ({
        ...d,
        total_time: formatMinutesToHours(d.total_minutes),
      })),
      "time-report-departments",
      [
        { key: "department_name", label: "القسم" },
        { key: "user_count", label: "عدد المستخدمين" },
        { key: "total_time", label: "إجمالي الوقت" },
      ]
    );
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      userId: "",
      departmentId: "",
      taskId: "",
    });
  };

  const getDateRangeString = () => {
    if (filters.dateFrom && filters.dateTo) {
      return `${filters.dateFrom} - ${filters.dateTo}`;
    }
    if (filters.dateFrom) return `من ${filters.dateFrom}`;
    if (filters.dateTo) return `حتى ${filters.dateTo}`;
    return "جميع الفترات";
  };

  const handleExportFullPDF = () => {
    exportFullReportPDF(taskSummary, userSummary, deptSummary, getDateRangeString());
  };

  const handleExportTasksPDF = () => {
    exportTaskSummaryPDF(taskSummary, getDateRangeString());
  };

  const handleExportUsersPDF = () => {
    exportUserSummaryPDF(userSummary, getDateRangeString());
  };

  const handleExportDeptsPDF = () => {
    exportDeptSummaryPDF(deptSummary, getDateRangeString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            تقارير تتبع الوقت
          </h1>
          <p className="text-muted-foreground mt-1">
            تحليل وتصدير بيانات الوقت المسجل
          </p>
        </div>
        <Button onClick={handleExportFullPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          تصدير تقرير PDF كامل
        </Button>
      </div>

      {/* Weekly Goal and Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <WeeklyGoalWidget className="lg:row-span-2" />

        {/* Filters */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">من تاريخ</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">إلى تاريخ</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">المستخدم</label>
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="">جميع المستخدمين</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">القسم</label>
                <select
                  value={filters.departmentId}
                  onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="">جميع الأقسام</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">المهمة</label>
                <select
                  value={filters.taskId}
                  onChange={(e) => setFilters({ ...filters, taskId: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="">جميع المهام</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                إعادة تعيين الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats - 3 cards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskSummary.length}</p>
                <p className="text-sm text-muted-foreground">مهمة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userSummary.length}</p>
                <p className="text-sm text-muted-foreground">مستخدم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatMinutesToHours(
                    filteredEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي الوقت</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Charts, Performance and Team Management */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="charts" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            الرسوم البيانية
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            مقارنة الأداء
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              أهداف الفريق
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="charts">
          <TimeReportsCharts
            taskSummary={taskSummary}
            userSummary={userSummary}
            deptSummary={deptSummary}
          />
        </TabsContent>

        <TabsContent value="performance">
          <WeeklyPerformanceChart weeksCount={8} />
        </TabsContent>

        {isManager && (
          <TabsContent value="team">
            <TeamGoalsManagement departmentId={role === "DepartmentHead" ? userDepartmentId : undefined} />
          </TabsContent>
        )}
      </Tabs>

      {/* Task Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            ملخص حسب المهام
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportTasks}>
              <Download className="h-4 w-4 ml-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTasksPDF}>
              <FileText className="h-4 w-4 ml-2" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {taskSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المهمة</TableHead>
                    <TableHead className="text-center">عدد المستخدمين</TableHead>
                    <TableHead className="text-center">إجمالي الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskSummary.slice(0, 10).map((row) => (
                    <TableRow key={row.task_id}>
                      <TableCell className="font-medium">{row.task_title}</TableCell>
                      <TableCell className="text-center">{row.user_count}</TableCell>
                      <TableCell className="text-center">
                        {formatMinutesToHours(row.total_minutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            ملخص حسب المستخدمين
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportUsers}>
              <Download className="h-4 w-4 ml-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportUsersPDF}>
              <FileText className="h-4 w-4 ml-2" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead className="text-center">عدد المهام</TableHead>
                    <TableHead className="text-center">إجمالي الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSummary.slice(0, 10).map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{row.user_name}</TableCell>
                      <TableCell className="text-center">{row.task_count}</TableCell>
                      <TableCell className="text-center">
                        {formatMinutesToHours(row.total_minutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            ملخص حسب الأقسام
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportDepts}>
              <Download className="h-4 w-4 ml-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportDeptsPDF}>
              <FileText className="h-4 w-4 ml-2" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deptSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead className="text-center">عدد المستخدمين</TableHead>
                    <TableHead className="text-center">إجمالي الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptSummary.map((row) => (
                    <TableRow key={row.department_id}>
                      <TableCell className="font-medium">{row.department_name}</TableCell>
                      <TableCell className="text-center">{row.user_count}</TableCell>
                      <TableCell className="text-center">
                        {formatMinutesToHours(row.total_minutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
