import { useState, useEffect } from "react";
import { TrendingUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, subWeeks, format, addWeeks } from "date-fns";
import { ar } from "date-fns/locale";

interface WeekData {
  week: string;
  weekLabel: string;
  hours: number;
  goal: number;
  percent: number;
}

interface WeeklyPerformanceChartProps {
  className?: string;
  userId?: string;
  weeksCount?: number;
}

export function WeeklyPerformanceChart({
  className = "",
  userId,
  weeksCount = 8,
}: WeeklyPerformanceChartProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeekData[]>([]);
  const [offset, setOffset] = useState(0);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchData();
    }
  }, [targetUserId, offset, weeksCount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const weeks: WeekData[] = [];

      // Fetch user's goal
      const { data: goalData } = await supabase
        .from("weekly_time_goals")
        .select("target_minutes")
        .eq("user_id", targetUserId!)
        .maybeSingle();

      const goalMinutes = goalData?.target_minutes || 2400;
      const goalHours = goalMinutes / 60;

      // Generate weeks
      for (let i = weeksCount - 1 + offset; i >= offset; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 0 });

        // Fetch time for this week
        const { data: timeData } = await supabase
          .from("time_entries")
          .select("duration_minutes")
          .eq("user_id", targetUserId!)
          .not("duration_minutes", "is", null)
          .gte("start_time", weekStart.toISOString())
          .lte("start_time", weekEnd.toISOString());

        const totalMinutes = (timeData || []).reduce(
          (sum, entry) => sum + (entry.duration_minutes || 0),
          0
        );
        const hours = Math.round((totalMinutes / 60) * 10) / 10;
        const percent = Math.round((hours / goalHours) * 100);

        weeks.push({
          week: weekStart.toISOString(),
          weekLabel: format(weekStart, "d MMM", { locale: ar }),
          hours,
          goal: goalHours,
          percent,
        });
      }

      setData(weeks);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-primary">الساعات: {data.hours}س</p>
          <p className="text-muted-foreground">الهدف: {data.goal}س</p>
          <p className={data.percent >= 100 ? "text-success" : "text-warning"}>
            الإنجاز: {data.percent}%
          </p>
        </div>
      );
    }
    return null;
  };

  const avgHours =
    data.length > 0
      ? Math.round((data.reduce((sum, d) => sum + d.hours, 0) / data.length) * 10) / 10
      : 0;

  const trend =
    data.length >= 2
      ? data[data.length - 1].hours - data[0].hours
      : 0;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            مقارنة الأداء الأسبوعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            مقارنة الأداء الأسبوعي
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            متوسط: {avgHours}س/أسبوع |{" "}
            <span className={trend >= 0 ? "text-success" : "text-destructive"}>
              {trend >= 0 ? "↗" : "↘"} {Math.abs(trend).toFixed(1)}س
            </span>
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffset((o) => o + weeksCount)}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffset((o) => Math.max(0, o - weeksCount))}
            disabled={loading || offset === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}س`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (value === "hours" ? "الساعات" : "الهدف")}
                />
                <ReferenceLine
                  y={data[0]?.goal || 40}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label={{ value: "الهدف", position: "right", fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
