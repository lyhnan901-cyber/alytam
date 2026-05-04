import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MoreVertical, Eye, Calendar, User, Building2,
  Loader2, ArrowUpDown, List, LayoutGrid, CalendarDays, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskForm } from "@/components/forms/TaskForm";
import { TaskAssignmentForm } from "@/components/forms/TaskAssignmentForm";
import { TaskStatusForm } from "@/components/forms/TaskStatusForm";
import { TaskDateFilter, TaskDateFilterValue } from "@/components/tasks/TaskDateFilter";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay } from "date-fns";

interface Department {
  id: string;
  name: string;
}

interface Task {
  id: string;
  task_number: number;
  request_id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  assignee_id: string | null;
  level: string;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  departments: { name: string } | null;
  requests: { request_number: number } | null;
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  NotStarted: "لم يبدأ",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  PendingDeptHeadReview: "بانتظار مراجعة رئيس القسم",
  PendingSupervisorReview: "بانتظار مراجعة المشرف",
  PendingExecutiveReview: "بانتظار مراجعة المدير التنفيذي",
  PendingGMApproval: "بانتظار موافقة المدير العام",
  Approved: "معتمد",
  NeedRevision: "يحتاج تعديل",
  Rejected: "مرفوض",
};

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

const levelLabels: Record<string, string> = {
  Executive: "المدير التنفيذي",
  Supervisor: "المشرف",
  DeptHead: "رئيس القسم",
  Employee: "موظف",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<TaskDateFilterValue>({
    preset: null,
    dateFrom: null,
    dateTo: null,
    includeNoDueDate: false,
  });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignmentType, setAssignmentType] = useState<"department" | "employee" | "direct">("department");
  const { role, isGeneralManager } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canCreate = isGeneralManager || role === "ExecutiveManager";
  const canAssignDepartment = isGeneralManager || role === "Supervisor";
  const canAssignEmployee = isGeneralManager || role === "DepartmentHead";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, deptsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
            *,
            departments(name),
            requests(request_number)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (deptsRes.error) throw deptsRes.error;

      setTasks((tasksRes.data || []) as Task[]);
      setDepartments((deptsRes.data || []) as Department[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.task_number.toString().includes(searchQuery);
      
      // Status filter
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      
      // Department filter
      const matchesDepartment = departmentFilter === "all" || task.department_id === departmentFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter.preset !== null) {
        if (!task.due_date) {
          matchesDate = dateFilter.includeNoDueDate;
        } else {
          const taskDueDate = startOfDay(new Date(task.due_date));
          const from = dateFilter.dateFrom ? startOfDay(dateFilter.dateFrom) : null;
          const to = dateFilter.dateTo ? endOfDay(dateFilter.dateTo) : null;
          
          if (from && to) {
            matchesDate = taskDueDate >= from && taskDueDate <= to;
          } else if (from) {
            matchesDate = taskDueDate >= from;
          }
        }
      }
      
      return matchesSearch && matchesStatus && matchesDepartment && matchesDate;
    });
  }, [tasks, searchQuery, statusFilter, departmentFilter, dateFilter]);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleAssign = (task: Task, type: "department" | "employee" | "direct") => {
    setSelectedTask(task);
    setAssignmentType(type);
    setShowAssignForm(true);
  };

  const handleUpdateStatus = (task: Task) => {
    setSelectedTask(task);
    setShowStatusForm(true);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> المهام والأعمال
          </h1>
          <p className="page-subtitle">متابعة جميع مهام المؤسسة ومستويات التنفيذ</p>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg">
            <List className="w-4 h-4" /> جدول
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks/board")}>
            <LayoutGrid className="w-4 h-4" /> كانبان
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => navigate("/tasks/calendar")}>
            <CalendarDays className="w-4 h-4" /> تقويم
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="data-card">
        <div className="data-card-body space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث بالعنوان أو رقم المهمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="New">جديد</SelectItem>
              <SelectItem value="NotStarted">لم يبدأ</SelectItem>
              <SelectItem value="InProgress">قيد التنفيذ</SelectItem>
              <SelectItem value="Completed">مكتمل</SelectItem>
              <SelectItem value="PendingDeptHeadReview">بانتظار مراجعة رئيس القسم</SelectItem>
              <SelectItem value="Approved">معتمد</SelectItem>
              <SelectItem value="NeedRevision">يحتاج تعديل</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Date Filter */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">فلترة حسب تاريخ التسليم:</p>
          <TaskDateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto mobile-card-table">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد مهام
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم المهمة</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">القسم</TableHead>
                <TableHead className="text-right">المُعيّن إليه</TableHead>
                <TableHead className="text-right">المستوى</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">تاريخ التسليم</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        TSK-{String(task.task_number).padStart(3, "0")}
                      </span>
                      {task.requests && (
                        <p className="text-xs text-muted-foreground">
                          REQ-{String(task.requests.request_number).padStart(3, "0")}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{task.title}</TableCell>
                  <TableCell>
                    {task.departments ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {task.departments.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                <TableCell>
                    {task.assignee_id ? (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        معين
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {levelLabels[task.level] || task.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        task.status === "New" && "status-new",
                        task.status === "NotStarted" && "status-pending",
                        task.status === "InProgress" && "status-in-progress",
                        task.status === "Completed" && "status-completed",
                        task.status === "Approved" && "status-completed",
                        task.status === "NeedRevision" && "status-rejected",
                        task.status.includes("Pending") && "status-pending"
                      )}
                    >
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        task.priority === "High" && "priority-high",
                        task.priority === "Medium" && "priority-medium",
                        task.priority === "Low" && "priority-low"
                      )}
                    >
                      {priorityLabels[task.priority] || task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(task.due_date)}
                    </span>
                  </TableCell>
                  <TableCell className="p-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="min-w-[44px] min-h-[44px] w-11 h-11 touch-manipulation"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => handleUpdateStatus(task)}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          تحديث الحالة
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canAssignDepartment && task.level === "Supervisor" && task.status === "NotStarted" && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleAssign(task, "department")}
                          >
                            <Building2 className="w-4 h-4" />
                            تعيين للقسم
                          </DropdownMenuItem>
                        )}
                        {canAssignEmployee && task.level === "DeptHead" && task.status === "NotStarted" && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleAssign(task, "employee")}
                          >
                            <User className="w-4 h-4" />
                            تعيين للموظف
                          </DropdownMenuItem>
                        )}
                        {isGeneralManager && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleAssign(task, "direct")}
                          >
                            <User className="w-4 h-4" />
                            تعيين مباشر (GM)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Task Form Dialog */}
      {selectedTask && (
        <>
          <TaskForm
            open={showTaskForm}
            onClose={() => {
              setShowTaskForm(false);
              setSelectedTask(null);
            }}
            onSuccess={fetchData}
            requestId={selectedTask.request_id}
            task={selectedTask}
          />

          <TaskAssignmentForm
            open={showAssignForm}
            onClose={() => {
              setShowAssignForm(false);
              setSelectedTask(null);
            }}
            onSuccess={fetchData}
            taskId={selectedTask.id}
            assignmentType={assignmentType}
            currentDepartmentId={selectedTask.department_id || undefined}
          />

          <TaskStatusForm
            open={showStatusForm}
            onClose={() => {
              setShowStatusForm(false);
              setSelectedTask(null);
            }}
            onSuccess={fetchData}
            taskId={selectedTask.id}
            currentStatus={selectedTask.status}
            currentLevel={selectedTask.level}
          />
        </>
      )}
    </div>
  );
}
