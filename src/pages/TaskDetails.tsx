import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  User,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskStatusForm } from "@/components/forms/TaskStatusForm";
import { TaskAssignmentForm } from "@/components/forms/TaskAssignmentForm";
import { TaskCustomFields } from "@/components/tasks/TaskCustomFields";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TimeTracker } from "@/components/tasks/TimeTracker";
import { RelatedDocs } from "@/components/tasks/RelatedDocs";
import { cn } from "@/lib/utils";

interface TaskData {
  id: string;
  task_number: number;
  title: string;
  description: string | null;
  status: string;
  level: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  notes: string | null;
  review_notes: string | null;
  created_at: string;
  completed_at: string | null;
  request_id: string;
  department_id: string | null;
  assignee_id: string | null;
  departments: { id: string; name: string } | null;
  requests: { id: string; request_number: number; client_name: string } | null;
  assignee: { id: string; full_name: string; email: string } | null;
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
  changer: { full_name: string } | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  uploaded_by: string;
  uploader: { full_name: string } | null;
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

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, isGeneralManager } = useAuth();

  const [task, setTask] = useState<TaskData | null>(null);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignmentType, setAssignmentType] = useState<"department" | "employee">("department");

  const canAssignDepartment = isGeneralManager || role === "Supervisor";
  const canAssignEmployee = isGeneralManager || role === "DepartmentHead";
  
  // Check if user can edit custom fields
  const canEditCustomFields = isGeneralManager || role === "ExecutiveManager" || role === "Supervisor" || 
    (role === "DepartmentHead" && task?.department_id) || 
    (user?.id && task?.assignee_id === user.id);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      // Fetch task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(`
          *,
          departments(id, name),
          requests(id, request_number, client_name)
        `)
        .eq("id", id)
        .single();

      if (taskError) throw taskError;

      // Fetch assignee profile separately
      let assignee = null;
      if (taskData.assignee_id) {
        const { data: assigneeData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", taskData.assignee_id)
          .single();
        assignee = assigneeData;
      }

      setTask({ ...taskData, assignee } as TaskData);

      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from("task_history")
        .select("*")
        .eq("task_id", id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Fetch changer profiles
      const historyWithChangers = await Promise.all(
        (historyData || []).map(async (h) => {
          const { data: changer } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", h.changed_by)
            .single();
          return { ...h, changer };
        })
      );

      setHistory(historyWithChangers as TaskHistory[]);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("attachments")
        .select("*")
        .eq("task_id", id)
        .order("created_at", { ascending: false });

      if (attachmentsError) throw attachmentsError;

      // Fetch uploader profiles
      const attachmentsWithUploaders = await Promise.all(
        (attachmentsData || []).map(async (a) => {
          const { data: uploader } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", a.uploaded_by)
            .single();
          return { ...a, uploader };
        })
      );

      setAttachments(attachmentsWithUploaders as Attachment[]);
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    if (status === "Approved" || status === "Completed") return CheckCircle;
    if (status === "Rejected" || status === "NeedRevision") return XCircle;
    if (status.includes("Pending")) return Clock;
    return ArrowUpDown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">المهمة غير موجودة</h2>
        <Button onClick={() => navigate("/tasks")}>العودة للمهام</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              TSK-{String(task.task_number).padStart(3, "0")}
            </h1>
            <Badge
              variant="outline"
              className={cn(
                task.status === "Approved" && "status-completed",
                task.status === "InProgress" && "status-in-progress",
                task.status === "NeedRevision" && "status-rejected",
                task.status.includes("Pending") && "status-pending"
              )}
            >
              {statusLabels[task.status] || task.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{task.title}</p>
        </div>
        <Button onClick={() => setShowStatusForm(true)}>
          <ArrowUpDown className="w-4 h-4 ml-2" />
          تحديث الحالة
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Info */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المهمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <h4 className="font-medium mb-2">الوصف</h4>
                  <p className="text-muted-foreground">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">الطلب:</span>
                  {task.requests ? (
                    <Link
                      to={`/requests/${task.requests.id}`}
                      className="text-primary hover:underline"
                    >
                      REQ-{String(task.requests.request_number).padStart(3, "0")}
                    </Link>
                  ) : (
                    "-"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">القسم:</span>
                  <span>{task.departments?.name || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">المُعيّن إليه:</span>
                  <span>{task.assignee?.full_name || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">تاريخ التسليم:</span>
                  <span>{formatDate(task.due_date)}</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">الأولوية</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1",
                      task.priority === "High" && "priority-high",
                      task.priority === "Medium" && "priority-medium",
                      task.priority === "Low" && "priority-low"
                    )}
                  >
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستوى</p>
                  <Badge variant="secondary" className="mt-1">
                    {levelLabels[task.level]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="text-sm mt-1">{formatDate(task.created_at)}</p>
                </div>
              </div>

              {task.review_notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">ملاحظات المراجعة</h4>
                    <p className="text-muted-foreground bg-muted p-3 rounded-lg">
                      {task.review_notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                سجل التغييرات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا يوجد سجل تغييرات
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item, index) => {
                    const StatusIcon = getStatusIcon(item.to_status);
                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              item.to_status === "Approved" && "bg-success/10 text-success",
                              item.to_status === "Rejected" && "bg-destructive/10 text-destructive",
                              item.to_status === "NeedRevision" && "bg-warning/10 text-warning",
                              !["Approved", "Rejected", "NeedRevision"].includes(item.to_status) &&
                                "bg-primary/10 text-primary"
                            )}
                          >
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          {index < history.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {item.from_status
                                  ? `${statusLabels[item.from_status]} → ${statusLabels[item.to_status]}`
                                  : statusLabels[item.to_status]}
                              </p>
                              {item.from_level && item.to_level && item.from_level !== item.to_level && (
                                <p className="text-sm text-muted-foreground">
                                  المستوى: {levelLabels[item.from_level]} → {levelLabels[item.to_level]}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            بواسطة: {item.changer?.full_name || "غير معروف"}
                          </p>
                          {item.notes && (
                            <p className="text-sm bg-muted p-2 rounded mt-2">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <TaskCustomFields
            taskId={task.id}
            canEdit={!!canEditCustomFields}
            onUpdate={fetchData}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowStatusForm(true)}
              >
                <ArrowUpDown className="w-4 h-4 ml-2" />
                تحديث الحالة
              </Button>
              {canAssignDepartment && task.level === "Supervisor" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setAssignmentType("department");
                    setShowAssignForm(true);
                  }}
                >
                  <Building2 className="w-4 h-4 ml-2" />
                  تعيين للقسم
                </Button>
              )}
              {canAssignEmployee && task.level === "DeptHead" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setAssignmentType("employee");
                    setShowAssignForm(true);
                  }}
                >
                  <User className="w-4 h-4 ml-2" />
                  تعيين للموظف
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                المرفقات ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  لا توجد مرفقات
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            // Extract file path from URL
                            const url = new URL(attachment.file_url);
                            const pathParts = url.pathname.split('/storage/v1/object/public/task-attachments/');
                            const filePath = pathParts[1] || attachment.file_url;
                            
                            // Create signed URL (valid for 1 hour)
                            const { data, error } = await supabase.storage
                              .from('task-attachments')
                              .createSignedUrl(decodeURIComponent(filePath), 3600);
                            
                            if (error) throw error;
                            
                            // Open in new tab
                            window.open(data.signedUrl, '_blank');
                          } catch (error: any) {
                            toast({
                              variant: "destructive",
                              title: "خطأ في تحميل الملف",
                              description: error.message,
                            });
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              {/* File Upload */}
              <div className="space-y-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user?.id || !task) return;

                    setUploading(true);
                    try {
                      const fileExt = file.name.split('.').pop();
                      const filePath = `${user.id}/${task.id}/${Date.now()}.${fileExt}`;
                      
                      // Upload to storage
                      const { error: uploadError } = await supabase.storage
                        .from('task-attachments')
                        .upload(filePath, file);

                      if (uploadError) throw uploadError;

                      // Store the file path (not public URL) for signed URL generation later
                      const fileStoragePath = filePath;

                      // Save attachment record with storage path
                      const { error: insertError } = await supabase
                        .from('attachments')
                        .insert({
                          task_id: task.id,
                          file_name: file.name,
                          file_url: `https://drukmhjkhqkmbovdpsfv.supabase.co/storage/v1/object/public/task-attachments/${fileStoragePath}`,
                          file_type: file.type,
                          file_size: file.size,
                          uploaded_by: user.id,
                        });

                      if (insertError) throw insertError;

                      toast({
                        title: "تم رفع الملف",
                        description: file.name,
                      });

                      fetchData();
                    } catch (error: any) {
                      toast({
                        variant: "destructive",
                        title: "خطأ في رفع الملف",
                        description: error.message,
                      });
                    } finally {
                      setUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 ml-2" />
                  )}
                  {uploading ? "جاري الرفع..." : "رفع مرفق"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  الحد الأقصى: 10MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <TaskComments
            taskId={task.id}
            taskInfo={{
              assignee_id: task.assignee_id,
              department_id: task.department_id,
              level: task.level,
              title: task.title,
            }}
          />

          {/* Time Tracker */}
          <TimeTracker taskId={task.id} />

          {/* Related Docs */}
          <RelatedDocs departmentId={task.department_id} />
        </div>
      </div>

      {/* Status Form */}
      <TaskStatusForm
        open={showStatusForm}
        onClose={() => setShowStatusForm(false)}
        onSuccess={fetchData}
        taskId={task.id}
        currentStatus={task.status}
        currentLevel={task.level}
      />

      {/* Assignment Form */}
      <TaskAssignmentForm
        open={showAssignForm}
        onClose={() => setShowAssignForm(false)}
        onSuccess={fetchData}
        taskId={task.id}
        assignmentType={assignmentType}
        currentDepartmentId={task.department_id || undefined}
      />
    </div>
  );
}
