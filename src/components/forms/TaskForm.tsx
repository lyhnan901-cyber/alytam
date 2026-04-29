import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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

const taskSchema = z.object({
  title: z.string().min(2, "عنوان المهمة مطلوب").max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["High", "Medium", "Low"]),
  due_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

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

export function TaskForm({ open, onClose, onSuccess, requestId, task }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
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
    },
  });

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
