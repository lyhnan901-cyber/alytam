import { useState, useEffect, useRef } from "react";
import { Play, Square, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { triggerGoalCheck } from "@/lib/goal-notifications";
import { logTimeLogged } from "@/lib/activity-logger";

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface TimeTrackerProps {
  taskId: string;
}

export function TimeTracker({ taskId }: TimeTrackerProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEntries();
  }, [taskId]);

  useEffect(() => {
    if (activeEntry) {
      const startTime = new Date(activeEntry.start_time).getTime();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeEntry]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      
      // Check if current user has an active entry
      const myActiveEntry = data?.find(
        (e) => e.user_id === user?.id && !e.end_time
      );
      setActiveEntry(myActiveEntry || null);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          task_id: taskId,
          user_id: user.id,
          start_time: new Date().toISOString(),
        })
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .single();

      if (error) throw error;

      setActiveEntry(data);
      setEntries((prev) => [data, ...prev]);
      toast.success("تم بدء تسجيل الوقت");
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("فشل في بدء تسجيل الوقت");
    }
  };

  const stopTimer = async () => {
    if (!activeEntry || !user) return;

    try {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          notes: notes || null,
        })
        .eq("id", activeEntry.id);

      if (error) throw error;

      setActiveEntry(null);
      setNotes("");
      fetchEntries();
      toast.success("تم إيقاف تسجيل الوقت");

      // Log activity
      await logTimeLogged(user.id, taskId, "", durationMinutes);

      // Trigger goal check for smart notifications
      triggerGoalCheck(user.id);
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("فشل في إيقاف تسجيل الوقت");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ""}`;
    }
    return `${mins} دقيقة`;
  };

  const totalDuration = entries
    .filter((e) => e.duration_minutes)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تتبع الوقت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تتبع الوقت
          </div>
          {totalDuration > 0 && (
            <Badge variant="secondary">
              المجموع: {formatMinutes(totalDuration)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          {activeEntry ? (
            <>
              <div className="flex-1">
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatDuration(elapsedTime)}
                </div>
                <Textarea
                  placeholder="أضف ملاحظة (اختياري)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 h-16 resize-none"
                />
              </div>
              <Button
                onClick={stopTimer}
                variant="destructive"
                size="lg"
                className="h-14 w-14"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 text-muted-foreground">
                اضغط على زر البدء لتسجيل الوقت
              </div>
              <Button
                onClick={startTimer}
                size="lg"
                className="h-14 w-14 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Time Entries List */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              سجلات الوقت
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-3 bg-background border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {entry.profiles?.full_name || "مستخدم"}
                      </span>
                      {!entry.end_time && (
                        <Badge variant="outline" className="text-green-600">
                          جاري
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(entry.start_time), "d MMM yyyy - HH:mm", {
                        locale: ar,
                      })}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    {entry.duration_minutes ? (
                      <Badge>{formatMinutes(entry.duration_minutes)}</Badge>
                    ) : (
                      <Badge variant="outline">-</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && !activeEntry && (
          <p className="text-center text-muted-foreground py-4">
            لا توجد سجلات وقت لهذه المهمة
          </p>
        )}
      </CardContent>
    </Card>
  );
}
