import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailyProgress {
  date: string;
  label: string;
  completed: number;
  remaining: number;
  timeMinutes: number;
}

interface TaskProgressChartProps {
  data: DailyProgress[];
}

export function TaskProgressChart({ data }: TaskProgressChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">التقدم الزمني</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">لا توجد بيانات في هذه الفترة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">التقدم الزمني</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis
              dataKey="label"
              type="category"
              width={80}
              tick={{ fontFamily: "Cairo", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  completed: "مكتملة",
                  remaining: "متبقية",
                };
                return [value, labels[name] || name];
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontFamily: "Cairo",
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  completed: "مكتملة",
                  remaining: "متبقية",
                };
                return <span style={{ fontFamily: "Cairo" }}>{labels[value] || value}</span>;
              }}
            />
            <Bar
              dataKey="completed"
              fill="hsl(142, 76%, 36%)"
              name="completed"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="remaining"
              fill="hsl(38, 92%, 50%)"
              name="remaining"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
