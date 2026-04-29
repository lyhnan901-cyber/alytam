import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type RequestPriority = Database["public"]["Enums"]["request_priority"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

const requestSchema = z.object({
  client_name: z.string().min(2, "اسم المستفيد / مقدم الطلب مطلوب").max(100),
  request_type: z.string().min(1, "نوع الطلب مطلوب"),
  channel: z.string().min(1, "القناة مطلوبة"),
  priority: z.enum(["High", "Medium", "Low"]),
  status: z.enum(["New", "InProgress", "Completed", "Closed"]),
  notes: z.string().max(1000).optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface Request {
  id: string;
  request_number: number;
  client_name: string;
  request_type: string;
  channel: string;
  status: RequestStatus;
  priority: RequestPriority;
  notes: string | null;
}

interface RequestEditFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: Request | null;
}

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  options: unknown;
}

interface FieldValue {
  id?: string;
  custom_field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
}

// Marketing-specific request types
const requestTypes = [
  "حملة إعلانات",
  "إدارة سوشيال ميديا",
  "إنشاء محتوى",
  "SEO",
  "تطوير موقع",
  "استشارة",
  "أخرى",
];

// Marketing-specific channels
const channels = [
  { value: "whatsapp", label: "واتساب" },
  { value: "phone", label: "مكالمة" },
  { value: "email", label: "بريد إلكتروني" },
  { value: "website_form", label: "نموذج موقع" },
  { value: "referral", label: "إحالة" },
];

const priorities = [
  { value: "High", label: "عالي" },
  { value: "Medium", label: "متوسط" },
  { value: "Low", label: "منخفض" },
];

const statuses = [
  { value: "New", label: "جديد" },
  { value: "InProgress", label: "قيد التنفيذ" },
  { value: "Completed", label: "مكتمل" },
  { value: "Closed", label: "مغلق" },
];

export function RequestEditForm({ open, onClose, onSuccess, request }: RequestEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const { toast } = useToast();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      client_name: "",
      request_type: "",
      channel: "whatsapp",
      priority: "Medium",
      status: "New",
      notes: "",
    },
  });

  // Fetch custom fields and values when request changes
  useEffect(() => {
    const fetchData = async () => {
      if (!request) return;

      // Reset form with request data
      form.reset({
        client_name: request.client_name,
        request_type: request.request_type,
        channel: request.channel,
        priority: request.priority,
        status: request.status,
        notes: request.notes || "",
      });

      // Fetch custom fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("applicable_to", "request")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (fieldsError) {
        console.error("Error fetching custom fields:", fieldsError);
        return;
      }

      setCustomFields(fieldsData || []);

      // Fetch existing values
      const { data: valuesData, error: valuesError } = await supabase
        .from("request_custom_field_values")
        .select("*")
        .eq("request_id", request.id);

      if (valuesError) {
        console.error("Error fetching field values:", valuesError);
        return;
      }

      const valuesMap: Record<string, FieldValue> = {};
      (fieldsData || []).forEach((field) => {
        const existingValue = (valuesData || []).find(
          (v) => v.custom_field_id === field.id
        );
        valuesMap[field.id] = existingValue || {
          custom_field_id: field.id,
          value_text: null,
          value_number: null,
          value_date: null,
          value_boolean: null,
        };
      });

      setFieldValues(valuesMap);
    };

    if (open && request) {
      fetchData();
    }
  }, [request, open, form]);

  const updateFieldValue = (fieldId: string, value: Partial<FieldValue>) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        ...value,
      },
    }));
  };

  const toggleMultiSelectOption = (fieldId: string, option: string) => {
    const currentValue = fieldValues[fieldId]?.value_text;
    let currentArray: string[] = [];
    
    if (currentValue) {
      try {
        currentArray = JSON.parse(currentValue);
      } catch {
        currentArray = [];
      }
    }
    
    let newArray: string[];
    if (currentArray.includes(option)) {
      newArray = currentArray.filter(o => o !== option);
    } else {
      newArray = [...currentArray, option];
    }
    
    updateFieldValue(fieldId, {
      value_text: JSON.stringify(newArray),
    });
  };

  const getMultiSelectValue = (fieldId: string): string[] => {
    const value = fieldValues[fieldId]?.value_text;
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  };

  const onSubmit = async (values: RequestFormValues) => {
    if (!request) return;

    setLoading(true);
    try {
      // Update request
      const { error } = await supabase
        .from("requests")
        .update({
          client_name: values.client_name,
          request_type: values.request_type,
          channel: values.channel,
          priority: values.priority,
          status: values.status,
          notes: values.notes || null,
        })
        .eq("id", request.id);

      if (error) throw error;

      // Save custom field values
      const upserts = Object.values(fieldValues)
        .filter((v) => v.value_text !== null || v.value_number !== null || v.value_date !== null || v.value_boolean !== null)
        .map((v) => ({
          request_id: request.id,
          custom_field_id: v.custom_field_id,
          value_text: v.value_text,
          value_number: v.value_number,
          value_date: v.value_date,
          value_boolean: v.value_boolean,
        }));

      if (upserts.length > 0) {
        const { error: cfError } = await supabase
          .from("request_custom_field_values")
          .upsert(upserts, {
            onConflict: "request_id,custom_field_id",
          });

        if (cfError) console.error("Error saving custom fields:", cfError);
      }

      toast({
        title: "تم تحديث الطلب بنجاح",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الطلب",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            تعديل الطلب REQ-{String(request.request_number).padStart(3, "0")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستفيد / الجهة</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المستفيد أو الجهة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="request_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الطلب</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {requestTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>القناة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر القناة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.value} value={ch.value}>
                              {ch.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحالة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Custom Marketing Fields */}
              {customFields.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">حقول دراسة الحالة</h3>
                    
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm">{field.name}</Label>
                        
                        {/* Text field */}
                        {field.field_type === "text" && (
                          <Input
                            value={fieldValues[field.id]?.value_text || ""}
                            onChange={(e) =>
                              updateFieldValue(field.id, { value_text: e.target.value || null })
                            }
                            placeholder={`أدخل ${field.name}`}
                          />
                        )}

                        {/* Number field */}
                        {field.field_type === "number" && (
                          <Input
                            type="number"
                            value={fieldValues[field.id]?.value_number ?? ""}
                            onChange={(e) =>
                              updateFieldValue(field.id, {
                                value_number: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder={`أدخل ${field.name}`}
                            dir="ltr"
                          />
                        )}

                        {/* Date field */}
                        {field.field_type === "date" && (
                          <Input
                            type="date"
                            value={fieldValues[field.id]?.value_date || ""}
                            onChange={(e) =>
                              updateFieldValue(field.id, { value_date: e.target.value || null })
                            }
                            dir="ltr"
                          />
                        )}

                        {/* Boolean field */}
                        {field.field_type === "boolean" && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!fieldValues[field.id]?.value_boolean}
                              onCheckedChange={(checked) =>
                                updateFieldValue(field.id, { value_boolean: !!checked })
                              }
                            />
                            <span className="text-sm">نعم</span>
                          </div>
                        )}

                        {/* Multi-select field */}
                        {field.field_type === "select" && field.options && (
                          <div className="flex flex-wrap gap-2">
                            {(field.options as string[]).map((option) => {
                              const selectedOptions = getMultiSelectValue(field.id);
                              const isSelected = selectedOptions.includes(option);
                              
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

              <Separator className="my-4" />

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
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "حفظ التغييرات"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
