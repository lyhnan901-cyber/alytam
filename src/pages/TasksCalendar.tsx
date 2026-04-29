import { useNavigate } from "react-router-dom";
import { List, CalendarDays, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCalendar } from "@/components/calendar/TaskCalendar";

export default function TasksCalendar() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> تقويم المهام
          </h1>
          <p className="page-subtitle">عرض المهام حسب تاريخ التسليم مع إمكانية السحب لتغيير التاريخ</p>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks")}>
            <List className="w-4 h-4" /> جدول
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks/board")}>
            <LayoutGrid className="w-4 h-4" /> كانبان
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg">
            <CalendarDays className="w-4 h-4" /> تقويم
          </Button>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>أولوية عالية</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>أولوية متوسطة</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>أولوية منخفضة</span>
        </div>
      </div>

      {/* Calendar */}
      <TaskCalendar />
    </div>
  );
}
