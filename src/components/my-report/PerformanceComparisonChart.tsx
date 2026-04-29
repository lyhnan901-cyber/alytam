import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeriodData {
  label: string;
  completed: number;
  total: number;
  completionRate: number;
  timeMinutes: number;
}

interface PerformanceComparisonChartProps {
  data: PeriodData[];
  comparisonType: "weeks" | "months";
}

export function PerformanceComparisonChart({
  data,
  comparisonType,
}: PerformanceComparisonChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">
          لا توجد بيانات كافية للمقارنة. يحتاج النظام لفترتين على الأقل.
        </p>
      </div>
    );
  }

  // Calculate trend
  const currentPeriod = data[data.length - 1];
  const previousPeriod = data[data.length - 2];
  
  const completedChange = currentPeriod.completed - previousPeriod.completed;
  const rateChange = currentPeriod.completionRate - previousPeriod.completionRate;
  
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendText = (change: number, suffix: string = "") => {
    if (change > 0) return `+${change}${suffix}`;
    if (change < 0) return `${change}${suffix}`;
    return "بدون تغيير";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}د`;
    return `${hours}س`;
  };

  return (
    <div className="space-y-4">
      {/* Trend Summary */}
      <div className="flex items-center justify-end gap-4 text-sm">
        <div className="flex items-center gap-1">
          {getTrendIcon(completedChange)}
          <span className={cn(
            completedChange > 0 && "text-success",
            completedChange < 0 && "text-destructive"
          )}>
            {getTrendText(completedChange)} مهمة
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getTrendIcon(rateChange)}
          <span className={cn(
            rateChange > 0 && "text-success",
            rateChange < 0 && "text-destructive"
          )}>
            {getTrendText(Math.round(rateChange), "%")} إنجاز
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "Cairo", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "Cairo", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                completed: "مكتملة",
                total: "إجمالي",
                completionRate: "نسبة الإنجاز",
              };
              if (name === "completionRate") return [`${value}%`, labels[name]];
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
                total: "إجمالي المهام",
              };
              return <span style={{ fontFamily: "Cairo" }}>{labels[value] || value}</span>;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(199, 89%, 48%)"
            fillOpacity={1}
            fill="url(#colorTotal)"
            strokeWidth={2}
            name="total"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="hsl(142, 76%, 36%)"
            fillOpacity={1}
            fill="url(#colorCompleted)"
            strokeWidth={2}
            name="completed"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
        {data.map((period) => (
          <div key={period.label} className="text-center">
            <p className="text-sm font-medium text-muted-foreground">{period.label}</p>
            <p className="text-lg font-bold">{period.completed}/{period.total}</p>
            <p className="text-xs text-muted-foreground">{period.completionRate}% • {formatTime(period.timeMinutes)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
