import { useNavigate } from "react-router-dom";
import { List, CalendarDays, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function TasksBoard() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> لوحة المهام (كانبان)
          </h1>
          <p className="page-subtitle">عرض وإدارة المهام بنظام السحب والإفلات</p>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks")}>
            <List className="w-4 h-4" /> جدول
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg">
            <LayoutGrid className="w-4 h-4" /> كانبان
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks/calendar")}>
            <CalendarDays className="w-4 h-4" /> تقويم
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="data-card">
        <div className="data-card-body">
          <KanbanBoard />
        </div>
      </div>
    </div>
  );
}
