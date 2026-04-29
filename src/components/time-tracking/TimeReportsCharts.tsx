import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TaskSummary {
  task_id: string;
  task_title: string;
  user_count: number;
  total_minutes: number;
}

interface UserSummary {
  user_id: string;
  user_name: string;
  task_count: number;
  total_minutes: number;
}

interface DeptSummary {
  department_id: string;
  department_name: string;
  user_count: number;
  total_minutes: number;
}

interface TimeReportsChartsProps {
  taskSummary: TaskSummary[];
  userSummary: UserSummary[];
  deptSummary: DeptSummary[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

const formatHours = (minutes: number) => {
  const hours = (minutes / 60).toFixed(1);
  return `${hours}h`;
};

export function TimeReportsCharts({
  taskSummary,
  userSummary,
  deptSummary,
}: TimeReportsChartsProps) {
  // Prepare data for charts
  const taskChartData = taskSummary.slice(0, 8).map((t) => ({
    name: t.task_title.length > 15 ? t.task_title.substring(0, 15) + "..." : t.task_title,
    hours: Math.round((t.total_minutes / 60) * 10) / 10,
    users: t.user_count,
  }));

  const userChartData = userSummary.slice(0, 8).map((u) => ({
    name: u.user_name.length > 12 ? u.user_name.substring(0, 12) + "..." : u.user_name,
    hours: Math.round((u.total_minutes / 60) * 10) / 10,
    tasks: u.task_count,
  }));

  const deptChartData = deptSummary.map((d) => ({
    name: d.department_name,
    value: d.total_minutes,
    hours: Math.round((d.total_minutes / 60) * 10) / 10,
    users: d.user_count,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === "hours" ? "الساعات" : entry.name === "users" ? "المستخدمين" : "المهام"}:{" "}
              {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium">{data.name}</p>
          <p>{data.hours} ساعة</p>
          <p>{data.users} مستخدم</p>
        </div>
      );
    }
    return null;
  };

  if (taskSummary.length === 0 && userSummary.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">الرسوم البيانية التفاعلية</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="tasks">المهام</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
            <TabsTrigger value="departments">الأقسام</TabsTrigger>
          </TabsList>

          {/* Tasks Chart */}
          <TabsContent value="tasks">
            {taskChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `${v}h`} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="hours"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      name="hours"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </TabsContent>

          {/* Users Chart */}
          <TabsContent value="users">
            {userChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={userChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tickFormatter={(v) => `${v}h`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="hours"
                      fill="hsl(var(--info))"
                      radius={[4, 4, 0, 0]}
                      name="hours"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </TabsContent>

          {/* Departments Chart */}
          <TabsContent value="departments">
            {deptChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deptChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
