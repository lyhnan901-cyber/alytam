import { useState, useEffect } from "react";
import { Target, Settings, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { startOfWeek, endOfWeek } from "date-fns";

interface WeeklyGoalWidgetProps {
  className?: string;
}

export function WeeklyGoalWidget({ className = "" }: WeeklyGoalWidgetProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(2400); // 40 hours default
  const [actualMinutes, setActualMinutes] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempHours, setTempHours] = useState("40");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      // Fetch goal
      const { data: goalData } = await supabase
        .from("weekly_time_goals")
        .select("target_minutes")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (goalData) {
        setGoalMinutes(goalData.target_minutes);
        setTempHours(String(Math.round(goalData.target_minutes / 60)));
      }

      // Fetch actual time this week
      const { data: timeData } = await supabase
        .from("time_entries")
        .select("duration_minutes")
        .eq("user_id", user!.id)
        .not("duration_minutes", "is", null)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString());

      const total = (timeData || []).reduce(
        (sum, entry) => sum + (entry.duration_minutes || 0),
        0
      );
      setActualMinutes(total);
    } catch (error) {
      console.error("Error fetching goal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveGoal = async () => {
    if (!user) return;

    const hours = parseFloat(tempHours);
    if (isNaN(hours) || hours <= 0 || hours > 168) {
      toast.error("يرجى إدخال عدد ساعات صالح (1-168)");
      return;
    }

    setSaving(true);
    try {
      const targetMinutes = Math.round(hours * 60);

      const { error } = await supabase
        .from("weekly_time_goals")
        .upsert(
          { user_id: user.id, target_minutes: targetMinutes },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setGoalMinutes(targetMinutes);
      setDialogOpen(false);
      toast.success("تم حفظ الهدف بنجاح");
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("فشل في حفظ الهدف");
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((actualMinutes / goalMinutes) * 100));
  const goalHours = Math.round(goalMinutes / 60);
  const actualHours = (actualMinutes / 60).toFixed(1);
  const remainingMinutes = Math.max(0, goalMinutes - actualMinutes);
  const remainingHours = (remainingMinutes / 60).toFixed(1);

  const getProgressColor = () => {
    if (progressPercent >= 100) return "bg-success";
    if (progressPercent >= 75) return "bg-primary";
    if (progressPercent >= 50) return "bg-warning";
    return "bg-muted-foreground";
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            هدف الأسبوع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          هدف الأسبوع
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديد هدف الأسبوع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  عدد ساعات العمل الأسبوعية المستهدفة
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={tempHours}
                    onChange={(e) => setTempHours(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">ساعة</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  الافتراضي: 40 ساعة (8 ساعات × 5 أيام)
                </p>
              </div>
              <Button onClick={saveGoal} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Check className="h-4 w-4 ml-2" />
                )}
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progressPercent * 3.02} 302`}
                strokeLinecap="round"
                className={progressPercent >= 100 ? "text-success" : "text-primary"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المسجل</span>
            <span className="font-medium">{actualHours} ساعة</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الهدف</span>
            <span className="font-medium">{goalHours} ساعة</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المتبقي</span>
            <span className={`font-medium ${progressPercent >= 100 ? "text-success" : ""}`}>
              {progressPercent >= 100 ? "مكتمل ✓" : `${remainingHours} ساعة`}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
