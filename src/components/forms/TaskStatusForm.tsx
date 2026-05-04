import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { updateTaskStatus, approveTask, rejectTask } from "@/lib/workflow";
import { getBranchFlags } from "@/lib/branch-flags";

const statusFormSchema = z.object({
  status: z.string().min(1, "يجب اختيار الحالة"),
  notes: z.string().max(500).optional(),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

interface TaskStatusFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskId: string;
  currentStatus: string;
  currentLevel: string;
}

export function TaskStatusForm({
  open,
  onClose,
  onSuccess,
  taskId,
  currentStatus,
  currentLevel,
}: TaskStatusFormProps) {
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuth();
  const { toast } = useToast();

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      status: "",
      notes: "",
    },
  });

  const isGeneralManager = role === "GeneralManager";
  const { fourTierWorkflow } = getBranchFlags();

  // Determine available status options based on role and current status
  const getStatusOptions = () => {
    const options: { value: string; label: string }[] = [];

    // Employee actions
    if (role === "Employee" || isGeneralManager) {
      if (currentStatus === "NotStarted" && currentLevel === "Employee") {
        options.push({ value: "InProgress", label: "قيد التنفيذ" });
      }
      if (currentStatus === "NeedRevision") {
        options.push({ value: "InProgress", label: "قيد التنفيذ" });
      }
      if (currentStatus === "InProgress") {
        options.push({ value: "Completed", label: "مكتمل" });
      }
    }

    // Executive Manager actions
    if (role === "ExecutiveManager" || isGeneralManager) {
      if (currentStatus === "New" && currentLevel === "Executive") {
        if (fourTierWorkflow) {
          // في سلسلة الأربع طبقات تتجاوز المهمة طبقة المشرف وتذهب لرئيس القسم مباشرة.
          // التعيين الفعلي (اختيار القسم + رئيسه) يتم عبر زر "تعيين للقسم" في قائمة المهمة.
          options.push({ value: "AssignToDepartment", label: "تعيين لقسم" });
        } else {
          options.push({ value: "SendToSupervisor", label: "إرسال للمشرف" });
        }
      }
      if (currentStatus === "PendingExecutiveReview") {
        options.push({ value: "Approve", label: "اعتماد" });
      }
    }

    // Supervisor actions — مخفية تماماً في سلسلة الأربع طبقات.
    if (!fourTierWorkflow && (role === "Supervisor" || isGeneralManager)) {
      if (currentStatus === "NotStarted" && currentLevel === "Supervisor") {
        options.push({ value: "AssignToDepartment", label: "تعيين لقسم" });
      }
      if (currentStatus === "PendingSupervisorReview") {
        options.push({ value: "Approve", label: "اعتماد" });
      }
    }

    // Department Head actions
    if (role === "DepartmentHead" || isGeneralManager) {
      if (currentStatus === "NotStarted" && currentLevel === "DeptHead") {
        options.push({ value: "AssignToEmployee", label: "تعيين لكادر" });
      }
      if (currentStatus === "PendingDeptHeadReview") {
        options.push({ value: "Approve", label: "اعتماد" });
        options.push({ value: "Reject", label: "إرجاع للتعديل" });
      }
    }

    // General Manager final approval
    if (isGeneralManager && currentStatus === "PendingGMApproval") {
      options.push({ value: "Approve", label: "الموافقة النهائية" });
    }

    // Remove duplicates
    const uniqueOptions = options.filter((option, index, self) =>
      index === self.findIndex((o) => o.value === option.value)
    );

    return uniqueOptions;
  };

  const statusOptions = getStatusOptions();

  const onSubmit = async (values: StatusFormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      if (values.status === "Approve") {
        await approveTask(taskId, user.id, values.notes);
        toast({
          title: "تم اعتماد المهمة بنجاح",
        });
      } else if (values.status === "Reject") {
        if (!values.notes) {
          toast({
            variant: "destructive",
            title: "يجب إضافة ملاحظات",
            description: "عند إرجاع المهمة للتعديل، يجب توضيح السبب",
          });
          setLoading(false);
          return;
        }
        await rejectTask(taskId, user.id, values.notes);
        toast({
          title: "تم إرجاع المهمة للتعديل",
        });
      } else if (values.status === "SendToSupervisor") {
        // Executive Manager sends task to Supervisor
        await updateTaskStatus(
          taskId,
          "NotStarted",
          user.id,
          values.notes,
          "Supervisor"
        );
        toast({
          title: "تم إرسال المهمة للمشرف",
        });
      } else if (values.status === "AssignToDepartment") {
        // This should open the assignment form instead
        toast({
          title: "يرجى استخدام زر 'تعيين للقسم' من القائمة",
        });
        setLoading(false);
        return;
      } else if (values.status === "AssignToEmployee") {
        // يجب استخدام زر 'تعيين لكادر' من القائمة
        toast({ title: "يرجى استخدام زر 'تعيين لكادر' من القائمة" });
        setLoading(false);
        return;
      } else {
        await updateTaskStatus(
          taskId,
          values.status as any,
          user.id,
          values.notes
        );
        toast({
          title: "تم تحديث حالة المهمة بنجاح",
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الحالة",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تحديث حالة المهمة</DialogTitle>
          <DialogDescription>
            الحالة الحالية: {currentStatus}
          </DialogDescription>
        </DialogHeader>

        {statusOptions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            لا يمكنك تغيير حالة هذه المهمة في الوقت الحالي
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة الجديدة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ملاحظات {form.watch("status") === "Reject" && "(مطلوب)"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أضف ملاحظات..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                  style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
                >
                  {loading ? "جاري التحديث..." : "تحديث الحالة"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
