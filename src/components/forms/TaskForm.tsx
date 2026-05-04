import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createDirectAssignedTask,
  directAssignableRoles,
} from "@/lib/workflow";

const taskSchema = z
  .object({
    title: z.string().min(2, "عنوان المهمة مطلوب").max(200),
    description: z.string().max(1000).optional(),
    priority: z.enum(["High", "Medium", "Low"]),
    due_date: z.string().optional(),
    notes: z.string().max(1000).optional(),
    direct_assign: z.boolean().optional(),
    department_id: z.string().optional(),
    assignee_id: z.string().optional(),
  })
  .refine(
    (v) => !v.direct_assign || (v.department_id && v.assignee_id),
    {
      message: "يجب اختيار القسم والشخص المعيَّن عند تفعيل التعيين المباشر",
      path: ["assignee_id"],
    }
  );

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requestId: string;
  task?: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    notes: string | null;
  };
}

const priorities = [
  { value: "High", label: "عالي" },
  { value: "Medium", label: "متوسط" },
  { value: "Low", label: "منخفض" },
];

interface DepartmentOption {
  id: string;
  name: string;
}

interface AssigneeOption {
  id: string;
  full_name: string;
}

export function TaskForm({ open, onClose, onSuccess, requestId, task }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const { user, isGeneralManager } = useAuth();
  const { toast } = useToast();
  const isEditing = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      priority: (task?.priority as "High" | "Medium" | "Low") || "Medium",
      due_date: task?.due_date || "",
      notes: task?.notes || "",
      direct_assign: false,
      department_id: undefined,
      assignee_id: undefined,
    },
  });

  const directAssign = form.watch("direct_assign");
  const selectedDept = form.watch("department_id");

  // Load departments when GM toggles direct-assign on a new task
  useEffect(() => {
    if (!isGeneralManager || isEditing || !directAssign) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (!cancelled && data) setDepartments(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isGeneralManager, isEditing, directAssign]);

  // Load assignees when a department is picked. Only users whose role is in
  // the execution chain (Executive/Supervisor/DeptHead/Employee) are listed —
  // GeneralManager and CustomerService cannot receive a direct task because
  // they have no matching task level.
  useEffect(() => {
    if (!directAssign || !selectedDept) {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", directAssignableRoles as unknown as string[]);
      const allowedIds = (roleRows ?? []).map((r) => r.user_id);
      if (allowedIds.length === 0) {
        if (!cancelled) setAssignees([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department_id", selectedDept)
        .in("id", allowedIds)
        .order("full_name");
      if (!cancelled && data) setAssignees(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [directAssign, selectedDept]);

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        priority: task.priority as "High" | "Medium" | "Low",
        due_date: task.due_date || "",
        notes: task.notes || "",
      });
    }
  }, [task, form]);

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: values.title,
            description: values.description,
            priority: values.priority,
            due_date: values.due_date || null,
            notes: values.notes,
          })
          .eq("id", task.id);

        if (error) throw error;

        toast({
          title: "تم تحديث المهمة بنجاح",
        });
      } else if (
        values.direct_assign &&
        isGeneralManager &&
        values.assignee_id &&
        values.department_id
      ) {
        // GM-only: create task already assigned directly to a chosen user.
        // Delegated to createDirectAssignedTask so notifications, activity
        // logging, and automations all fire (mirrors createInitialTask).
        await createDirectAssignedTask({
          requestId,
          title: values.title,
          description: values.description,
          priority: values.priority,
          dueDate: values.due_date || null,
          notes: values.notes,
          departmentId: values.department_id,
          assigneeId: values.assignee_id,
          createdBy: user.id,
        });

        toast({
          title: "تم إنشاء المهمة وتعيينها مباشرة بنجاح",
        });
      } else {
        const { error } = await supabase.from("tasks").insert({
          request_id: requestId,
          title: values.title,
          description: values.description,
          priority: values.priority,
          due_date: values.due_date || null,
          notes: values.notes,
          level: "Executive",
          status: "New",
          assigned_by: user.id,
        });

        if (error) throw error;

        toast({
          title: "تم إنشاء المهمة بنجاح",
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isEditing ? "خطأ في تحديث المهمة" : "خطأ في إنشاء المهمة",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "تعديل المهمة" : "إنشاء مهمة جديدة"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان المهمة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: متابعة كفالة اليتيم أحمد لشهر يناير" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أدخل وصف المهمة..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأولوية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ التسليم</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أضف أي ملاحظات إضافية..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isGeneralManager && !isEditing && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <FormField
                  control={form.control}
                  name="direct_assign"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={(checked) => {
                            field.onChange(!!checked);
                            if (!checked) {
                              form.setValue("department_id", undefined);
                              form.setValue("assignee_id", undefined);
                            }
                          }}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">
                        تعيين مباشر للكادر (تخطّي التسلسل الهرمي)
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {directAssign && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("assignee_id", undefined);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر القسم" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الشخص المعيَّن</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedDept}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الشخص" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assignees.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
              >
                {loading
                  ? isEditing ? "جاري التحديث..." : "جاري الإنشاء..."
                  : isEditing ? "تحديث المهمة" : "حفظ المهمة"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
