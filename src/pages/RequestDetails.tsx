import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Loader2,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle,
  FileText,
  History,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskForm } from "@/components/forms/TaskForm";
import { RequestCustomFields } from "@/components/requests/RequestCustomFields";
import { useToast } from "@/hooks/use-toast";

interface Request {
  id: string;
  request_number: number;
  client_name: string;
  request_type: string;
  channel: string;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  closed_at: string | null;
}

interface Task {
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
  created_at: string;
  departments: { name: string } | null;
}

interface TaskHistory {
  id: string;
  task_id: string;
  from_status: string | null;
  to_status: string;
  from_level: string | null;
  to_level: string | null;
  notes: string | null;
  created_at: string;
  changed_by: string;
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  Closed: "مغلق",
  NotStarted: "لم يبدأ",
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

const channelLabels: Record<string, string> = {
  whatsapp: "واتساب",
  phone: "مكالمة",
  email: "بريد إلكتروني",
  website_form: "نموذج موقع",
  referral: "إحالة",
  // Legacy support
  website: "موقع إلكتروني",
  in_person: "حضوري",
  walk_in: "حضور شخصي",
};

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const { role, isGeneralManager } = useAuth();
  const { toast } = useToast();

  const canCreateTask = isGeneralManager || role === "ExecutiveManager";

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch request
      const { data: requestData, error: requestError } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          departments(name)
        `)
        .eq("request_id", id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch history for all tasks
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map((t) => t.id);
        const { data: historyData, error: historyError } = await supabase
          .from("task_history")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false });

        if (historyError) throw historyError;
        setHistory(historyData || []);
      }
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
  }, [id]);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">الطلب غير موجود</h2>
        <Link to="/requests" className="text-primary hover:underline mt-2 inline-block">
          العودة للطلبات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/requests">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              طلب رقم REQ-{String(request.request_number).padStart(3, "0")}
            </h1>
            <p className="text-muted-foreground">{request.client_name}</p>
          </div>
        </div>
        {canCreateTask && request.status !== "Closed" && (
          <Button onClick={() => setShowTaskForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة مهمة
          </Button>
        )}
      </div>

      {/* Request Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نوع الطلب</p>
                <p className="font-medium">{request.request_type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge
                  variant="outline"
                  className={cn(
                    request.status === "New" && "status-new",
                    request.status === "InProgress" && "status-in-progress",
                    request.status === "Completed" && "status-completed",
                    request.status === "Closed" && "status-completed"
                  )}
                >
                  {statusLabels[request.status]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                <p className="font-medium text-sm">{formatDate(request.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأولوية</p>
                <Badge
                  variant="outline"
                  className={cn(
                    request.priority === "High" && "priority-high",
                    request.priority === "Medium" && "priority-medium",
                    request.priority === "Low" && "priority-low"
                  )}
                >
                  {priorityLabels[request.priority]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Marketing Fields */}
      <RequestCustomFields
        requestId={request.id}
        canEdit={canCreateTask}
        mode="edit"
      />

      {/* Notes */}
      {request.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{request.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            المهام ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لا توجد مهام بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم المهمة</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">المستوى</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ التسليم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      TSK-{String(task.task_number).padStart(3, "0")}
                    </TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>
                      {task.departments ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {task.departments.name}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{levelLabels[task.level]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          task.status === "Approved" && "status-completed",
                          task.status === "InProgress" && "status-in-progress",
                          task.status === "NeedRevision" && "status-rejected",
                          task.status.includes("Pending") && "status-pending"
                        )}
                      >
                        {statusLabels[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(task.due_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Task History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              سجل التغييرات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <div className="p-2 rounded-full bg-muted">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      تغيير الحالة من{" "}
                      <Badge variant="outline" className="mx-1">
                        {statusLabels[entry.from_status || ""] || entry.from_status || "جديد"}
                      </Badge>
                      إلى{" "}
                      <Badge variant="outline" className="mx-1">
                        {statusLabels[entry.to_status] || entry.to_status}
                      </Badge>
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Form */}
      {id && (
        <TaskForm
          open={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onSuccess={fetchData}
          requestId={id}
        />
      )}
    </div>
  );
}
