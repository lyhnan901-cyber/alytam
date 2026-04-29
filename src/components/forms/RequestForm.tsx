import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Heart } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { createInitialTask } from "@/lib/workflow";
import { logRequestCreated } from "@/lib/activity-logger";

const requestSchema = z.object({
  client_name: z.string().min(2, "اسم المستفيد / الجهة مطلوب").max(100),
  request_type: z.string().min(1, "نوع الطلب مطلوب"),
  channel: z.string().min(1, "مصدر الطلب مطلوب"),
  priority: z.enum(["High", "Medium", "Low"]),
  notes: z.string().max(1000).optional(),
  initial_task_title: z.string().min(2, "عنوان المهمة الأولى مطلوب").max(200),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  executiveManagerId?: string;
}

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  options: unknown;
}

interface FieldValue {
  custom_field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
}

// ── أنواع الطلبات الخيرية ───────────────────────────────────────────────────
const requestTypes = [
  "رعاية يتيم",
  "مساعدة أسرة",
  "كفالة شهرية",
  "مساعدة طبية",
  "دعم تعليمي",
  "مساعدة سكنية",
  "مساعدة غذائية",
  "مساعدة طارئة",
  "تأهيل مهني",
  "استفسار عام",
  "أخرى",
];

// ── مصادر وصول الطلب ─────────────────────────────────────────────────────────
const channels = [
  { value: "direct",      label: "مراجعة مباشرة" },
  { value: "whatsapp",    label: "واتساب" },
  { value: "phone",       label: "اتصال هاتفي" },
  { value: "email",       label: "بريد إلكتروني" },
  { value: "referral",    label: "إحالة من جهة" },
  { value: "social",      label: "وسائل التواصل" },
  { value: "field",       label: "زيارة ميدانية" },
  { value: "website_form",label: "نموذج الموقع" },
];

const priorities = [
  { value: "High",   label: "🔴 عاجل" },
  { value: "Medium", label: "🟡 متوسط" },
  { value: "Low",    label: "🟢 عادي" },
];

export function RequestForm({ open, onClose, onSuccess, executiveManagerId }: RequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      client_name: "",
      request_type: "",
      channel: "direct",
      priority: "Medium",
      notes: "",
      initial_task_title: "",
    },
  });

  useEffect(() => {
    const fetchCustomFields = async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("applicable_to", "request")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Override marketing fields with charity fields locally without affecting DB structure
        const mappedData = data.map(field => {
          if (field.name === "الهدف التسويقي") {
            return { ...field, name: "نوع الدعم المطلوب", options: ["عاجل جداً", "كفالة مستمرة", "دعم موسمي", "مساعدة مقطوعة", "أخرى"] };
          }
          if (field.name === "الميزانية التقديرية") {
            return { ...field, name: "مبلغ التبرع التقديري (في حال وجود متبرع)" };
          }
          return field;
        });
        setCustomFields(mappedData);
        const initialValues: Record<string, FieldValue> = {};
        mappedData.forEach((field) => {
          initialValues[field.id] = {
            custom_field_id: field.id,
            value_text: null,
            value_number: null,
            value_date: null,
            value_boolean: null,
          };
        });
        setFieldValues(initialValues);
      }
    };
    if (open) fetchCustomFields();
  }, [open]);

  const updateFieldValue = (fieldId: string, value: Partial<FieldValue>) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], ...value } }));
  };

  const toggleMultiSelectOption = (fieldId: string, option: string) => {
    const currentValue = fieldValues[fieldId]?.value_text;
    let currentArray: string[] = [];
    if (currentValue) {
      try { currentArray = JSON.parse(currentValue); } catch { currentArray = []; }
    }
    const newArray = currentArray.includes(option)
      ? currentArray.filter((o) => o !== option)
      : [...currentArray, option];
    updateFieldValue(fieldId, { value_text: JSON.stringify(newArray) });
  };

  const getMultiSelectValue = (fieldId: string): string[] => {
    const value = fieldValues[fieldId]?.value_text;
    if (!value) return [];
    try { return JSON.parse(value); } catch { return []; }
  };

  const onSubmit = async (values: RequestFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          client_name: values.client_name,
          request_type: values.request_type,
          channel: values.channel,
          priority: values.priority,
          notes: values.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // حفظ الحقول المخصصة
      const customFieldValues = Object.values(fieldValues)
        .filter((v) => v.value_text !== null || v.value_number !== null || v.value_date !== null || v.value_boolean !== null)
        .map((v) => ({
          request_id: request.id,
          custom_field_id: v.custom_field_id,
          value_text: v.value_text,
          value_number: v.value_number,
          value_date: v.value_date,
          value_boolean: v.value_boolean,
        }));

      if (customFieldValues.length > 0) {
        await supabase.from("request_custom_field_values").insert(customFieldValues);
      }

      // إنشاء المهمة الأولى
      if (executiveManagerId) {
        await createInitialTask(request.id, values.initial_task_title, executiveManagerId, user.id);
      }

      await logRequestCreated(user.id, request.id, request.request_number, values.request_type, false);

      toast({
        title: "✅ تم إنشاء الطلب بنجاح",
        description: `رقم الطلب: REQ-${String(request.request_number).padStart(3, "0")}`,
      });

      form.reset();
      setFieldValues({});
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
            <Heart className="w-5 h-5 text-primary" />
            إنشاء طلب خيري جديد
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            أدخل بيانات المستفيد وتفاصيل الطلب الخيري
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-130px)] pl-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-1">

              {/* ── اسم المستفيد / الجهة ── */}
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستفيد / الجهة المقدِّمة</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: عائلة أحمد الزهراني" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── النوع والمصدر ── */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="request_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الطلب الخيري</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الطلب" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {requestTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مصدر الطلب</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المصدر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── الأولوية ── */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>درجة الأولوية</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── الحقول المخصصة ── */}
              {customFields.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">حقول إضافية</h3>
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm">{field.name}</Label>
                        {field.field_type === "text" && (
                          <Input
                            value={fieldValues[field.id]?.value_text || ""}
                            onChange={(e) => updateFieldValue(field.id, { value_text: e.target.value || null })}
                            placeholder={`أدخل ${field.name}`}
                          />
                        )}
                        {field.field_type === "number" && (
                          <Input
                            type="number"
                            value={fieldValues[field.id]?.value_number ?? ""}
                            onChange={(e) => updateFieldValue(field.id, { value_number: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder={`أدخل ${field.name}`}
                            dir="ltr"
                          />
                        )}
                        {field.field_type === "date" && (
                          <Input
                            type="date"
                            value={fieldValues[field.id]?.value_date || ""}
                            onChange={(e) => updateFieldValue(field.id, { value_date: e.target.value || null })}
                            dir="ltr"
                          />
                        )}
                        {field.field_type === "boolean" && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!fieldValues[field.id]?.value_boolean}
                              onCheckedChange={(checked) => updateFieldValue(field.id, { value_boolean: !!checked })}
                            />
                            <span className="text-sm">نعم</span>
                          </div>
                        )}
                        {field.field_type === "select" && field.options && (
                          <div className="flex flex-wrap gap-2">
                            {(field.options as string[]).map((option) => {
                              const isSelected = getMultiSelectValue(field.id).includes(option);
                              return (
                                <Badge
                                  key={option}
                                  variant={isSelected ? "default" : "outline"}
                                  className="cursor-pointer transition-colors"
                                  onClick={() => toggleMultiSelectOption(field.id, option)}
                                >
                                  {option}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator />

              {/* ── عنوان المهمة الأولى ── */}
              <FormField
                control={form.control}
                name="initial_task_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان المهمة الأولى</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: مراجعة ملف اليتيم وتقييم الأهلية" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">ستُسند هذه المهمة للمدير التنفيذي مباشرةً</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── الملاحظات ── */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أي تفاصيل إضافية عن الحالة أو الظروف الخاصة..."
                        className="resize-none"
                        rows={3}
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
                    "إنشاء الطلب الخيري"
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
