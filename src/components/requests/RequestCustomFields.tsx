import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  options: unknown;
  is_active: boolean;
}

interface FieldValue {
  id?: string;
  custom_field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
}

interface RequestCustomFieldsProps {
  requestId: string;
  canEdit?: boolean;
  onUpdate?: () => void;
  mode?: "view" | "edit" | "create";
  onChange?: (values: Record<string, FieldValue>) => void;
}

export function RequestCustomFields({
  requestId,
  canEdit = false,
  onUpdate,
  mode = "view",
  onChange,
}: RequestCustomFieldsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active custom fields for requests
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("applicable_to", "request")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (fieldsError) throw fieldsError;
      setFields(fieldsData || []);

      // For create mode, just set empty values
      if (mode === "create" || !requestId) {
        const initialValues: Record<string, FieldValue> = {};
        (fieldsData || []).forEach((field) => {
          initialValues[field.id] = {
            custom_field_id: field.id,
            value_text: null,
            value_number: null,
            value_date: null,
            value_boolean: null,
          };
        });
        setFieldValues(initialValues);
        setLoading(false);
        return;
      }

      // Fetch existing values for this request
      const { data: valuesData, error: valuesError } = await supabase
        .from("request_custom_field_values")
        .select("*")
        .eq("request_id", requestId);

      if (valuesError) throw valuesError;

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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الحقول المخصصة",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [requestId]);

  const updateFieldValue = (fieldId: string, value: Partial<FieldValue>) => {
    const newValues = {
      ...fieldValues,
      [fieldId]: {
        ...fieldValues[fieldId],
        ...value,
      },
    };
    setFieldValues(newValues);
    setHasChanges(true);
    
    // Notify parent component of changes (for create mode)
    if (onChange) {
      onChange(newValues);
    }
  };

  const getFieldValue = (field: CustomField): string | number | boolean | string[] | null => {
    const value = fieldValues[field.id];
    if (!value) return null;

    switch (field.field_type) {
      case "text":
        // Check if it's a multi-select stored as JSON
        if (field.options && value.value_text) {
          try {
            const parsed = JSON.parse(value.value_text);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return value.value_text;
          }
        }
        return value.value_text;
      case "number":
        return value.value_number;
      case "date":
        return value.value_date;
      case "boolean":
        return value.value_boolean;
      case "select":
        // Multi-select stored as JSON
        if (value.value_text) {
          try {
            const parsed = JSON.parse(value.value_text);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return value.value_text;
          }
        }
        return null;
      default:
        return value.value_text;
    }
  };

  const toggleMultiSelectOption = (fieldId: string, option: string) => {
    const currentValue = getFieldValue(fields.find(f => f.id === fieldId)!);
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    
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

  const saveChanges = async () => {
    if (mode === "create") return; // Create mode saves are handled by parent
    
    setSaving(true);
    try {
      const upserts = Object.values(fieldValues)
        .filter((v) => v.value_text !== null || v.value_number !== null || v.value_date !== null || v.value_boolean !== null)
        .map((v) => ({
          request_id: requestId,
          custom_field_id: v.custom_field_id,
          value_text: v.value_text,
          value_number: v.value_number,
          value_date: v.value_date,
          value_boolean: v.value_boolean,
        }));

      if (upserts.length > 0) {
        const { error } = await supabase
          .from("request_custom_field_values")
          .upsert(upserts, {
            onConflict: "request_id,custom_field_id",
          });

        if (error) throw error;
      }

      toast({
        title: "تم حفظ التغييرات",
      });

      setHasChanges(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حفظ التغييرات",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  const isEditable = canEdit && (mode === "edit" || mode === "create");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">حقول دراسة الحالة</CardTitle>
        {hasChanges && isEditable && mode !== "create" && (
          <Button size="sm" onClick={saveChanges} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            حفظ التغييرات
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => {
          const value = getFieldValue(field);
          
          return (
            <div key={field.id} className="space-y-2">
              <Label className="text-sm font-medium">{field.name}</Label>
              
              {/* Text field */}
              {field.field_type === "text" && (
                isEditable ? (
                  <Input
                    value={(typeof value === "string" ? value : "") || ""}
                    onChange={(e) =>
                      updateFieldValue(field.id, { value_text: e.target.value || null })
                    }
                    placeholder={`أدخل ${field.name}`}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {value || "-"}
                  </p>
                )
              )}

              {/* Number field */}
              {field.field_type === "number" && (
                isEditable ? (
                  <Input
                    type="number"
                    value={value !== null && value !== undefined ? String(value) : ""}
                    onChange={(e) =>
                      updateFieldValue(field.id, {
                        value_number: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder={`أدخل ${field.name}`}
                    dir="ltr"
                  />
                ) : (
                  <p className="text-muted-foreground" dir="ltr">
                    {value !== null && value !== undefined ? Number(value).toLocaleString("ar-SA") : "-"}
                    {field.key === "estimated_budget" && value ? " ريال" : ""}
                  </p>
                )
              )}

              {/* Date field */}
              {field.field_type === "date" && (
                isEditable ? (
                  <Input
                    type="date"
                    value={(typeof value === "string" ? value : "") || ""}
                    onChange={(e) =>
                      updateFieldValue(field.id, { value_date: e.target.value || null })
                    }
                    dir="ltr"
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {value
                      ? new Date(value as string).toLocaleDateString("ar-SA")
                      : "-"}
                  </p>
                )
              )}

              {/* Boolean field */}
              {field.field_type === "boolean" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!value}
                    onCheckedChange={(checked) =>
                      updateFieldValue(field.id, { value_boolean: !!checked })
                    }
                    disabled={!isEditable}
                  />
                  <span className="text-sm">{value ? "نعم" : "لا"}</span>
                </div>
              )}

              {/* Multi-select field */}
              {field.field_type === "select" && field.options && (
                isEditable ? (
                  <div className="flex flex-wrap gap-2">
                    {(field.options as string[]).map((option) => {
                      const selectedOptions = Array.isArray(value) ? value : [];
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
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(value) && value.length > 0 ? (
                      value.map((v) => (
                        <Badge key={v} variant="secondary">
                          {v}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
