import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  applicable_to: string;
  options: unknown;
  is_active: boolean;
}

interface CustomFieldFormProps {
  field?: CustomField | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomFieldForm({ field, onSuccess, onCancel }: CustomFieldFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [applicableTo, setApplicableTo] = useState("task");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    if (field) {
      setName(field.name);
      setKey(field.key);
      setFieldType(field.field_type);
      setApplicableTo(field.applicable_to);
      setOptions(Array.isArray(field.options) ? (field.options as string[]) : []);
    } else {
      setName("");
      setKey("");
      setFieldType("text");
      setApplicableTo("task");
      setOptions([]);
    }
  }, [field]);

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!field) {
      setKey(generateKey(value));
    }
  };

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (option: string) => {
    setOptions(options.filter((o) => o !== option));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!name.trim() || !key.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
      });
      return;
    }

    if (fieldType === "select" && options.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إضافة خيار واحد على الأقل لنوع القائمة",
      });
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        key: key.trim(),
        field_type: fieldType as "text" | "number" | "date" | "select" | "boolean",
        applicable_to: applicableTo,
        options: fieldType === "select" ? options : null,
        created_by: user.id,
      };

      if (field) {
        const { error } = await supabase
          .from("custom_fields")
          .update(data)
          .eq("id", field.id);

        if (error) throw error;
        toast({ title: "تم تحديث الحقل بنجاح" });
      } else {
        const { error } = await supabase.from("custom_fields").insert(data);

        if (error) {
          if (error.code === "23505") {
            throw new Error("المعرف مستخدم بالفعل. اختر معرفاً آخر.");
          }
          throw error;
        }
        toast({ title: "تم إنشاء الحقل بنجاح" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">اسم الحقل *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="مثال: رقم العقد"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">المعرف الداخلي *</Label>
        <Input
          id="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="contract_number"
          className="font-mono text-sm"
          dir="ltr"
          required
          disabled={!!field}
        />
        <p className="text-xs text-muted-foreground">
          يستخدم للتعريف الفني ولا يمكن تغييره بعد الإنشاء
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">نوع الحقل *</Label>
          <Select value={fieldType} onValueChange={setFieldType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">نص</SelectItem>
              <SelectItem value="number">رقم</SelectItem>
              <SelectItem value="date">تاريخ</SelectItem>
              <SelectItem value="select">قائمة اختيار (متعدد)</SelectItem>
              <SelectItem value="boolean">نعم/لا</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="applicable_to">ينطبق على *</Label>
          <Select value={applicableTo} onValueChange={setApplicableTo} disabled={!!field}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">المهام</SelectItem>
              <SelectItem value="request">الطلبات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {fieldType === "select" && (
        <div className="space-y-2">
          <Label>الخيارات *</Label>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="أضف خياراً"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addOption}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {options.map((option) => (
                <Badge
                  key={option}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {option}
                  <button
                    type="button"
                    onClick={() => removeOption(option)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : field ? "تحديث" : "إنشاء"}
        </Button>
      </div>
    </form>
  );
}
