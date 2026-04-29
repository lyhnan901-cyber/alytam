import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { statusCategories, TaskStatusCategory } from "./TaskStatusFilter";

interface TaskDistributionChartProps {
  data: Record<TaskStatusCategory, number>;
}

const COLORS: Record<TaskStatusCategory, string> = {
  completed: "hsl(142, 76%, 36%)",
  inProgress: "hsl(38, 92%, 50%)",
  pending: "hsl(199, 89%, 48%)",
  notStarted: "hsl(220, 10%, 46%)",
};

export function TaskDistributionChart({ data }: TaskDistributionChartProps) {
  const chartData = (Object.entries(data) as [TaskStatusCategory, number][])
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: statusCategories[key].label,
      value,
      color: COLORS[key],
    }));

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">توزيع المهام حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">لا توجد مهام في هذه الفترة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">توزيع المهام حسب الحالة</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} مهمة`, "العدد"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontFamily: "Cairo",
              }}
            />
            <Legend
              formatter={(value) => <span style={{ fontFamily: "Cairo" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
