import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Building2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface KanbanTask {
  id: string;
  task_number: number;
  title: string;
  description: string | null;
  department_id: string | null;
  assignee_id: string | null;
  level: string;
  status: string;
  priority: string;
  due_date: string | null;
  request_id: string;
  departments: { name: string } | null;
  assignee?: { full_name: string } | null;
}

interface KanbanCardProps {
  task: KanbanTask;
  isDragging?: boolean;
}

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

const levelLabels: Record<string, string> = {
  Executive: "تنفيذي",
  Supervisor: "مشرف",
  DeptHead: "رئيس قسم",
  Employee: "موظف",
};

export function KanbanCard({ task, isDragging }: KanbanCardProps) {
  const navigate = useNavigate();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("ar-SA", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !["Completed", "Approved"].includes(task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group",
        isDragging && "shadow-lg ring-2 ring-primary/50 opacity-90",
        isOverdue && "border-destructive/50"
      )}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Task Number & Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          TSK-{String(task.task_number).padStart(3, "0")}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            task.priority === "High" && "priority-high",
            task.priority === "Medium" && "priority-medium",
            task.priority === "Low" && "priority-low"
          )}
        >
          {priorityLabels[task.priority]}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm line-clamp-2 mb-3">{task.title}</h4>

      {/* Meta Info */}
      <div className="space-y-1.5">
        {/* Level */}
        <Badge variant="secondary" className="text-xs">
          {levelLabels[task.level] || task.level}
        </Badge>

        {/* Department */}
        {task.departments && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{task.departments.name}</span>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{task.assignee.full_name}</span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="w-3 h-3" />
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
