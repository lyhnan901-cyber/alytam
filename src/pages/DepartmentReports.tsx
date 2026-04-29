import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from "recharts";
import { Building2, CheckCircle, Clock, TrendingUp, Users, Target, Download, CalendarRange } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { exportDepartmentReportPDF, exportMonthlyComparisonPDF, type DepartmentReportData, type MonthlyComparisonData } from "@/lib/pdf-export";

interface DepartmentStats {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  employeeCount: number;
  avgTasksPerEmployee: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))', 'hsl(var(--secondary))'];

const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DepartmentReports() {
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState("monthly");
  
  // Monthly comparison state
  const [comparisonMonths, setComparisonMonths] = useState(6);
  const [monthlyData, setMonthlyData] = useState<MonthlyComparisonData[]>([]);
  const [loadingComparison, setLoadingComparison] = useState(false);
  
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ar })
    };
  });

  useEffect(() => {
    fetchDepartmentStats();
  }, [selectedMonth]);

  useEffect(() => {
    if (activeTab === "comparison") {
      fetchMonthlyComparison();
    }
  }, [activeTab, comparisonMonths]);

  const fetchDepartmentStats = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      if (!departments) return;

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, department_id, status, completed_at, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('task_id, duration_minutes, user_id')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, department_id');

      const stats: DepartmentStats[] = departments.map(dept => {
        const deptTasks = tasks?.filter(t => t.department_id === dept.id) || [];
        const completedTasks = deptTasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
        const inProgressTasks = deptTasks.filter(t => t.status === 'InProgress').length;
        const pendingTasks = deptTasks.filter(t => !['Completed', 'Approved', 'InProgress', 'Rejected'].includes(t.status)).length;
        
        const deptTaskIds = deptTasks.map(t => t.id);
        const deptTimeEntries = timeEntries?.filter(te => deptTaskIds.includes(te.task_id)) || [];
        const totalTimeMinutes = deptTimeEntries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0);

        const employeeCount = profiles?.filter(p => p.department_id === dept.id).length || 0;

        return {
          id: dept.id,
          name: dept.name,
          totalTasks: deptTasks.length,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          completionRate: deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0,
          totalTimeMinutes,
          employeeCount,
          avgTasksPerEmployee: employeeCount > 0 ? Math.round((deptTasks.length / employeeCount) * 10) / 10 : 0
        };
      });

      setDepartmentStats(stats.filter(s => s.totalTasks > 0 || s.employeeCount > 0));
    } catch (error) {
      console.error('Error fetching department stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyComparison = async () => {
    setLoadingComparison(true);
    try {
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      if (!departments) return;

      const monthsData: MonthlyComparisonData[] = [];

      for (let i = comparisonMonths - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM yyyy', { locale: ar });

        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, department_id, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('task_id, duration_minutes')
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString());

        const deptStats = departments.map(dept => {
          const deptTasks = tasks?.filter(t => t.department_id === dept.id) || [];
          const completedTasks = deptTasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
          const deptTaskIds = deptTasks.map(t => t.id);
          const deptTimeEntries = timeEntries?.filter(te => deptTaskIds.includes(te.task_id)) || [];
          const totalTimeMinutes = deptTimeEntries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0);

          return {
            name: dept.name,
            totalTasks: deptTasks.length,
            completedTasks,
            completionRate: deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0,
            totalTimeMinutes
          };
        });

        monthsData.push({
          month: monthKey,
          monthLabel,
          departments: deptStats
        });
      }

      setMonthlyData(monthsData);
    } catch (error) {
      console.error('Error fetching monthly comparison:', error);
    } finally {
      setLoadingComparison(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  const handleExportPDF = () => {
    if (departmentStats.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const summaryStats = {
      totalTasks: departmentStats.reduce((sum, d) => sum + d.totalTasks, 0),
      totalCompleted: departmentStats.reduce((sum, d) => sum + d.completedTasks, 0),
      totalTime: departmentStats.reduce((sum, d) => sum + d.totalTimeMinutes, 0),
      avgCompletionRate: departmentStats.length > 0 
        ? Math.round(departmentStats.reduce((sum, d) => sum + d.completionRate, 0) / departmentStats.length)
        : 0
    };

    exportDepartmentReportPDF(departmentStats as DepartmentReportData[], monthLabel, summaryStats);
    toast.success("تم تصدير التقرير بنجاح");
  };

  const handleExportComparisonPDF = () => {
    if (monthlyData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const departmentNames = [...new Set(monthlyData.flatMap(m => m.departments.map(d => d.name)))];
    exportMonthlyComparisonPDF(monthlyData, departmentNames);
    toast.success("تم تصدير تقرير المقارنة بنجاح");
  };

  // Prepare chart data
  const tasksComparisonData = departmentStats.map(dept => ({
    name: dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name,
    مكتملة: dept.completedTasks,
    'قيد التنفيذ': dept.inProgressTasks,
    معلقة: dept.pendingTasks
  }));

  const completionRateData = departmentStats.map(dept => ({
    name: dept.name,
    'نسبة الإنجاز': dept.completionRate
  }));

  const timeDistributionData = departmentStats.map((dept, index) => ({
    name: dept.name.length > 12 ? dept.name.substring(0, 12) + '...' : dept.name,
    value: dept.totalTimeMinutes,
    fill: COLORS[index % COLORS.length]
  })).filter(d => d.value > 0);

  const radarData = departmentStats.map(dept => ({
    department: dept.name.length > 10 ? dept.name.substring(0, 10) + '...' : dept.name,
    'نسبة الإنجاز': dept.completionRate,
    'عدد المهام': Math.min(dept.totalTasks * 10, 100),
    'عدد الموظفين': Math.min(dept.employeeCount * 20, 100),
    'ساعات العمل': Math.min((dept.totalTimeMinutes / 60) * 5, 100)
  }));

  // Monthly comparison chart data
  const getComparisonLineData = () => {
    const departmentNames = [...new Set(monthlyData.flatMap(m => m.departments.map(d => d.name)))];
    return monthlyData.map(month => {
      const dataPoint: any = { month: month.monthLabel };
      departmentNames.forEach(deptName => {
        const dept = month.departments.find(d => d.name === deptName);
        dataPoint[deptName] = dept?.completionRate || 0;
      });
      return dataPoint;
    });
  };

  const getTasksComparisonLineData = () => {
    const departmentNames = [...new Set(monthlyData.flatMap(m => m.departments.map(d => d.name)))];
    return monthlyData.map(month => {
      const dataPoint: any = { month: month.monthLabel };
      departmentNames.forEach(deptName => {
        const dept = month.departments.find(d => d.name === deptName);
        dataPoint[deptName] = dept?.totalTasks || 0;
      });
      return dataPoint;
    });
  };

  const departmentNames = [...new Set(monthlyData.flatMap(m => m.departments.map(d => d.name)))];

  // Summary stats
  const totalTasks = departmentStats.reduce((sum, d) => sum + d.totalTasks, 0);
  const totalCompleted = departmentStats.reduce((sum, d) => sum + d.completedTasks, 0);
  const totalTime = departmentStats.reduce((sum, d) => sum + d.totalTimeMinutes, 0);
  const avgCompletionRate = departmentStats.length > 0 
    ? Math.round(departmentStats.reduce((sum, d) => sum + d.completionRate, 0) / departmentStats.length) 
    : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            تقارير أداء الأقسام
          </h1>
          <p className="page-subtitle">تحليل مفصل لأداء كل قسم مع رسوم بيانية مقارنة</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            التقرير الشهري
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            مقارنة شهرية
          </TabsTrigger>
        </TabsList>

        {/* Monthly Report Tab */}
        <TabsContent value="monthly" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="اختر الشهر" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير PDF
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المهام</p>
                    <p className="text-2xl font-bold">{totalTasks}</p>
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
                    <p className="text-sm text-muted-foreground">المهام المكتملة</p>
                    <p className="text-2xl font-bold">{totalCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الوقت</p>
                    <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">متوسط الإنجاز</p>
                    <p className="text-2xl font-bold">{avgCompletionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : departmentStats.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">لا توجد بيانات</h3>
                <p className="text-muted-foreground">لا توجد بيانات أداء للأقسام في هذا الشهر</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">مقارنة المهام حسب القسم</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksComparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="مكتملة" stackId="a" fill="hsl(var(--chart-2))" />
                          <Bar dataKey="قيد التنفيذ" stackId="a" fill="hsl(var(--chart-4))" />
                          <Bar dataKey="معلقة" stackId="a" fill="hsl(var(--chart-5))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نسبة الإنجاز لكل قسم</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={completionRateData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Bar dataKey="نسبة الإنجاز" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">توزيع ساعات العمل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {timeDistributionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={timeDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {timeDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatTime(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          لا توجد بيانات ساعات عمل
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">مقارنة شاملة للأقسام</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="department" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar name="نسبة الإنجاز" dataKey="نسبة الإنجاز" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                          <Radar name="عدد المهام" dataKey="عدد المهام" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    تفاصيل أداء الأقسام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4 font-medium">القسم</th>
                          <th className="text-center py-3 px-4 font-medium">الموظفين</th>
                          <th className="text-center py-3 px-4 font-medium">إجمالي المهام</th>
                          <th className="text-center py-3 px-4 font-medium">مكتملة</th>
                          <th className="text-center py-3 px-4 font-medium">قيد التنفيذ</th>
                          <th className="text-center py-3 px-4 font-medium">نسبة الإنجاز</th>
                          <th className="text-center py-3 px-4 font-medium">ساعات العمل</th>
                          <th className="text-center py-3 px-4 font-medium">متوسط المهام/موظف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departmentStats.map((dept, index) => (
                          <tr key={dept.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                            <td className="py-3 px-4 font-medium">{dept.name}</td>
                            <td className="text-center py-3 px-4">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {dept.employeeCount}
                              </span>
                            </td>
                            <td className="text-center py-3 px-4">{dept.totalTasks}</td>
                            <td className="text-center py-3 px-4">
                              <span className="text-green-600 font-medium">{dept.completedTasks}</span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className="text-blue-600 font-medium">{dept.inProgressTasks}</span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${dept.completionRate}%` }}
                                  />
                                </div>
                                <span className="font-medium">{dept.completionRate}%</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">{formatTime(dept.totalTimeMinutes)}</td>
                            <td className="text-center py-3 px-4">{dept.avgTasksPerEmployee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Monthly Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={String(comparisonMonths)} onValueChange={(v) => setComparisonMonths(Number(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="عدد الأشهر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">آخر 3 أشهر</SelectItem>
                <SelectItem value="6">آخر 6 أشهر</SelectItem>
                <SelectItem value="9">آخر 9 أشهر</SelectItem>
                <SelectItem value="12">آخر 12 شهر</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportComparisonPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير PDF
            </Button>
          </div>

          {loadingComparison ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : monthlyData.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">لا توجد بيانات</h3>
                <p className="text-muted-foreground">لا توجد بيانات للمقارنة الشهرية</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Completion Rate Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    تطور نسبة الإنجاز عبر الأشهر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getComparisonLineData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        {departmentNames.map((name, index) => (
                          <Line 
                            key={name}
                            type="monotone" 
                            dataKey={name} 
                            stroke={LINE_COLORS[index % LINE_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks Count Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    تطور عدد المهام عبر الأشهر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTasksComparisonLineData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {departmentNames.map((name, index) => (
                          <Bar 
                            key={name}
                            dataKey={name} 
                            fill={LINE_COLORS[index % LINE_COLORS.length]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ملخص الأداء لكل قسم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4 font-medium">القسم</th>
                          {monthlyData.map(m => (
                            <th key={m.month} className="text-center py-3 px-2 font-medium text-sm">
                              {m.monthLabel}
                            </th>
                          ))}
                          <th className="text-center py-3 px-4 font-medium bg-muted/50">المتوسط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departmentNames.map((deptName, index) => {
                          const avgRate = Math.round(
                            monthlyData.reduce((sum, m) => {
                              const dept = m.departments.find(d => d.name === deptName);
                              return sum + (dept?.completionRate || 0);
                            }, 0) / monthlyData.length
                          );
                          
                          return (
                            <tr key={deptName} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                              <td className="py-3 px-4 font-medium">{deptName}</td>
                              {monthlyData.map(m => {
                                const dept = m.departments.find(d => d.name === deptName);
                                const rate = dept?.completionRate || 0;
                                return (
                                  <td key={m.month} className="text-center py-3 px-2">
                                    <span className={`font-medium ${
                                      rate >= 80 ? 'text-green-600' : 
                                      rate >= 50 ? 'text-yellow-600' : 
                                      'text-red-600'
                                    }`}>
                                      {rate}%
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="text-center py-3 px-4 bg-muted/50">
                                <span className="font-bold">{avgRate}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
