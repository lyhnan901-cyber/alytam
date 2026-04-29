import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText, CheckSquare, Users, Building2, Clock, TrendingUp, UserPlus, DollarSign, BarChart3, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { exportComprehensiveReportPDF, exportExecutiveSummaryPDF, ComprehensiveReportData, RequestStats, TaskStats, LeadStats, TimeStats, EmployeeSummary, DepartmentSummary } from "@/lib/comprehensive-report-pdf";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const statusLabels: Record<string, string> = {
  New: "جديد",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  Closed: "مغلق",
  NotStarted: "لم يبدأ",
  Approved: "موافق عليه",
  PendingDeptHeadReview: "بانتظار مراجعة رئيس القسم",
  PendingSupervisorReview: "بانتظار مراجعة المشرف",
  PendingExecutiveReview: "بانتظار مراجعة المدير التنفيذي",
  PendingGMApproval: "بانتظار موافقة المدير العام",
  NeedRevision: "يحتاج مراجعة",
  Rejected: "مرفوض",
};

const priorityLabels: Record<string, string> = {
  High: "عالية",
  Medium: "متوسطة",
  Low: "منخفضة",
};

const channelLabels: Record<string, string> = {
  phone: "هاتف",
  whatsapp: "واتساب",
  email: "بريد إلكتروني",
  referral: "إحالة",
};

const leadStatusLabels: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهل",
  proposal: "عرض سعر",
  negotiation: "تفاوض",
  won: "مكتسب",
  lost: "خسارة",
};

const sourceLabels: Record<string, string> = {
  website: "الموقع",
  referral: "إحالة",
  social_media: "سوشيال ميديا",
  ads: "إعلانات",
  other: "أخرى",
};

export default function ComprehensiveReport() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Data states
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: format(now, "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "week":
        return { start: format(startOfWeek(now, { locale: ar }), "yyyy-MM-dd"), end: format(endOfWeek(now, { locale: ar }), "yyyy-MM-dd") };
      case "month":
        return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
      case "quarter":
        return { start: format(subMonths(now, 3), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "year":
        return { start: format(subMonths(now, 12), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      default:
        return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedDepartment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Fetch all data in parallel
      const [deptRes, requestsRes, tasksRes, profilesRes, leadsRes, timeRes] = await Promise.all([
        supabase.from("departments").select("*"),
        supabase.from("requests").select("*").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("tasks").select("*, department:departments(name)").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("profiles").select("*, department:departments(id, name)").eq("status", "active"),
        supabase.from("leads").select("*").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("time_entries").select("*, task:tasks(title, department_id)").gte("created_at", start).lte("created_at", end + "T23:59:59"),
      ]);

      setDepartments(deptRes.data || []);
      setRequests(requestsRes.data || []);
      
      // Filter tasks by department if selected
      let filteredTasks = tasksRes.data || [];
      if (selectedDepartment !== "all") {
        filteredTasks = filteredTasks.filter((t) => t.department_id === selectedDepartment);
      }
      setTasks(filteredTasks);

      let filteredEmployees = profilesRes.data || [];
      if (selectedDepartment !== "all") {
        filteredEmployees = filteredEmployees.filter((e) => e.department_id === selectedDepartment);
      }
      setEmployees(filteredEmployees);

      setLeads(leadsRes.data || []);
      setTimeEntries(timeRes.data || []);

      // Fetch monthly data for trends
      await fetchMonthlyTrends();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async () => {
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = format(startOfMonth(date), "yyyy-MM-dd");
      const end = format(endOfMonth(date), "yyyy-MM-dd");
      const monthName = format(date, "MMM", { locale: ar });

      const [tasksRes, requestsRes, leadsRes] = await Promise.all([
        supabase.from("tasks").select("id, status").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("requests").select("id").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("leads").select("id, status").gte("created_at", start).lte("created_at", end + "T23:59:59"),
      ]);

      const completedTasks = (tasksRes.data || []).filter((t) => t.status === "Completed" || t.status === "Approved").length;
      const wonLeads = (leadsRes.data || []).filter((l) => l.status === "won").length;

      months.push({
        month: monthName,
        tasks: tasksRes.data?.length || 0,
        completedTasks,
        requests: requestsRes.data?.length || 0,
        leads: leadsRes.data?.length || 0,
        wonLeads,
      });
    }
    setMonthlyData(months);
  };

  // Computed statistics
  const requestStats = useMemo((): RequestStats => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalProcessingDays = 0;
    let closedCount = 0;

    requests.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
      byType[r.request_type] = (byType[r.request_type] || 0) + 1;

      if (r.closed_at) {
        closedCount++;
        totalProcessingDays += differenceInDays(new Date(r.closed_at), new Date(r.created_at));
      }
    });

    return {
      total: requests.length,
      byStatus,
      byPriority,
      byChannel,
      byType,
      avgProcessingDays: closedCount > 0 ? totalProcessingDays / closedCount : 0,
    };
  }, [requests]);

  const taskStats = useMemo((): TaskStats => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    let completedCount = 0;
    let overdueCount = 0;
    let totalCompletionDays = 0;

    const now = new Date();

    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      byLevel[t.level] = (byLevel[t.level] || 0) + 1;

      if (t.status === "Completed" || t.status === "Approved") {
        completedCount++;
        if (t.completed_at) {
          totalCompletionDays += differenceInDays(new Date(t.completed_at), new Date(t.created_at));
        }
      }

      if (t.due_date && new Date(t.due_date) < now && t.status !== "Completed" && t.status !== "Approved") {
        overdueCount++;
      }
    });

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      byLevel,
      completionRate: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
      overdueCount,
      avgCompletionDays: completedCount > 0 ? totalCompletionDays / completedCount : 0,
    };
  }, [tasks]);

  const leadStats = useMemo((): LeadStats => {
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalValue = 0;
    let wonValue = 0;

    leads.forEach((l) => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      bySource[l.source] = (bySource[l.source] || 0) + 1;
      totalValue += l.estimated_value || 0;
      if (l.status === "won") {
        wonValue += l.estimated_value || 0;
      }
    });

    const wonCount = byStatus["won"] || 0;
    const totalLeads = leads.length;

    return {
      total: totalLeads,
      byStatus,
      bySource,
      totalValue,
      wonValue,
      conversionRate: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0,
    };
  }, [leads]);

  const timeStats = useMemo((): TimeStats => {
    const totalMinutes = timeEntries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0);

    const byDeptMap: Record<string, number> = {};
    const byEmployeeMap: Record<string, number> = {};
    const byTaskMap: Record<string, { title: string; minutes: number }> = {};

    timeEntries.forEach((te) => {
      const deptId = te.task?.department_id;
      if (deptId) {
        const dept = departments.find((d) => d.id === deptId);
        const deptName = dept?.name || "غير محدد";
        byDeptMap[deptName] = (byDeptMap[deptName] || 0) + (te.duration_minutes || 0);
      }

      const emp = employees.find((e) => e.id === te.user_id);
      const empName = emp?.full_name || "غير معروف";
      byEmployeeMap[empName] = (byEmployeeMap[empName] || 0) + (te.duration_minutes || 0);

      if (te.task?.title) {
        if (!byTaskMap[te.task_id]) {
          byTaskMap[te.task_id] = { title: te.task.title, minutes: 0 };
        }
        byTaskMap[te.task_id].minutes += te.duration_minutes || 0;
      }
    });

    return {
      totalMinutes,
      byDepartment: Object.entries(byDeptMap).map(([name, minutes]) => ({ name, minutes })),
      byEmployee: Object.entries(byEmployeeMap).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes),
      topTasks: Object.values(byTaskMap).sort((a, b) => b.minutes - a.minutes),
    };
  }, [timeEntries, departments, employees]);

  const employeeSummaries = useMemo((): EmployeeSummary[] => {
    return employees.map((emp) => {
      const empTasks = tasks.filter((t) => t.assignee_id === emp.id);
      const completedTasks = empTasks.filter((t) => t.status === "Completed" || t.status === "Approved").length;
      const inProgressTasks = empTasks.filter((t) => t.status === "InProgress").length;
      const overdueTasks = empTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Completed" && t.status !== "Approved").length;
      const totalMinutes = timeEntries.filter((te) => te.user_id === emp.id).reduce((sum, te) => sum + (te.duration_minutes || 0), 0);

      return {
        id: emp.id,
        name: emp.full_name,
        email: emp.email,
        department: emp.department?.name || null,
        totalTasks: empTasks.length,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 0,
        totalMinutes,
      };
    });
  }, [employees, tasks, timeEntries]);

  const departmentSummaries = useMemo((): DepartmentSummary[] => {
    return departments.map((dept) => {
      const deptEmployees = employees.filter((e) => e.department_id === dept.id);
      const deptTasks = tasks.filter((t) => t.department_id === dept.id);
      const completedTasks = deptTasks.filter((t) => t.status === "Completed" || t.status === "Approved").length;
      const totalMinutes = timeEntries.filter((te) => te.task?.department_id === dept.id).reduce((sum, te) => sum + (te.duration_minutes || 0), 0);

      return {
        id: dept.id,
        name: dept.name,
        employeeCount: deptEmployees.length,
        totalTasks: deptTasks.length,
        completedTasks,
        completionRate: deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0,
        totalMinutes,
      };
    });
  }, [departments, employees, tasks, timeEntries]);

  const topPerformers = useMemo(() => {
    return [...employeeSummaries].sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);
  }, [employeeSummaries]);

  const lowPerformers = useMemo(() => {
    return [...employeeSummaries].filter((e) => e.totalTasks > 0).sort((a, b) => a.completionRate - b.completionRate).slice(0, 5);
  }, [employeeSummaries]);

  const overallSummary = useMemo(() => {
    return {
      totalRequests: requests.length,
      totalTasks: tasks.length,
      totalLeads: leads.length,
      totalEmployees: employees.length,
      totalDepartments: departments.length,
      overallCompletionRate: taskStats.completionRate,
      totalHours: Math.round(timeStats.totalMinutes / 60),
      totalDealsValue: leadStats.wonValue,
    };
  }, [requests, tasks, leads, employees, departments, taskStats, timeStats, leadStats]);

  const { start, end } = getDateRange();
  const dateRangeLabel = `${format(new Date(start), "d MMM yyyy", { locale: ar })} - ${format(new Date(end), "d MMM yyyy", { locale: ar })}`;

  const handleExportPDF = async () => {
    const reportData: ComprehensiveReportData = {
      dateRange: dateRangeLabel,
      requests: requestStats,
      tasks: taskStats,
      employees: employeeSummaries,
      departments: departmentSummaries,
      leads: leadStats,
      time: timeStats,
      summary: overallSummary,
    };
    await exportComprehensiveReportPDF(reportData);
    toast.success("تم تصدير التقرير الشامل بنجاح");
  };

  const handleExportExecutive = async () => {
    const reportData: ComprehensiveReportData = {
      dateRange: dateRangeLabel,
      requests: requestStats,
      tasks: taskStats,
      employees: employeeSummaries,
      departments: departmentSummaries,
      leads: leadStats,
      time: timeStats,
      summary: overallSummary,
    };
    await exportExecutiveSummaryPDF(reportData);
    toast.success("تم تصدير الملخص التنفيذي بنجاح");
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(num);
  };

  // Chart data
  const requestStatusData = Object.entries(requestStats.byStatus).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
  }));

  const taskStatusData = Object.entries(taskStats.byStatus).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
  }));

  const leadStatusData = Object.entries(leadStats.byStatus).map(([status, count]) => ({
    name: leadStatusLabels[status] || status,
    value: count,
  }));

  const deptPerformanceData = departmentSummaries.map((d) => ({
    name: d.name,
    tasks: d.totalTasks,
    completed: d.completedTasks,
    rate: d.completionRate,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التقرير الشامل للنظام</h1>
          <p className="text-muted-foreground">{dateRangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
              <SelectItem value="year">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="جميع الأقسام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportExecutive} variant="outline">
            <Download className="w-4 h-4 ml-2" />
            ملخص تنفيذي
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="featured-card">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overallSummary.totalRequests}</p>
            <p className="text-xs text-muted-foreground">الطلبات</p>
          </CardContent>
        </Card>
        <Card className="featured-card">
          <CardContent className="p-4 text-center">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{overallSummary.totalTasks}</p>
            <p className="text-xs text-muted-foreground">المهام</p>
          </CardContent>
        </Card>
        <Card className="featured-card">
          <CardContent className="p-4 text-center">
            <UserPlus className="w-8 h-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{overallSummary.totalLeads}</p>
            <p className="text-xs text-muted-foreground">الحالات المستفيدة</p>
          </CardContent>
        </Card>
        <Card className="featured-card">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{overallSummary.overallCompletionRate}%</p>
            <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{overallSummary.totalEmployees}</p>
            <p className="text-xs text-muted-foreground">الموظفين</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{overallSummary.totalDepartments}</p>
            <p className="text-xs text-muted-foreground">الأقسام</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{overallSummary.totalHours}س</p>
            <p className="text-xs text-muted-foreground">ساعات العمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-bold">{formatCurrency(overallSummary.totalDealsValue)}</p>
            <p className="text-xs text-muted-foreground">الصفقات</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="summary">الملخص</TabsTrigger>
          <TabsTrigger value="requests">الطلبات</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="departments">الأقسام</TabsTrigger>
          <TabsTrigger value="time">الوقت</TabsTrigger>
          <TabsTrigger value="sales">الحالات المستفيدة</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Requests Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  توزيع الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={requestStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {requestStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  توزيع المهام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {taskStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>أداء الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tasks" name="المهام" fill="#3b82f6" />
                    <Bar dataKey="completed" name="المكتملة" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top & Low Performers */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-success">أفضل 5 موظفين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((emp, i) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-success/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.department || "غير محدد"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {emp.completionRate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-warning">يحتاجون دعم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowPerformers.map((emp, i) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.department || "غير محدد"}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {emp.completionRate}%
                        </Badge>
                        {emp.overdueTasks > 0 && (
                          <p className="text-xs text-destructive mt-1">{emp.overdueTasks} متأخرة</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="featured-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-3xl font-bold">{requestStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">متوسط وقت المعالجة</p>
                <p className="text-3xl font-bold">{requestStats.avgProcessingDays.toFixed(1)} يوم</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">الطلبات المغلقة</p>
                <p className="text-3xl font-bold">{requestStats.byStatus["Closed"] || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">الطلبات المفتوحة</p>
                <p className="text-3xl font-bold">{(requestStats.byStatus["New"] || 0) + (requestStats.byStatus["InProgress"] || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(requestStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span>{statusLabels[status] || status}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حسب القناة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(requestStats.byChannel).map(([channel, count]) => (
                    <div key={channel} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span>{channelLabels[channel] || channel}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="featured-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">إجمالي المهام</p>
                <p className="text-3xl font-bold">{taskStats.total}</p>
              </CardContent>
            </Card>
            <Card className="featured-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">نسبة الإنجاز</p>
                <p className="text-3xl font-bold text-success">{taskStats.completionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">المهام المتأخرة</p>
                <p className="text-3xl font-bold text-destructive">{taskStats.overdueCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">متوسط وقت الإنجاز</p>
                <p className="text-3xl font-bold">{taskStats.avgCompletionDays.toFixed(1)} يوم</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(taskStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">{statusLabels[status] || status}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حسب الأولوية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(taskStats.byPriority).map(([priority, count]) => ({
                          name: priorityLabels[priority] || priority,
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#22c55e" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جدول أداء الموظفين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">الموظف</th>
                      <th className="text-right p-3">القسم</th>
                      <th className="text-center p-3">المهام</th>
                      <th className="text-center p-3">مكتملة</th>
                      <th className="text-center p-3">قيد التنفيذ</th>
                      <th className="text-center p-3">متأخرة</th>
                      <th className="text-center p-3">نسبة الإنجاز</th>
                      <th className="text-center p-3">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSummaries.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{emp.name}</td>
                        <td className="p-3 text-muted-foreground">{emp.department || "غير محدد"}</td>
                        <td className="p-3 text-center">{emp.totalTasks}</td>
                        <td className="p-3 text-center text-success">{emp.completedTasks}</td>
                        <td className="p-3 text-center text-info">{emp.inProgressTasks}</td>
                        <td className="p-3 text-center text-destructive">{emp.overdueTasks}</td>
                        <td className="p-3 text-center">
                          <Badge variant={emp.completionRate >= 70 ? "default" : emp.completionRate >= 40 ? "secondary" : "destructive"}>
                            {emp.completionRate}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center">{formatTime(emp.totalMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tasks" name="إجمالي المهام" fill="#3b82f6" />
                    <Bar dataKey="completed" name="المكتملة" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentSummaries.map((dept) => (
              <Card key={dept.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموظفين</span>
                      <span className="font-medium">{dept.employeeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المهام</span>
                      <span className="font-medium">{dept.totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المكتملة</span>
                      <span className="font-medium text-success">{dept.completedTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نسبة الإنجاز</span>
                      <Badge>{dept.completionRate}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الوقت</span>
                      <span className="font-medium">{formatTime(dept.totalMinutes)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Time Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="featured-card">
              <CardContent className="p-4 text-center">
                <Clock className="w-10 h-10 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{formatTime(timeStats.totalMinutes)}</p>
                <p className="text-sm text-muted-foreground">إجمالي الوقت</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{timeStats.topTasks.length}</p>
                <p className="text-sm text-muted-foreground">مهام مسجل عليها وقت</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{timeStats.byEmployee.length}</p>
                <p className="text-sm text-muted-foreground">موظفين سجلوا وقت</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>أكثر المهام استهلاكاً للوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {timeStats.topTasks.slice(0, 10).map((task, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm truncate flex-1">{task.title}</span>
                      <Badge variant="outline">{formatTime(task.minutes)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الوقت حسب الأقسام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeStats.byDepartment}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="minutes"
                        nameKey="name"
                        label={({ name }) => name}
                      >
                        {timeStats.byDepartment.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatTime(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="featured-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">إجمالي الحالات المستفيدة</p>
                <p className="text-3xl font-bold">{leadStats.total}</p>
              </CardContent>
            </Card>
            <Card className="featured-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">معدل التحويل</p>
                <p className="text-3xl font-bold text-success">{leadStats.conversionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">قيمة الفرص</p>
                <p className="text-2xl font-bold">{formatCurrency(leadStats.totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">الصفقات المكتسبة</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(leadStats.wonValue)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>مراحل دراسة الحالات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حسب المصدر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(leadStats.bySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span>{sourceLabels[source] || source}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>اتجاه المهام خلال 6 أشهر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tasks" name="إجمالي المهام" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="completedTasks" name="المكتملة" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>اتجاه الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="requests" name="الطلبات" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>اتجاه الحالات المستفيدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="leads" name="الحالات" stroke="#8b5cf6" strokeWidth={2} />
                      <Line type="monotone" dataKey="wonLeads" name="المكتسبين" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
