import { useState, useEffect } from "react";
import { Loader2, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CustomFieldInput } from "./CustomFieldInput";

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

interface TaskCustomFieldsProps {
  taskId: string;
  canEdit: boolean;
  onUpdate?: () => void;
}

export function TaskCustomFields({ taskId, canEdit, onUpdate }: TaskCustomFieldsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active custom fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("is_active", true)
        .eq("applicable_to", "task")
        .order("created_at", { ascending: true });

      if (fieldsError) throw fieldsError;
      setFields(fieldsData || []);

      // Fetch existing values for this task
      const { data: valuesData, error: valuesError } = await supabase
        .from("task_custom_field_values")
        .select("*")
        .eq("task_id", taskId);

      if (valuesError) throw valuesError;

      // Map values by field id
      const valuesMap: Record<string, FieldValue> = {};
      (valuesData || []).forEach((v) => {
        valuesMap[v.custom_field_id] = {
          id: v.id,
          custom_field_id: v.custom_field_id,
          value_text: v.value_text,
          value_number: v.value_number,
          value_date: v.value_date,
          value_boolean: v.value_boolean,
        };
      });

      setValues(valuesMap);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الحقول",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const updateFieldValue = (fieldId: string, field: CustomField, value: any) => {
    setHasChanges(true);
    setValues((prev) => {
      const existing = prev[fieldId] || { custom_field_id: fieldId, value_text: null, value_number: null, value_date: null, value_boolean: null };
      
      const updated = { ...existing };
      
      switch (field.field_type) {
        case "text":
        case "select":
          updated.value_text = value || null;
          break;
        case "number":
          updated.value_number = value !== "" ? Number(value) : null;
          break;
        case "date":
          updated.value_date = value || null;
          break;
        case "boolean":
          updated.value_boolean = value;
          break;
      }

      return { ...prev, [fieldId]: updated };
    });
  };

  const getFieldValue = (field: CustomField): any => {
    const value = values[field.id];
    if (!value) return field.field_type === "boolean" ? false : "";

    switch (field.field_type) {
      case "text":
      case "select":
        return value.value_text || "";
      case "number":
        return value.value_number !== null ? value.value_number : "";
      case "date":
        return value.value_date || "";
      case "boolean":
        return value.value_boolean || false;
      default:
        return "";
    }
  };

  const saveChanges = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const upsertData = Object.values(values).map((v) => ({
        task_id: taskId,
        custom_field_id: v.custom_field_id,
        value_text: v.value_text,
        value_number: v.value_number,
        value_date: v.value_date,
        value_boolean: v.value_boolean,
      }));

      // Use upsert with on conflict
      for (const data of upsertData) {
        const { error } = await supabase
          .from("task_custom_field_values")
          .upsert(data, { onConflict: "task_id,custom_field_id" });

        if (error) throw error;
      }

      toast({ title: "تم حفظ الحقول الإضافية" });
      setHasChanges(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حفظ الحقول",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4" />
          حقول إضافية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <CustomFieldInput
            key={field.id}
            field={field}
            value={getFieldValue(field)}
            onChange={(value) => updateFieldValue(field.id, field, value)}
            disabled={!canEdit}
          />
        ))}

        {canEdit && hasChanges && (
          <Button onClick={saveChanges} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            حفظ التغييرات
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
