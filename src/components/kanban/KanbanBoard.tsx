import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Loader2, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus } from "@/lib/workflow";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, KanbanTask } from "./KanbanCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColumns = [
  { id: "New", title: "جديد", color: "bg-blue-500" },
  { id: "NotStarted", title: "لم يبدأ", color: "bg-slate-400" },
  { id: "InProgress", title: "قيد التنفيذ", color: "bg-amber-500" },
  { id: "Completed", title: "مكتمل", color: "bg-emerald-500" },
  { id: "PendingDeptHeadReview", title: "بانتظار رئيس القسم", color: "bg-purple-500" },
  { id: "PendingSupervisorReview", title: "بانتظار المشرف", color: "bg-indigo-500" },
  { id: "PendingExecutiveReview", title: "بانتظار التنفيذي", color: "bg-cyan-500" },
  { id: "PendingGMApproval", title: "بانتظار المدير العام", color: "bg-pink-500" },
  { id: "Approved", title: "معتمد", color: "bg-green-600" },
  { id: "NeedRevision", title: "يحتاج تعديل", color: "bg-orange-500" },
  { id: "Rejected", title: "مرفوض", color: "bg-red-500" },
];

const priorityOptions = [
  { value: "High", label: "عالي" },
  { value: "Medium", label: "متوسط" },
  { value: "Low", label: "منخفض" },
];

// Allowed transitions per role and task level
const allowedTransitions: Record<string, Record<string, string[]>> = {
  GeneralManager: {
    "*": ["New", "NotStarted", "InProgress", "Completed", "PendingDeptHeadReview", "PendingSupervisorReview", "PendingExecutiveReview", "PendingGMApproval", "Approved", "NeedRevision", "Rejected"],
  },
  ExecutiveManager: {
    Executive: ["New", "NotStarted"],
    "*": ["PendingExecutiveReview", "PendingGMApproval"],
  },
  Supervisor: {
    Supervisor: ["NotStarted"],
    "*": ["PendingSupervisorReview", "PendingExecutiveReview"],
  },
  DepartmentHead: {
    DeptHead: ["NotStarted"],
    "*": ["PendingDeptHeadReview", "PendingSupervisorReview", "NeedRevision"],
  },
  Employee: {
    Employee: ["NotStarted", "InProgress", "Completed", "NeedRevision"],
  },
};

interface Department {
  id: string;
  name: string;
}

interface Assignee {
  id: string;
  full_name: string;
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  
  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  
  const { profile, role, isGeneralManager } = useAuth();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          departments(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch assignee names
      const assigneeIds = [...new Set((data || []).map(t => t.assignee_id).filter(Boolean))];
      let assigneeMap: Record<string, { full_name: string }> = {};
      
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds);
        
        if (profiles) {
          assigneeMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string }>);
          
          // Set assignees for filter dropdown
          setAssignees(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
        }
      }

      const tasksWithAssignee = (data || []).map(t => ({
        ...t,
        assignee: t.assignee_id ? assigneeMap[t.assignee_id] : null,
      }));

      setTasks(tasksWithAssignee as KanbanTask[]);
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

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    if (data) setDepartments(data);
  };

  useEffect(() => {
    fetchTasks();
    fetchDepartments();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (departmentFilter !== "all" && task.department_id !== departmentFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== "all" && task.assignee_id !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, departmentFilter, priorityFilter, assigneeFilter]);

  const activeFiltersCount = [departmentFilter, priorityFilter, assigneeFilter].filter(f => f !== "all").length;

  const clearFilters = () => {
    setDepartmentFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
  };

  const canTransition = (task: KanbanTask, newStatus: string): boolean => {
    if (!role) return false;
    if (isGeneralManager) return true;

    const roleTransitions = allowedTransitions[role];
    if (!roleTransitions) return false;

    // Check level-specific transitions
    const levelTransitions = roleTransitions[task.level] || [];
    const wildcardTransitions = roleTransitions["*"] || [];
    
    const allowed = [...levelTransitions, ...wildcardTransitions];
    return allowed.includes(newStatus);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (!task || task.status === newStatus) return;

    // Check if transition is allowed
    if (!canTransition(task, newStatus)) {
      toast({
        variant: "destructive",
        title: "غير مسموح",
        description: "ليس لديك صلاحية نقل المهمة إلى هذه الحالة",
      });
      return;
    }

    // Optimistically update UI
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      await updateTaskStatus(
        taskId,
        newStatus as any,
        profile?.id || "",
        undefined
      );

      toast({
        title: "تم التحديث",
        description: `تم نقل المهمة إلى "${statusColumns.find(c => c.id === newStatus)?.title}"`,
      });
    } catch (error: any) {
      // Revert on error
      fetchTasks();
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message,
      });
    }
  };

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">فلترة:</span>
        </div>

        {/* Department Filter */}
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="الأولوية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأولويات</SelectItem>
            {priorityOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="المُعيّن إليه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            {assignees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Filters & Clear */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 mr-auto">
            <Badge variant="secondary" className="gap-1">
              {activeFiltersCount} فلتر نشط
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <X className="w-3 h-3" />
              مسح الفلاتر
            </Button>
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-muted-foreground mr-auto">
          {filteredTasks.length} من {tasks.length} مهمة
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {statusColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByStatus(column.id)}
              color={column.color}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
