import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { "ar-SA": arSA };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 6 }),
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

interface CalendarTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  priority: string;
  status: string;
  assignee_id: string | null;
}

const priorityColors: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

export function TaskCalendar() {
  const [events, setEvents] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, role, isGeneralManager } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canEditTask = useCallback((task: CalendarTask): boolean => {
    if (!profile) return false;
    if (isGeneralManager) return true;
    if (role === "ExecutiveManager" || role === "Supervisor") return true;
    if (role === "DepartmentHead") return true;
    if (task.assignee_id === profile.id) return true;
    return false;
  }, [profile, role, isGeneralManager]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority, status, assignee_id")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;

      const calendarEvents = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        priority: task.priority,
        status: task.status,
        assignee_id: task.assignee_id,
      }));

      setEvents(calendarEvents);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب المهام",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleEventDrop = async ({ event, start }: { event: CalendarTask; start: Date }) => {
    if (!canEditTask(event)) {
      toast({
        variant: "destructive",
        title: "غير مسموح",
        description: "ليس لديك صلاحية تعديل تاريخ هذه المهمة",
      });
      return;
    }

    // Optimistically update
    setEvents(prev =>
      prev.map(e =>
        e.id === event.id
          ? { ...e, start, end: start }
          : e
      )
    );

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: format(start, "yyyy-MM-dd") })
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: `تم تغيير تاريخ التسليم إلى ${format(start, "dd/MM/yyyy")}`,
      });
    } catch (error: any) {
      fetchTasks();
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message,
      });
    }
  };

  const handleSelectEvent = (event: CalendarTask) => {
    navigate(`/tasks/${event.id}`);
  };

  const eventStyleGetter = (event: CalendarTask) => {
    const backgroundColor = priorityColors[event.priority] || "#6b7280";
    const isCompleted = ["Completed", "Approved"].includes(event.status);

    return {
      style: {
        backgroundColor,
        opacity: isCompleted ? 0.6 : 1,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "12px",
        padding: "2px 6px",
      },
    };
  };

  const messages = {
    today: "اليوم",
    previous: "السابق",
    next: "التالي",
    month: "شهر",
    week: "أسبوع",
    day: "يوم",
    agenda: "الأجندة",
    date: "التاريخ",
    time: "الوقت",
    event: "المهمة",
    noEventsInRange: "لا توجد مهام في هذه الفترة",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-card rounded-xl p-4" dir="rtl">
      <style>
        {`
          .rbc-calendar {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
          }
          .rbc-header {
            padding: 8px;
            font-weight: 600;
            background: hsl(var(--muted));
            border-color: hsl(var(--border));
          }
          .rbc-month-view, .rbc-time-view {
            border-color: hsl(var(--border));
          }
          .rbc-day-bg + .rbc-day-bg,
          .rbc-month-row + .rbc-month-row {
            border-color: hsl(var(--border));
          }
          .rbc-off-range-bg {
            background: hsl(var(--muted) / 0.3);
          }
          .rbc-today {
            background: hsl(var(--primary) / 0.1);
          }
          .rbc-toolbar {
            margin-bottom: 16px;
            flex-direction: row-reverse;
          }
          .rbc-toolbar button {
            color: hsl(var(--foreground));
            border-color: hsl(var(--border));
            padding: 6px 12px;
            border-radius: 6px;
          }
          .rbc-toolbar button:hover {
            background: hsl(var(--muted));
          }
          .rbc-toolbar button.rbc-active {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
          }
          .rbc-event {
            cursor: pointer;
          }
          .rbc-event:focus {
            outline: 2px solid hsl(var(--ring));
          }
        `}
      </style>
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onEventDrop={handleEventDrop as any}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture="ar-SA"
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        defaultView={Views.MONTH}
        rtl
        draggableAccessor={(event: CalendarTask) => canEditTask(event)}
      />
    </div>
  );
}
