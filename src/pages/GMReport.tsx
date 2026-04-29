import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  Download,
  Filter,
  FileText,
  Award,
  AlertTriangle,
  Loader2,
  UserCheck,
  ListTodo,
  Timer,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { exportGMReportPDF } from "@/lib/gm-report-pdf";
import { exportToCSV, formatMinutesToHours } from "@/lib/csv-export";

interface EmployeeStats {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  avgTaskTime: number;
  overdueTasks: number;
}

interface DepartmentStats {
  id: string;
  name: string;
  employeeCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  avgEmployeeCompletionRate: number;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  departmentId: string;
  status: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--accent))",
];

export default function GMReport() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    departmentId: "",
    status: "",
  });

  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [filters.dateFrom, filters.dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch departments
      const { data: depts } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      setDepartmentsList(depts || []);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, department_id, departments(name)")
        .eq("status", "active");

      // Fetch tasks within date range
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, assignee_id, department_id, status, due_date, completed_at, created_at")
        .gte("created_at", filters.dateFrom)
        .lte("created_at", filters.dateTo + "T23:59:59");

      // Fetch time entries
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("task_id, user_id, duration_minutes")
        .gte("start_time", filters.dateFrom)
        .lte("start_time", filters.dateTo + "T23:59:59");

      // Process employee stats
      const employeeStats: EmployeeStats[] = (profiles || []).map((profile: any) => {
        const userTasks = tasks?.filter((t) => t.assignee_id === profile.id) || [];
        const completedTasks = userTasks.filter(
          (t) => t.status === "Completed" || t.status === "Approved"
        ).length;
        const inProgressTasks = userTasks.filter((t) => t.status === "InProgress").length;
        const pendingTasks = userTasks.filter(
          (t) => !["Completed", "Approved", "InProgress", "Rejected"].includes(t.status)
        ).length;
        const overdueTasks = userTasks.filter(
          (t) =>
            t.due_date &&
            new Date(t.due_date) < new Date() &&
            !["Completed", "Approved", "Rejected"].includes(t.status)
        ).length;

        const userTimeEntries = timeEntries?.filter((te) => te.user_id === profile.id) || [];
        const totalTimeMinutes = userTimeEntries.reduce(
          (sum, te) => sum + (te.duration_minutes || 0),
          0
        );

        return {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          departmentId: profile.department_id,
          departmentName: profile.departments?.name || null,
          totalTasks: userTasks.length,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          completionRate: userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0,
          totalTimeMinutes,
          avgTaskTime: completedTasks > 0 ? Math.round(totalTimeMinutes / completedTasks) : 0,
          overdueTasks,
        };
      });

      setEmployees(employeeStats);

      // Process department stats
      const deptStats: DepartmentStats[] = (depts || []).map((dept) => {
        const deptEmployees = employeeStats.filter((e) => e.departmentId === dept.id);
        const deptTasks = tasks?.filter((t) => t.department_id === dept.id) || [];
        const completedTasks = deptTasks.filter(
          (t) => t.status === "Completed" || t.status === "Approved"
        ).length;
        const inProgressTasks = deptTasks.filter((t) => t.status === "InProgress").length;
        const totalTimeMinutes = deptEmployees.reduce((sum, e) => sum + e.totalTimeMinutes, 0);
        const avgCompletionRate =
          deptEmployees.length > 0
            ? Math.round(deptEmployees.reduce((sum, e) => sum + e.completionRate, 0) / deptEmployees.length)
            : 0;

        return {
          id: dept.id,
          name: dept.name,
          employeeCount: deptEmployees.length,
          totalTasks: deptTasks.length,
          completedTasks,
          inProgressTasks,
          completionRate: deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0,
          totalTimeMinutes,
          avgEmployeeCompletionRate: avgCompletionRate,
        };
      });

      setDepartments(deptStats);

      // Fetch monthly trends
      await fetchMonthlyTrends();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async () => {
    try {
      const trends = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const monthLabel = format(date, "MMM", { locale: ar });

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, status")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        const total = tasks?.length || 0;
        const completed = tasks?.filter((t) => t.status === "Completed" || t.status === "Approved").length || 0;

        trends.push({
          month: monthLabel,
          "إجمالي المهام": total,
          "المهام المكتملة": completed,
          "نسبة الإنجاز": total > 0 ? Math.round((completed / total) * 100) : 0,
        });
      }
      setMonthlyTrends(trends);
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  // Filtered data
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (filters.departmentId && e.departmentId !== filters.departmentId) return false;
      if (filters.status === "top" && e.completionRate < 80) return false;
      if (filters.status === "low" && e.completionRate >= 50) return false;
      if (filters.status === "overdue" && e.overdueTasks === 0) return false;
      return true;
    });
  }, [employees, filters]);

  const filteredDepartments = useMemo(() => {
    if (!filters.departmentId) return departments;
    return departments.filter((d) => d.id === filters.departmentId);
  }, [departments, filters.departmentId]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalEmployees = filteredEmployees.length;
    const totalTasks = filteredEmployees.reduce((sum, e) => sum + e.totalTasks, 0);
    const totalCompleted = filteredEmployees.reduce((sum, e) => sum + e.completedTasks, 0);
    const totalOverdue = filteredEmployees.reduce((sum, e) => sum + e.overdueTasks, 0);
    const totalTime = filteredEmployees.reduce((sum, e) => sum + e.totalTimeMinutes, 0);
    const avgCompletionRate =
      totalEmployees > 0
        ? Math.round(filteredEmployees.reduce((sum, e) => sum + e.completionRate, 0) / totalEmployees)
        : 0;

    return {
      totalEmployees,
      totalTasks,
      totalCompleted,
      totalOverdue,
      totalTime,
      avgCompletionRate,
    };
  }, [filteredEmployees]);

  // Top performers
  const topPerformers = useMemo(() => {
    return [...filteredEmployees]
      .filter((e) => e.totalTasks > 0)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);
  }, [filteredEmployees]);

  // Low performers
  const lowPerformers = useMemo(() => {
    return [...filteredEmployees]
      .filter((e) => e.totalTasks > 0)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 5);
  }, [filteredEmployees]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      dateTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      departmentId: "",
      status: "",
    });
  };

  const handleExportPDF = async () => {
    try {
      await exportGMReportPDF({
        employees: filteredEmployees,
        departments: filteredDepartments,
        summary: summaryStats,
        dateRange: `${filters.dateFrom} - ${filters.dateTo}`,
        topPerformers,
        lowPerformers,
      });
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      toast.error("خطأ في تصدير التقرير");
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredEmployees.map((e) => ({
        الاسم: e.name,
        البريد: e.email,
        القسم: e.departmentName || "غير محدد",
        "إجمالي المهام": e.totalTasks,
        المكتملة: e.completedTasks,
        "قيد التنفيذ": e.inProgressTasks,
        المعلقة: e.pendingTasks,
        المتأخرة: e.overdueTasks,
        "نسبة الإنجاز": `${e.completionRate}%`,
        "إجمالي الوقت": formatMinutesToHours(e.totalTimeMinutes),
      })),
      "gm-employee-report",
      [
        { key: "الاسم", label: "الاسم" },
        { key: "البريد", label: "البريد الإلكتروني" },
        { key: "القسم", label: "القسم" },
        { key: "إجمالي المهام", label: "إجمالي المهام" },
        { key: "المكتملة", label: "المكتملة" },
        { key: "قيد التنفيذ", label: "قيد التنفيذ" },
        { key: "المعلقة", label: "المعلقة" },
        { key: "المتأخرة", label: "المتأخرة" },
        { key: "نسبة الإنجاز", label: "نسبة الإنجاز" },
        { key: "إجمالي الوقت", label: "إجمالي الوقت" },
      ]
    );
    toast.success("تم تصدير ملف CSV بنجاح");
  };

  // Chart data
  const departmentChartData = filteredDepartments.map((d) => ({
    name: d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name,
    المكتملة: d.completedTasks,
    "قيد التنفيذ": d.inProgressTasks,
    "نسبة الإنجاز": d.completionRate,
  }));

  const taskDistributionData = [
    { name: "مكتملة", value: summaryStats.totalCompleted, fill: "hsl(var(--chart-2))" },
    { name: "قيد التنفيذ", value: summaryStats.totalTasks - summaryStats.totalCompleted - summaryStats.totalOverdue, fill: "hsl(var(--chart-4))" },
    { name: "متأخرة", value: summaryStats.totalOverdue, fill: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تقرير المدير العام الشامل
          </h1>
          <p className="page-subtitle">إحصائيات شاملة للكوادر والأقسام مع إمكانية التصفية والتصدير</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} className="gap-2"
            style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
            <FileText className="h-4 w-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
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
              <label className="text-sm font-medium">القسم</label>
              <Select
                value={filters.departmentId || "all"}
                onValueChange={(value) => setFilters({ ...filters, departmentId: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departmentsList.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">تصفية الموظفين</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="top">الأعلى أداءً (80%+)</SelectItem>
                  <SelectItem value="low">الأقل أداءً (&lt;50%)</SelectItem>
                  <SelectItem value="overdue">لديهم مهام متأخرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الموظفين</p>
                <p className="text-xl font-bold">{summaryStats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ListTodo className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المهام</p>
                <p className="text-xl font-bold">{summaryStats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المكتملة</p>
                <p className="text-xl font-bold">{summaryStats.totalCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المتأخرة</p>
                <p className="text-xl font-bold">{summaryStats.totalOverdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Timer className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الوقت</p>
                <p className="text-xl font-bold">{formatTime(summaryStats.totalTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">متوسط الإنجاز</p>
                <p className="text-xl font-bold">{summaryStats.avgCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            الموظفين
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            الأقسام
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            الرسوم البيانية
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Award className="h-4 w-4" />
            الأداء
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إحصائيات الموظفين ({filteredEmployees.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الموظف</TableHead>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-center">إجمالي المهام</TableHead>
                      <TableHead className="text-center">المكتملة</TableHead>
                      <TableHead className="text-center">قيد التنفيذ</TableHead>
                      <TableHead className="text-center">المتأخرة</TableHead>
                      <TableHead className="text-center">نسبة الإنجاز</TableHead>
                      <TableHead className="text-center">إجمالي الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {employee.departmentName || (
                              <span className="text-muted-foreground">غير محدد</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{employee.totalTasks}</TableCell>
                          <TableCell className="text-center">{employee.completedTasks}</TableCell>
                          <TableCell className="text-center">{employee.inProgressTasks}</TableCell>
                          <TableCell className="text-center">
                            {employee.overdueTasks > 0 ? (
                              <Badge variant="destructive">{employee.overdueTasks}</Badge>
                            ) : (
                              0
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress
                                value={employee.completionRate}
                                className="w-16 h-2"
                              />
                              <span className="text-sm">{employee.completionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatTime(employee.totalTimeMinutes)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إحصائيات الأقسام ({filteredDepartments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-center">عدد الموظفين</TableHead>
                      <TableHead className="text-center">إجمالي المهام</TableHead>
                      <TableHead className="text-center">المكتملة</TableHead>
                      <TableHead className="text-center">قيد التنفيذ</TableHead>
                      <TableHead className="text-center">نسبة الإنجاز</TableHead>
                      <TableHead className="text-center">إجمالي الوقت</TableHead>
                      <TableHead className="text-center">متوسط أداء الموظف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell className="text-center">{dept.employeeCount}</TableCell>
                          <TableCell className="text-center">{dept.totalTasks}</TableCell>
                          <TableCell className="text-center">{dept.completedTasks}</TableCell>
                          <TableCell className="text-center">{dept.inProgressTasks}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={dept.completionRate} className="w-16 h-2" />
                              <span className="text-sm">{dept.completionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {formatTime(dept.totalTimeMinutes)}
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.avgEmployeeCompletionRate}%
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">أداء الأقسام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="المكتملة" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="قيد التنفيذ" fill="hsl(var(--chart-4))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توزيع المهام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {taskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">اتجاهات الأداء الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="إجمالي المهام"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="المهام المكتملة"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="نسبة الإنجاز"
                        stroke="hsl(var(--chart-4))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  أفضل الموظفين أداءً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                  ) : (
                    topPerformers.map((employee, index) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : index === 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.departmentName || "غير محدد"}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{employee.completionRate}%</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.completedTasks}/{employee.totalTasks} مهمة
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  الموظفون الذين يحتاجون دعم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowPerformers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                  ) : (
                    lowPerformers.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <UserCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.departmentName || "غير محدد"}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-orange-600">{employee.completionRate}%</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.overdueTasks > 0 && (
                              <span className="text-destructive">
                                {employee.overdueTasks} متأخرة
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
