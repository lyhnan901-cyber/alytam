import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { useToast } from "@/hooks/use-toast";
import { createInitialTask, createInternalRequestTask } from "@/lib/workflow";
import { logRequestCreated } from "@/lib/activity-logger";

// ── تصنيفات أنواع المهام الخيرية ──────────────────────────────────────────
const taskTypeCategories = [
  {
    name: "🤲 الرعاية والكفالة",
    types: [
      "كفالة يتيم شهرية",
      "رعاية أسرة محتاجة",
      "متابعة حالة يتيم",
      "تقييم أهلية المستفيد",
    ],
  },
  {
    name: "🏥 الدعم الطبي والصحي",
    types: [
      "تأمين علاج طبي",
      "تغطية عملية جراحية",
      "توفير أدوية",
      "زيارة ميدانية صحية",
    ],
  },
  {
    name: "📚 الدعم التعليمي",
    types: [
      "سداد رسوم دراسية",
      "توفير مستلزمات مدرسية",
      "دعم طالب جامعي",
      "منحة تعليمية",
    ],
  },
  {
    name: "🏠 الدعم المعيشي",
    types: [
      "مساعدة سكنية",
      "توفير سلة غذائية",
      "دعم فاتورة كهرباء/ماء",
      "مساعدة طارئة",
    ],
  },
  {
    name: "💼 التأهيل والتمكين",
    types: [
      "تدريب مهني",
      "دعم مشروع صغير",
      "توظيف ومتابعة",
      "إرشاد نفسي واجتماعي",
    ],
  },
  {
    name: "📋 الإداري والتوثيق",
    types: [
      "إعداد تقرير حالة",
      "مراجعة ملف مستفيد",
      "اجتماع لجنة خيرية",
      "تدقيق وتحقق من البيانات",
    ],
  },
];

const internalRequestSchema = z
  .object({
    task_types: z.array(z.string()),
    custom_tasks: z.string().optional(),
    target_department_id: z.string().optional(),
    priority: z.enum(["High", "Medium", "Low"]),
    due_date: z.string().optional(),
    title: z.string().min(2, "عنوان المهمة مطلوب").max(200),
    description: z.string().max(2000).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const hasSelectedTypes = data.task_types.length > 0;
      const hasCustomTasks = data.custom_tasks && data.custom_tasks.trim().length > 0;
      return hasSelectedTypes || hasCustomTasks;
    },
    {
      message: "اختر نوع مهمة واحد على الأقل أو اكتب مهمة مخصصة",
      path: ["task_types"],
    }
  );

type InternalRequestFormValues = z.infer<typeof internalRequestSchema>;

interface InternalRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  executiveManagerId?: string;
}

interface Department {
  id: string;
  name: string;
}

const priorities = [
  { value: "High",   label: "🔴 عاجل" },
  { value: "Medium", label: "🟡 متوسط" },
  { value: "Low",    label: "🟢 عادي" },
];

export function InternalRequestForm({
  open,
  onClose,
  onSuccess,
  executiveManagerId,
}: InternalRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { allowedDepartmentIds, isRestricted } = useAllowedDepartments();

  const form = useForm<InternalRequestFormValues>({
    resolver: zodResolver(internalRequestSchema),
    defaultValues: {
      task_types: [],
      custom_tasks: "",
      target_department_id: "",
      priority: "Medium",
      due_date: "",
      title: "",
      description: "",
      notes: "",
    },
  });

  const selectedTaskTypes = form.watch("task_types");

  useEffect(() => {
    const fetchDepartments = async () => {
      let query = supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (isRestricted && allowedDepartmentIds && allowedDepartmentIds.length > 0) {
        query = query.in("id", allowedDepartmentIds);
      }
      const { data, error } = await query;
      if (!error && data) setDepartments(data);
    };
    if (open) fetchDepartments();
  }, [open, isRestricted, allowedDepartmentIds]);

  const handleTaskTypeToggle = (taskType: string, checked: boolean) => {
    const current = form.getValues("task_types");
    if (checked) {
      form.setValue("task_types", [...current, taskType], { shouldValidate: true });
    } else {
      form.setValue("task_types", current.filter((t) => t !== taskType), { shouldValidate: true });
    }
  };

  const onSubmit = async (values: InternalRequestFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const allTasks = [...values.task_types];
      if (values.custom_tasks && values.custom_tasks.trim()) {
        const customTasksList = values.custom_tasks
          .split("\n")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        allTasks.push(...customTasksList);
      }
      const combinedTaskTypes = allTasks.join("، ");

      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          client_name: profile?.full_name || "طلب داخلي",
          request_type: combinedTaskTypes,
          channel: "internal",
          priority: values.priority,
          notes: values.notes,
          created_by: user.id,
          request_source: "internal",
          target_department_id: values.target_department_id || null,
          requested_by_name: profile?.full_name || null,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      if (values.target_department_id) {
        await createInternalRequestTask(
          request.id,
          values.title,
          values.target_department_id,
          user.id,
          values.description,
          values.due_date
        );
      } else if (executiveManagerId) {
        await createInitialTask(request.id, values.title, executiveManagerId, user.id);
      }

      await logRequestCreated(user.id, request.id, request.request_number, combinedTaskTypes, true);

      toast({
        title: "✅ تم إنشاء الطلب الداخلي بنجاح",
        description: `رقم الطلب: REQ-${String(request.request_number).padStart(3, "0")}`,
      });

      form.reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في إنشاء الطلب", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5 text-primary" />
            إنشاء مهمة داخلية جديدة
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            حدد نوع العمل المطلوب وسيتم توزيعه على القسم المناسب
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-130px)] pl-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-1">

              {/* ── أنواع المهام ── */}
              <FormField
                control={form.control}
                name="task_types"
                render={() => (
                  <FormItem>
                    <FormLabel>أنواع الأعمال المطلوبة (اختر واحداً أو أكثر)</FormLabel>
                    <div className="space-y-4 border rounded-xl p-4 bg-muted/30">
                      {taskTypeCategories.map((category) => (
                        <div key={category.name} className="space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">{category.name}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {category.types.map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox
                                  id={type}
                                  checked={selectedTaskTypes.includes(type)}
                                  onCheckedChange={(checked) => handleTaskTypeToggle(type, checked as boolean)}
                                />
                                <Label htmlFor={type} className="text-sm cursor-pointer font-normal">
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── مهام مخصصة ── */}
              <FormField
                control={form.control}
                name="custom_tasks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مهام إضافية مخصصة (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="اكتب كل مهمة في سطر جديد..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      أضف أي مهام غير موجودة في القائمة أعلاه
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── القسم المستهدف ── */}
              <FormField
                control={form.control}
                name="target_department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم المستهدف (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم أو اتركه للمدير التنفيذي" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">بدون تحديد (للمدير التنفيذي)</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── الأولوية والتاريخ ── */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>درجة الأولوية</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col gap-2"
                        >
                          {priorities.map((p) => (
                            <div key={p.value} className="flex items-center gap-2">
                              <RadioGroupItem value={p.value} id={`priority-${p.value}`} />
                              <Label htmlFor={`priority-${p.value}`} className="cursor-pointer font-normal">
                                {p.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ التسليم المطلوب</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── عنوان المهمة ── */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان المهمة الرئيسية</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: متابعة ملف الكفالة الشهرية لعائلة الزهراني"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── وصف المهمة ── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تفاصيل المهمة</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="اشرح تفاصيل الحالة والعمل المطلوب..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── ملاحظات ── */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أي معلومات إضافية تساعد في تنفيذ المهمة..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── أزرار ── */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                  style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الإنشاء...</>
                  ) : (
                    "إنشاء المهمة الداخلية"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
