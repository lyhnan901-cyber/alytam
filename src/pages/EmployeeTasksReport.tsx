import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText, Download, CalendarIcon, RotateCcw, Users } from "lucide-react";
import { InteractiveStatsCards } from "@/components/employee-report/InteractiveStatsCards";
import { TaskDetailsDrawer, StatType } from "@/components/employee-report/TaskDetailsDrawer";
import { EmployeeSummaryTable, EmployeeSummary } from "@/components/employee-report/EmployeeSummaryTable";
import { DailyTasksSection, TaskDetails } from "@/components/employee-report/DailyTasksSection";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { exportToCSV } from "@/lib/csv-export";
import { generateEmployeeReportPDF } from "@/lib/employee-report-pdf";
import { cn } from "@/lib/utils";

type DateRange = "today" | "yesterday" | "week" | "custom";

export default function EmployeeTasksReport() {
  const { profile, role, isGeneralManager } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<StatType | null>(null);

  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees based on role
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-report", selectedDepartment, role, profile?.department_id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, department_id, departments(name)")
        .eq("status", "active")
        .order("full_name");

      // DepartmentHead can only see their department
      if (role === "DepartmentHead" && profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      } else if (selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch all tasks with time entries
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["employee-tasks-report", selectedDepartment, role, profile?.department_id],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          created_at,
          completed_at,
          assignee_id,
          department_id,
          departments(name),
          time_entries(duration_minutes)
        `)
        .not("assignee_id", "is", null);

      // DepartmentHead filter
      if (role === "DepartmentHead" && profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      } else if (selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Process data for each employee
  const employeeSummaries: EmployeeSummary[] = useMemo(() => {
    if (!tasksData || !employees) return [];

    return employees.map((emp) => {
      const empTasks = tasksData.filter((t) => t.assignee_id === emp.id);
      
      const todayTasks = empTasks.filter((t) => {
        const taskDate = t.due_date ? startOfDay(new Date(t.due_date)) : startOfDay(new Date(t.created_at));
        return taskDate.getTime() === today.getTime();
      });

      const yesterdayTasks = empTasks.filter((t) => {
        const taskDate = t.due_date ? startOfDay(new Date(t.due_date)) : startOfDay(new Date(t.created_at));
        return taskDate.getTime() === yesterday.getTime();
      });

      const completedStatuses = ["Completed", "Approved"];
      const inProgressStatuses = ["InProgress"];
      
      const completedCount = empTasks.filter((t) => completedStatuses.includes(t.status)).length;
      const inProgressCount = empTasks.filter((t) => inProgressStatuses.includes(t.status)).length;
      const overdueCount = empTasks.filter((t) => {
        if (!t.due_date) return false;
        if (completedStatuses.includes(t.status)) return false;
        return new Date(t.due_date) < new Date();
      }).length;

      const totalTime = empTasks.reduce((sum, t) => {
        const taskTime = t.time_entries?.reduce((s, te) => s + (te.duration_minutes || 0), 0) || 0;
        return sum + taskTime;
      }, 0);

      const completionRate = empTasks.length > 0 
        ? Math.round((completedCount / empTasks.length) * 100) 
        : 0;

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        departmentName: (emp.departments as any)?.name || null,
        todayCount: todayTasks.length,
        yesterdayCount: yesterdayTasks.length,
        completedCount,
        inProgressCount,
        overdueCount,
        completionRate,
        totalTimeMinutes: totalTime,
      };
    });
  }, [tasksData, employees, today, yesterday]);

  // Get selected employee details
  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !tasksData || !employees) return null;

    const emp = employees.find((e) => e.id === selectedEmployee);
    if (!emp) return null;

    const empTasks = tasksData.filter((t) => t.assignee_id === selectedEmployee);

    const mapTask = (t: any): TaskDetails => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      timeSpentMinutes: t.time_entries?.reduce((s: number, te: any) => s + (te.duration_minutes || 0), 0) || 0,
    });

    const todayTasks = empTasks
      .filter((t) => {
        const taskDate = t.due_date ? startOfDay(new Date(t.due_date)) : startOfDay(new Date(t.created_at));
        return taskDate.getTime() === today.getTime();
      })
      .map(mapTask);

    const yesterdayTasks = empTasks
      .filter((t) => {
        const taskDate = t.due_date ? startOfDay(new Date(t.due_date)) : startOfDay(new Date(t.created_at));
        return taskDate.getTime() === yesterday.getTime();
      })
      .map(mapTask);

    return {
      employeeName: emp.full_name,
      todayTasks,
      yesterdayTasks,
    };
  }, [selectedEmployee, tasksData, employees, today, yesterday]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const total = employeeSummaries.reduce((s, e) => s + e.todayCount + e.yesterdayCount, 0);
    const completed = employeeSummaries.reduce((s, e) => s + e.completedCount, 0);
    const inProgress = employeeSummaries.reduce((s, e) => s + e.inProgressCount, 0);
    const overdue = employeeSummaries.reduce((s, e) => s + e.overdueCount, 0);
    const totalMinutes = employeeSummaries.reduce((s, e) => s + e.totalTimeMinutes, 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate, totalMinutes };
  }, [employeeSummaries]);

  // Chart data
  const statusChartData = [
    { name: "مكتملة", value: aggregateStats.completed, color: "hsl(var(--success))" },
    { name: "قيد التنفيذ", value: aggregateStats.inProgress, color: "hsl(var(--warning))" },
    { name: "متأخرة", value: aggregateStats.overdue, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const employeeChartData = employeeSummaries
    .slice(0, 10)
    .map((e) => ({
      name: e.employeeName.split(" ")[0],
      مكتملة: e.completedCount,
      جارية: e.inProgressCount,
      متأخرة: e.overdueCount,
    }));

  // Export functions
  const handleExportCSV = () => {
    const headers = [
      { key: "employeeName", label: "الموظف" },
      { key: "departmentName", label: "القسم" },
      { key: "todayCount", label: "مهام اليوم" },
      { key: "yesterdayCount", label: "مهام الأمس" },
      { key: "completedCount", label: "المكتملة" },
      { key: "inProgressCount", label: "قيد التنفيذ" },
      { key: "overdueCount", label: "المتأخرة" },
      { key: "completionRate", label: "نسبة الإنجاز %" },
    ];
    exportToCSV(employeeSummaries, `تقرير-مهام-الموظفين-${format(new Date(), "yyyy-MM-dd")}`, headers);
  };

  const handleExportPDF = async () => {
    const deptName = selectedDepartment === "all" 
      ? "جميع الأقسام" 
      : departments.find(d => d.id === selectedDepartment)?.name || "جميع الأقسام";
    
    await generateEmployeeReportPDF(employeeSummaries, aggregateStats, deptName);
  };

  const resetFilters = () => {
    setSelectedDepartment("all");
    setSelectedEmployee(null);
    setDateRange("today");
  };

  const canSeeDepartmentFilter = isGeneralManager || role === "ExecutiveManager" || role === "Supervisor";

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> تقرير مهام الكوادر
          </h1>
          <p className="page-subtitle">متابعة أداء كوادر المؤسسة ومهامهم اليومية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} className="gap-1.5">
            <FileText className="w-4 h-4" /> تصدير PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {canSeeDepartmentFilter && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="custom">تاريخ مخصص</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(customDate, "PPP", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => date && setCustomDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <InteractiveStatsCards
        total={aggregateStats.total}
        completed={aggregateStats.completed}
        inProgress={aggregateStats.inProgress}
        overdue={aggregateStats.overdue}
        completionRate={aggregateStats.completionRate}
        totalMinutes={aggregateStats.totalMinutes}
        onStatClick={(statType) => {
          setSelectedStatType(statType);
          setDrawerOpen(true);
        }}
      />

      {/* Employees Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">ملخص الموظفين</h2>
        <EmployeeSummaryTable
          employees={employeeSummaries}
          onSelectEmployee={setSelectedEmployee}
          selectedEmployeeId={selectedEmployee}
          isLoading={tasksLoading}
        />
      </div>

      {/* Selected Employee Details */}
      {selectedEmployeeData && (
        <DailyTasksSection
          employeeName={selectedEmployeeData.employeeName}
          todayTasks={selectedEmployeeData.todayTasks}
          yesterdayTasks={selectedEmployeeData.yesterdayTasks}
        />
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع حالات المهام</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مقارنة أداء الموظفين</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={employeeChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="مكتملة" fill="hsl(var(--success))" />
                  <Bar dataKey="جارية" fill="hsl(var(--warning))" />
                  <Bar dataKey="متأخرة" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedStatType(null);
        }}
        statType={selectedStatType}
        tasks={(tasksData || []).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          assignee_id: t.assignee_id,
          department_id: t.department_id,
          departments: t.departments,
        }))}
        title={
          selectedStatType === "total" ? "إجمالي المهام" :
          selectedStatType === "completed" ? "المهام المكتملة" :
          selectedStatType === "inProgress" ? "المهام قيد التنفيذ" :
          selectedStatType === "overdue" ? "المهام المتأخرة" :
          selectedStatType === "completionRate" ? "المهام المكتملة (نسبة الإنجاز)" :
          ""
        }
      />
    </div>
  );
}
