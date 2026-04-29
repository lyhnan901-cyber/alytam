import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
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
import { ConditionBuilder } from "@/components/automations/ConditionBuilder";
import { ActionBuilder } from "@/components/automations/ActionBuilder";
import type { ConditionJson, ActionJson } from "@/lib/automation";

const ruleSchema = z.object({
  name: z.string().min(2, "اسم القاعدة مطلوب"),
  description: z.string().optional(),
  trigger_event: z.enum(["task_created", "task_status_changed", "task_overdue"]),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  condition_json: unknown;
  action_json: unknown;
}

interface AutomationRuleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rule?: AutomationRule | null;
}

const triggers = [
  { value: "task_created", label: "عند إنشاء مهمة جديدة" },
  { value: "task_status_changed", label: "عند تغيير حالة مهمة" },
  { value: "task_overdue", label: "عند تأخر مهمة عن موعد التسليم" },
];

export function AutomationRuleForm({
  open,
  onClose,
  onSuccess,
  rule,
}: AutomationRuleFormProps) {
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<ConditionJson>({});
  const [action, setAction] = useState<ActionJson>({
    type: "send_notification",
    target: "assignee",
    title: "",
    message: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!rule;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger_event: "task_status_changed",
    },
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description || "",
        trigger_event: rule.trigger_event as RuleFormValues["trigger_event"],
      });
      setConditions((rule.condition_json as ConditionJson) || {});
      setAction((rule.action_json as ActionJson) || {
        type: "send_notification",
        target: "assignee",
        title: "",
        message: "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        trigger_event: "task_status_changed",
      });
      setConditions({});
      setAction({
        type: "send_notification",
        target: "assignee",
        title: "",
        message: "",
      });
    }
  }, [rule, form]);

  const onSubmit = async (values: RuleFormValues) => {
    if (!user) return;

    // Validate action
    if (action.type === "send_notification" && (!action.title || !action.message)) {
      toast({
        variant: "destructive",
        title: "بيانات الإجراء غير مكتملة",
        description: "يرجى إدخال عنوان ونص الإشعار",
      });
      return;
    }

    setLoading(true);
    try {
      const ruleData = {
        name: values.name,
        description: values.description || null,
        trigger_event: values.trigger_event,
        condition_json: conditions as unknown as Json,
        action_json: action as unknown as Json,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("automation_rules")
          .update(ruleData)
          .eq("id", rule.id);

        if (error) throw error;
        toast({ title: "تم تحديث القاعدة بنجاح" });
      } else {
        const { error } = await supabase
          .from("automation_rules")
          .insert(ruleData);

        if (error) throw error;
        toast({ title: "تم إنشاء القاعدة بنجاح" });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حفظ القاعدة",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "تعديل قاعدة الأتمتة" : "إنشاء قاعدة أتمتة جديدة"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم القاعدة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: إشعار عند اكتمال مهمة عاجلة" {...field} />
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
                      placeholder="وصف مختصر للقاعدة..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحدث المُشغّل</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحدث" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {triggers.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">الشروط</h3>
              <p className="text-sm text-muted-foreground">
                حدد الشروط التي يجب توفرها لتنفيذ القاعدة (اتركها فارغة للتطبيق على الكل)
              </p>
              <ConditionBuilder
                conditions={conditions}
                onChange={setConditions}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">الإجراء</h3>
              <p className="text-sm text-muted-foreground">
                حدد الإجراء الذي سيتم تنفيذه عند تطابق الشروط
              </p>
              <ActionBuilder action={action} onChange={setAction} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading
                  ? "جاري الحفظ..."
                  : isEditing
                  ? "تحديث القاعدة"
                  : "إنشاء القاعدة"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
